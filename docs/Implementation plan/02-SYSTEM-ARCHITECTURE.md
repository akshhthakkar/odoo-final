# PeoplePay360 — System Architecture

**Date:** 2026-09-05 · **Status:** Approved baseline (ADRs summarized below; full ADRs in `docs/adr/`)

---

## 1. Architecture Style Decision (ADR-001, summarized)

**Chosen:** Modular monolith (Node/Express) + one dedicated calculation microservice (Python/FastAPI) + PostgreSQL + React SPA.

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Everything in Node (no Python) | Simplest | Spec-inspired separation of calculation lost; mixing money math with I/O code; less "technical versatility" for judges | Rejected |
| Full microservices per domain | Scalable | Massive ops overhead for hackathon; no need | Rejected |
| **Modular monolith + calc service (chosen)** | Clear separation: orchestration vs calculation; polyglot demonstrates versatility; one internal HTTP contract; engine stateless and independently testable | One extra service to run (mitigated by docker-compose) | ✅ Chosen |

**Key invariants:**
1. React never talks to PostgreSQL; never computes salary.
2. Node owns all persistence and all workflow state machines.
3. Python owns payroll math only — stateless, no DB, idempotent: same input → same output.
4. All module-to-module access inside Node goes through service-layer functions, never direct imports of another module's repositories.

---

## 2. System Diagram

```
┌────────────────────────────────────────────────────────────┐
│  BROWSER — React 19 + TypeScript SPA (Vite)                │
│  Login · Dashboard · Employees · Contracts · Attendance    │
│  Time Off · Schedules · Salary Structures/Rules · Payruns  │
│  Payslips · Reports                                        │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTPS / JSON  (JWT Bearer)
                           ▼
┌────────────────────────────────────────────────────────────┐
│  NODE + EXPRESS + TypeScript  — API / Orchestration        │
│  Auth(JWT) · RBAC(5 roles) · Validation(zod) · CRUD        │
│  Workflows: approve leave · payrun compute/validate/paid   │
│  Audit log · PDF generation · Email dispatch               │
└───────────┬────────────────────────────────┬───────────────┘
            │ Prisma (SQL)                   │ HTTP/JSON (internal)
            ▼                                ▼
┌────────────────────────┐    ┌──────────────────────────────┐
│  POSTGRESQL 16         │    │  PYTHON PAYROLL ENGINE       │
│  19 tables: employees, │    │  FastAPI, stateless          │
│  contracts, schedules, │    │  Salary rule executor        │
│  attendance, time off, │    │  fixed / % / formula rules   │
│  structures, rules,    │    │  sequenced execution         │
│  payruns, payslips,    │    │  returns breakdown+warnings  │
│  warnings, users…      │    │  NO database access          │
└────────────────────────┘    └──────────────────────────────┘
```

## 3. Frontend ↔ Backend Contract

- **Protocol:** REST, JSON, base path `/api/v1`.
- **Auth:** `Authorization: Bearer <access token>` (15 min); refresh token in httpOnly SameSite=Lax cookie (7 days) at `POST /api/v1/auth/refresh`.
- **Errors:** standard envelope `{ success, error: { code, message, details[] } }` (see `04-API-CONTRACTS.md`).
- **Pagination:** `page`/`limit` query params; response `pagination` block.
- **Client:** single axios instance with request interceptor (attach token, X-Request-Id), response interceptor (401 → refresh once → retry → else logout), React Query for caching/retries.
- **Timeouts:** default 15 s; `POST /payruns/:id/compute` 60 s.
- **Real-time:** none (poll/refetch on navigation). Documented trade-off.

## 4. Module Boundaries (Node API)

Each module = routes → controller → service → (Prisma via repositories). Controllers parse/validate only; services hold business rules.

| Module | Owns | Exposes | Depends on | Does NOT |
|---|---|---|---|---|
| auth | users, sessions, JWT, password hashing | /auth/* | users | assign roles |
| users | user records, role assignment | /users/* (Admin) | auth(mw) | touch employees |
| employees | employees, departments, jobs, smart-button counts | /employees/* | contracts(read counts), schedules(read), timeoff(read counts) | mutate those modules |
| contracts | contracts + period-overlap validation + active-contract uniqueness | /contracts/* | employees | compute payroll |
| schedules | working_schedules + schedule_lines + weekly-hours computation | /schedules/* | employees | attendance |
| attendance | attendance records, worked-hours computation, corrections | /attendance/* | employees | time off |
| timeoff | types, allocations, requests, approval workflow, balance deduction | /time-off/* | employees | attendance |
| payroll-config | salary_structures, salary_rules, sequencing validation | /salary-structures/*, /salary-rules/* | — | run payroll |
| payroll-run | payruns, payrun_employees, payslips, payslip_lines, warnings, state machine, period-contract selection, engine invocation | /payruns/*, /payslips/* | employees, contracts, attendance, timeoff, payroll-config, engine-client | edit salary config |
| notifications | PDF rendering from persisted payslip lines; SMTP send + delivery status | /payslips/:id/pdf, /payruns/:id/send-payslips | payroll-run (read) | recompute anything |
| reports | dashboard aggregate queries (KPIs, charts, alerts) | /dashboard/* | read-only across modules | mutate anything |
| engine-client | typed HTTP client to Python engine, timeout/retry, circuit behavior | internal service | — | parse/validate formulas |

## 5. Core Data Flows

### 5.1 Approve Time Off
```
HR Manager clicks Approve (web)
→ POST /api/v1/time-off/requests/:id/approve   [HR Manager+]
→ timeoff service: load request + type + employee
  → validate status = TO_APPROVE
  → if type.requires_allocation: find APPROVED allocation covering date_from
    → check remaining >= days  → else 409 INSUFFICIENT_BALANCE
  → tx: request.status=APPROVED (approver, decided_at) + allocation.taken_days += days
→ audit log → response → React Query invalidates balances + request list
```

### 5.2 Payrun Compute (the heart of the system)
```
Payroll Manager clicks Compute (web)
→ POST /api/v1/payruns/:id/compute   [HR Payroll User+]
→ payroll-run service:
  1. Guard: payrun.status = DRAFT (or COMPUTED for recompute) → else 409
  2. For each selected employee (payrun_employees):
     a. Find ACTIVE contract overlapping [period_start, period_end]
        (start ≤ period_end AND (end IS NULL OR end ≥ period_start))
        → none: ERROR warning NO_ACTIVE_CONTRACT; >1: ERROR AMBIGUOUS_CONTRACT; skip employee
     b. Aggregate attendance: worked_days = distinct attendance dates in period,
        worked_hours = Σ worked_hours, overtime_hours = Σ overtime
     c. Approved leave days in period (from time off requests)
     d. Build per-employee inputs: wage, weekly_hours (from schedule),
        worked_days, worked_hours, overtime_hours, leave_days
  3. POST engine /v1/compute-batch  { employees: [...], rules: [structure rules sorted by sequence] }
  4. Tx per payslip: create payslip + payslip_lines (from engine lines) + payroll_warnings
     (duplicates: existing non-cancelled payslip overlapping period → DUPLICATE_PAYSLIP warning;
      missing bank details → MISSING_BANK_DETAILS warning)
  5. payrun.status = COMPUTED; store gross/deduction/net totals
→ React: payrun screen shows payslip list + warnings panel
```

### 5.3 Payslip PDF & Email
```
GET /api/v1/payslips/:id/pdf → notifications module renders an HTML template from
PERSISTED payslip_lines (never recalculates) → pdfkit → application/pdf stream
POST /api/v1/payruns/:id/send-payslips → for each payslip with computed/validated status:
render PDF → attach → nodemailer to employee.email → record email_sent_at per payslip
```

### 5.4 Dashboard
```
GET /api/v1/dashboard/metrics?period_start&period_end&department_id&employee_type
→ reports module runs aggregate queries: net paid Σ, payslip count, avg salary,
  approved time-off days, attendance health (present/late/missing-checkout ratios),
  salary cost by department, monthly net trend, open warnings/contract alerts
→ one JSON payload → Recharts renders KPI cards + charts (live data only)
```

## 6. Integration Specifications

| Integration | Purpose | Protocol | Auth | Sync/Async | Failure handling | Credentials |
|---|---|---|---|---|---|---|
| Python Payroll Engine | Salary computation | HTTP/JSON (`http://engine:8000`) | internal network + shared secret header | Sync (batch endpoint) | 1 retry on 5xx/network; 60 s timeout; circuit opens 30 s → 503 ENGINE_UNAVAILABLE; payslips stay DRAFT, payrun stays DRAFT | `ENGINE_SHARED_SECRET` env |
| SMTP | Payslip email | SMTP (nodemailer) | user/pass | Sync per send; per-recipient try/catch | Per-recipient failure logged, others continue; report per-payrun send summary | `SMTP_HOST/PORT/USER/PASS/FROM` |
| PDF renderer | Payslip PDF | In-process (pdfkit) | — | Sync | Render failure → 500, logged with payslip id | — |

## 7. Caching Strategy

| Layer | What | TTL | Invalidation |
|---|---|---|---|
| Web (React Query) | All GET API data | 30 s staleTime | Invalidate on mutation (query keys per module) |
| Web | Auth session (Zustand) | Session | On logout/401-after-refresh |
| API | None (hackathon scale) | — | — |
| Dashboard | React Query cache only, refetch on filter change | 0 | On navigation |

**Trade-off accepted:** no server-side caching — correct for demo scale; revisit with Redis if load grows.

## 8. ADR Index

| ADR | Title | Status |
|---|---|---|
| ADR-001 | Modular monolith + Python calculation service | Accepted |
| ADR-002 | React 19 SPA (CSR) over Next.js SSR | Accepted |
| ADR-003 | PostgreSQL + Prisma ORM | Accepted |
| ADR-004 | JWT access + httpOnly refresh cookie | Accepted |
| ADR-005 | Stateless Python engine with batch compute; safe AST formula evaluator (no eval) | Accepted |
| ADR-006 | Node-side PDF (pdfkit) from persisted lines, not headless browser | Accepted |
| ADR-007 | Synchronous compute within request (no job queue) | Accepted |
| ADR-008 | Payrun state machine DRAFT→COMPUTED→VALIDATED→PAID; duplicates as warnings, not hard constraint | Accepted |

Details for each (context, options, trade-offs) live in `docs/adr/ADR-00X-*.md` — to be written by Agent 4 from this document.