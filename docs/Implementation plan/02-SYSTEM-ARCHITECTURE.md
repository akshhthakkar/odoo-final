# Pay365 — System Architecture

**Date:** 2026-09-05 · **Status:** Approved baseline v1.1 — ADR-001 and ADR-005 revised: the Payroll Calculation Engine is an in-process TypeScript module inside the Node backend. (Full ADRs in `docs/adr/`)

---

## 1. Architecture Style Decision (ADR-001, summarized)

**Chosen:** Modular monolith (Node/Express) with an **in-process TypeScript Payroll Calculation Engine module** + PostgreSQL + React SPA.

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Dedicated calculation microservice | Clear process separation | Second runtime + network hop, circuit breaker/shared-secret ops overhead, harder atomicity and debugging for hackathon scale | Rejected |
| Calculation logic scattered across I/O services | Simplest | Money math tangled with persistence/HTTP code; hard to unit test in isolation | Rejected |
| Full microservices per domain | Scalable | Massive ops overhead for hackathon; no need | Rejected |
| **Modular monolith + in-process pure TS calc engine (chosen)** | Same separation of orchestration vs calculation via a module boundary; pure functions = trivially testable and deterministic; no network hop; single language/runtime; atomic transaction with persistence | All in one deployable (acceptable — engine is still a strictly pure, isolated module) | ✅ Chosen |

**Key invariants:**
1. React never talks to PostgreSQL; never computes salary.
2. Node owns all persistence and all workflow state machines.
3. The `payroll-engine` module owns payroll math only — pure TypeScript functions, no DB, no HTTP, no I/O, idempotent: same input → same output.
4. All module-to-module access inside Node goes through service-layer functions, never direct imports of another module's repositories.

---

## 2. System Diagram

```
┌────────────────────────────────────────────────────────────┐
│  BROWSER — React 19 + JavaScript SPA (Vite)                │
│  Login · Dashboard · Employees · Contracts · Attendance    │
│  Time Off · Schedules · Salary Structures/Rules · Payruns  │
│  Payslips · Reports                                        │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTPS / JSON  (Session Cookie `sid`)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NODE + EXPRESS + JavaScript (ES Modules) — API / Orchestration     │
│  Auth(Session) · RBAC(5 roles) · Validation(zod) · CRUD             │
│  Workflows: approve leave · payrun compute/validate/paid            │
│  Audit log · PDF generation · Email dispatch                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  PAYROLL CALCULATION ENGINE (in-process module)               │  │
│  │  Salary rule executor · fixed / % / formula rules             │  │
│  │  Sequenced execution · returns breakdown + warnings           │  │
│  │  PURE: no database · no HTTP · no I/O · same input → same out │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Prisma (SQL)
                           ▼
┌────────────────────────┐
│  POSTGRESQL 16         │
│  19 tables: employees, │
│  contracts, schedules, │
│  attendance, time off, │
│  structures, rules,    │
│  payruns, payslips,    │
│  warnings, users…      │
└────────────────────────┘
```

## 3. Frontend ↔ Backend Contract

- **Protocol:** REST, JSON, base path `/api/v1`.
- **Auth:** Session-based stateful auth. `express-session` + `connect-pg-simple` (PostgreSQL `sessions` table). `sid` cookie: `httpOnly`, `Secure`, `SameSite=Lax`. No tokens issued to client. Middleware reads `req.session.userId` / `req.session.role` on every request.
- **Session hydration on page load:** `GET /auth/me` returns `{ user, employee }` — same schema as login response — so Redux store can be rehydrated after a browser refresh without re-authenticating.
- **Errors:** standard envelope `{ success, error: { code, message, details[] } }` (see `04-API-CONTRACTS.md`).
- **Pagination:** `page`/`limit` query params; response `pagination` block.
- **Client:** single axios instance with `withCredentials: true` (sends `sid` cookie), request interceptor (X-Request-Id), response interceptor (401 → redirect to /login), React Query for caching/retries.
- **Timeouts:** default 15 s; `POST /payruns/:id/status-changes` (COMPUTE action) 60 s.
- **Real-time:** none (poll/refetch on navigation). Documented trade-off.

## 4. Module Boundaries (Node API)

Each module = routes → controller → service → (Prisma via repositories). Controllers parse/validate only; services hold business rules.

| Module | Owns | Exposes | Depends on | Does NOT |
|---|---|---|---|---|
| auth | users, sessions, password hashing, session management | /auth/* | users | assign roles |
| users | user records, role assignment | /users/* (Admin) | auth(mw) | touch employees |
| employees | employees, departments, jobs, smart-button counts | /employees/* | contracts(read counts), schedules(read), timeoff(read counts) | mutate those modules |
| contracts | contracts + period-overlap validation + active-contract uniqueness | /contracts/* | employees | compute payroll |
| schedules | working_schedules + schedule_lines + weekly-hours computation | /schedules/* | employees | attendance |
| attendance | attendance records, worked-hours computation, corrections | /attendance/* | employees | time off |
| timeoff | types, allocations, requests, approval workflow, balance deduction | /time-off/* | employees | attendance |
| payroll-config | salary_structures, salary_rules, sequencing validation | /salary-structures/*, /salary-rules/* | — | run payroll |
| payroll-run | payruns, payrun_employees, payslips, payslip_lines, warnings, state machine, period-contract selection, engine invocation (in-process) | /payruns/*, /payslips/* | employees, contracts, attendance, timeoff, payroll-config, payroll-engine | edit salary config |
| notifications | PDF rendering from persisted payslip lines; SMTP send + delivery status | /payslips/:id/pdf, /payruns/:id/dispatches | payroll-run (read) | recompute anything |
| reports | dashboard aggregate queries (KPIs, charts, alerts) | /dashboard/* | read-only across modules | mutate anything |
| payroll-engine | pure JavaScript calculation module: rule sequencing, condition evaluation, fixed/%/formula computation, safe formula evaluator, warnings; direct function API (`computeBatch`, `validateRules`) | internal module (called by payroll-run + payroll-config) | — | touch DB, HTTP, or any I/O; decide payrun membership; persist anything |

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

### 5.2 Payrun Compute Orchestration
```
Payroll Manager clicks Compute (web)
→ POST /api/v1/payruns/:id/compute   [HR Payroll User+]
→ payroll-run service (Node Orchestration Layer):
  1. Guard: payrun.status = DRAFT (or COMPUTED for recompute) → else 409
  2. For each selected employee (payrun_employees):
     a. Find ACTIVE contract overlapping [period_start, period_end]
        (start ≤ period_end AND (end IS NULL OR end ≥ period_start))
        → none: ERROR warning NO_ACTIVE_CONTRACT; >1: ERROR AMBIGUOUS_CONTRACT; skip employee
     b. Aggregate attendance: worked_days = distinct attendance dates in period,
        worked_hours = Σ worked_hours, overtime_hours = Σ overtime
     c. Aggregate approved leave days in period (from time off requests)
     d. Build flat variable map: wage, weekly_hours, worked_days, worked_hours, overtime_hours, leave_days
  3. Call in-process calculation engine: `computeBatch({ employees, rules })`
     (Pure function with zero I/O, no DB, no network, deterministic)
  4. Database Transaction:
     - If RECOMPUTE on same payrun: atomically delete previous payslips and payslip_lines for this payrun.
     - Insert payslips + payslip_lines from engine computation.
     - Evaluate duplicate warnings: If employee has a payslip in another overlapping payrun → record DUPLICATE_PAYSLIP warning.
     - If employee lacks bank details → record MISSING_BANK_DETAILS warning.
  5. Update payrun: status = COMPUTED; store aggregate totals (total_gross, total_deductions, total_net)
→ React: payrun screen renders updated payslips list and warnings panel
```

### 5.3 Payslip PDF & Bulk Email (P1 Finishing Layer — Non-blocking)
```
Core Lifecycle: Compute → Validate → Paid → Payslips generated
Finishing Layer: Payslips ├── PDF Generation (`pdfkit`)
                          └── Bulk Email Dispatch (`nodemailer`)

GET /api/v1/payslips/:id/pdf → renders HTML template from PERSISTED payslip_lines (zero recompute) → pdfkit stream
POST /api/v1/payruns/:id/send-payslips → renders and attaches PDF → dispatches via nodemailer → records email_sent_at
```

### 5.4 Live Operations Dashboard (P1 — SQL-Backed)
```
GET /api/v1/dashboard/metrics?period_start&period_end&department_id&employee_type
→ reports module executes live SQL aggregations:
  - Total Net Paid: SUM(payslips.net) WHERE status = 'PAID'
  - Payslips Generated: COUNT(payslips.id) WHERE status != 'DRAFT'
  - Approved Time Off Days: SUM(time_off_requests.days) WHERE status = 'APPROVED'
  - Attendance health: ratios grouped by status (PRESENT / LATE / MISSING_CHECKOUT / MANUAL_EDIT)
  - Salary cost breakdown grouped by department
→ Recharts renders live metrics and charts (zero hardcoded mock data)
```

## 6. Integration Specifications

| Integration | Purpose | Protocol | Auth | Sync/Async | Failure handling | Credentials |
|---|---|---|---|---|---|---|
| Payroll Calculation Engine (in-process TS module) | Salary computation | Direct TypeScript function calls (`computeBatch`, `validateRules`) | — (module boundary only) | Sync | Pure functions — cannot time out or go down; rule errors returned per-employee (`ok:false`) → ERROR warnings + 422 ENGINE_RULE_ERROR if all fail; unexpected engine throw → 500, payrun stays DRAFT, nothing persisted | — |
| SMTP | Payslip email | SMTP (nodemailer) | user/pass | Sync per send; per-recipient try/catch | Per-recipient failure logged, others continue; report per-payrun send summary | `SMTP_HOST/PORT/USER/PASS/FROM` |
| PDF renderer | Payslip PDF | In-process (pdfkit) | — | Sync | Render failure → 500, logged with payslip id | — |

## 7. Caching Strategy

| Layer | What | TTL | Invalidation |
|---|---|---|---|
| Web (React Query) | All GET API data | 30 s staleTime | Invalidate on mutation (query keys per module) |
| Web | Auth session (Redux Toolkit) | Session | On logout/401-after-refresh |
| API | None (hackathon scale) | — | — |
| Dashboard | React Query cache only, refetch on filter change | 0 | On navigation |

**Trade-off accepted:** no server-side caching — correct for demo scale; revisit with Redis if load grows.

## 8. ADR Index

| ADR | Title | Status |
|---|---|---|
| ADR-001 | Modular monolith with in-process JavaScript calculation engine | Accepted |
| ADR-002 | React 19 SPA (CSR) over Next.js SSR | Accepted |
| ADR-003 | PostgreSQL + Prisma ORM | Accepted |
| ADR-004 | Stateful session auth (express-session + connect-pg-simple + httpOnly sid cookie) over JWT stateless | Accepted |
| ADR-005 | Pure in-process JavaScript engine with batch compute; grammar-whitelisted formula evaluator (no eval / no new Function) | Accepted (revised v1.1) |
| ADR-006 | Node-side PDF (pdfkit) from persisted lines, not headless browser | Accepted |
| ADR-007 | Synchronous compute within request (no job queue) | Accepted |
| ADR-008 | Payrun state machine DRAFT→COMPUTED→VALIDATED→PAID; duplicates as warnings, not hard constraint | Accepted |

Details for each (context, options, trade-offs) live in `docs/adr/ADR-00X-*.md` — to be written by Agent 4 from this document.