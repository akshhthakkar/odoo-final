# PeoplePay360 — Development Roadmap & Task Specifications

**Date:** 2026-09-05 · Executor: implementation agent · Board status lives in `00-MASTER-PLAN.md` §6.

---

## Phase Overview

| Phase | Tasks | Exit criteria |
|---|---|---|
| P0 Foundation | 001–004 | `docker-compose up` serves API+web+engine+db; login works; RBAC enforced |
| P1 HR Core | 005–011 | Employees→contracts→schedules→attendance→time off flows work with roles |
| P2 Payroll Core | 012–014 | Config UI + engine + wizard compute produce correct payslips |
| P3 Payroll Completion | 015–018 | Validate/paid, warnings, PDF, email |
| P4 Demo | 019–021 | Dashboard live, seeded data, two E2E demo scenarios rehearsed |

---

## Task Specifications

### TASK-001: Monorepo scaffolding + docker-compose (P0, deps: —)
**Goal:** Runnable skeleton of all four tiers.
**Scope:** monorepo layout (apps/api, apps/web, services/payroll-engine); Express+TS hello-API with health; Vite React app; FastAPI with /health; docker-compose (postgres 16, api, web, engine) with env templates; eslint/prettier; CI-less scripts.
**AC:** `docker-compose up` → web loads, API `/api/health` 200, engine `/health` 200; `.env.example` complete for all apps; no secrets committed.

### TASK-002: Database schema + migrations (P0, deps: 001)
**Goal:** All 19 tables per `03-DATABASE-DESIGN.md` migrated.
**Scope:** schema.prisma with all enums/entities/indexes/uniques; `prisma migrate dev`; seed script stub.
**AC:** migration applies cleanly; all indexes from design doc exist; enums match; seed stub runs.

### TASK-003: Auth (P0, deps: 002)
**Goal:** JWT login/refresh/logout/me per `04-API-CONTRACTS.md` §4.
**Scope:** bcrypt, access 15 min, refresh cookie 7d with rotation + revocation, rate limiting on login, zod validation, request-id middleware, error envelope.
**AC:** login returns token+cookie; /me returns role; refresh rotates; 5 bad logins → 429; wrong-password is generic 401; logout revokes.

### TASK-004: RBAC middleware + audit log (P0, deps: 003)
**Goal:** `requireRole` enforcement + audit trail per `07-SECURITY-RBAC.md`.
**Scope:** role middleware, row-level helpers, audit service + writes for security actions.
**AC:** integration tests prove 403 for each under-privileged role on representative endpoints; audit rows written for role-gated actions.

### TASK-005: Web shell (P0, deps: 003)
**Goal:** Login page, AppShell with role-aware top nav, protected routing, api client with refresh interceptor.
**AC:** login lands on dashboard shell; nav items filtered by role; 401 → silent refresh → retry; expired refresh → redirect to /login.

### TASK-006: Employees + departments + jobs (P0, deps: 004, 005)
**Goal:** FR-01 employee master with smart-button counts.
**Scope:** CRUD endpoints (list filters, pagination, search), /employees/me, /employees/:id/summary; web list (List view first), form, detail as hub with smart buttons; soft-terminate.
**AC:** HR Manager full CRUD; Employee sees only /employees/me; summary counts correct; zod rejects bad payloads (400 with details).

### TASK-007: Contracts (P0, deps: 006)
**Goal:** FR-02 historical contracts + active-contract integrity.
**Scope:** CRUD, overlap validation (409 CONTRACT_OVERLAP), list highlights ACTIVE; employee smart-button link.
**AC:** creating overlapping ACTIVE contract → 409; end<start → 400; list marks active; payroll lookup helper `findApplicableContract(employeeId, period)` implemented + unit-tested (0/1/many cases).

### TASK-008: Working schedules (P1, deps: 006)
**Goal:** FR-03 schedules with computed weekly hours.
**Scope:** schedules + lines CRUD; PUT /lines recomputes weekly_hours server-side; web line editor with live total; assign to employee/contract.
**AC:** weekly_hours equals Σ(end−start−break) always; manual weekly_hours input rejected; duplicate day-of-week rejected.

### TASK-009: Attendance (P0, deps: 006)
**Goal:** FR-07 attendance with exceptions + corrections.
**Scope:** CRUD (one record per employee/day), worked_hours computed on write, status inference (LATE via schedule, MISSING_CHECKOUT when open), HR corrections set MANUAL_EDIT/source=HR; self view for Employee.
**AC:** duplicate day → 409; checkout before check-in → 400; correction by HR marks MANUAL_EDIT + audit row; Employee restricted to own records.

### TASK-010: Time off types + allocations (P1, deps: 006)
**Goal:** FR-04/FR-05 policy + balances.
**Scope:** types CRUD (units, requires_allocation); allocations CRUD + approve/refuse with remaining/validity; balances endpoint.
**AC:** allocation approval required before usable; remaining = allocated − taken; balances endpoint correct per type.

### TASK-011: Time off requests + approval flow (P0, deps: 010)
**Goal:** FR-06 request lifecycle with automatic balance deduction.
**Scope:** requests CRUD (own create, cancel own while TO_APPROVE), days computed by service, approve (tx: status + allocation.taken_days += days; INSUFFICIENT_BALANCE → 409), refuse with reason; cannot approve own request; employee smart-button link; audit.
**AC:** full flow allocate→request→approve deducts balance; insufficient balance blocks with 409; refuse records reason; self-approval → 403; double-approve → 409.

### TASK-012: Salary structures + rules config (P0, deps: 006)
**Goal:** FR-08/FR-09 fully functional config (spec: not static mockups).
**Scope:** structures CRUD (rule_count, employee_count on list), rule editor with drag-order sequencing, zod validation per computation_type; PUT /structures/:id/rules replaces set in tx and calls engine /v1/validate-rules; /payslips/preview dry-run endpoint wired.
**AC:** invalid formula rejected at save (engine validation); duplicate code/sequence rejected; preview returns computed breakdown without persisting; read-only enforced for HR_PAYROLL_USER (403 on write).

### TASK-013: Python payroll engine (P0, deps: contract only — parallelizable from TASK-001)
**Goal:** Engine per `05-PAYROLL-ENGINE-CONTRACT.md`.
**Scope:** FastAPI app, pydantic schemas, /health, /v1/validate-rules, /v1/compute-batch, sequenced executor, safe AST formula evaluator, warnings, Decimal rounding; pytest suite; shared-secret auth.
**AC:** all pytest cases pass (rule types, sequencing, conditions, rounding, safety rejections, idempotency); ₹50,000 example from spec returns exactly BASIC 50000 / HRA 10000 / TRANSPORT 3000 / GROSS 63000 / PF −6000 / TAX −2000 / NET 55000; malicious formula strings rejected.

### TASK-014: Payrun wizard + compute + payslips (P0, deps: 007, 009, 011, 012, 013)
**Goal:** FR-10/FR-11/FR-12 — the heart of the demo.
**Scope:** eligible-employees endpoint; POST /payruns; compute orchestration per `02-SYSTEM-ARCHITECTURE.md` §5.2 (contract selection, attendance/leave aggregation, engine batch call, tx persist payslips+lines+warnings, totals, status→COMPUTED); payslip list/detail web pages with rule breakdown; wizard UI per `06-FRONTEND-ARCHITECTURE.md` §5.
**AC:** compute on seeded data produces payslips matching engine output exactly (lines, totals); employee without applicable contract → ERROR warning + no payslip; duplicate-payslip warning appears on second run over same period; recompute replaces payslips atomically; validate-blocked while ERROR warnings exist.

### TASK-015: Payrun state machine: validate / mark paid / cancel (P0, deps: 014)
**Goal:** FR-11 lifecycle + history preservation.
**Scope:** /validate (HR_PAYROLL_MANAGER; guard no ERROR warnings; locks payslips; validated_at), /mark-paid (guard VALIDATED; paid_at; archive), /cancel (DRAFT/COMPUTED only), UI action bar with guards.
**AC:** every illegal transition → 409 STATE_ERROR (matrix-tested: DRAFT→PAID, PAID→anything, etc.); after VALIDATED compute is refused; UI disables actions per status.

### TASK-016: Payroll warnings surfacing (P0, deps: 014)
**Goal:** FR-17 — issues visible before finalization.
**Scope:** warning codes implemented at compute (MISSING_BANK_DETAILS, DUPLICATE_PAYSLIP, NO_ACTIVE_CONTRACT, AMBIGUOUS_CONTRACT, NO_SCHEDULE, ZERO_WORKED_DAYS); payrun warnings panel; resolve flag; dashboard alerts feed.
**AC:** each warning code triggered by a seeded scenario and visible on PayrunDetail; ERROR blocks validate; WARNING does not.

### TASK-017: Payslip PDF (P1, deps: 014)
**Goal:** FR-13 printable PDF from persisted lines.
**Scope:** HTML template → pdfkit; identity block + line breakdown + net-in-words; /payslips/:id/pdf stream; Print button.
**AC:** PDF renders correct amounts for a computed payslip (spot-check vs DB); 403 for non-owner Employee; works offline (no external fetches in template).

### TASK-018: Bulk payslip email (P1, deps: 017)
**Goal:** FR-14 bulk distribution from payrun.
**Scope:** /payruns/:id/send-payslips → per-payslip render+attach+send via nodemailer (Ethereal dev), email_sent_at per payslip, per-payrun summary {sent, failed[]} with reasons; UI button + result toast.
**AC:** dev SMTP receives N attachments for N payslips; one bad email doesn't abort the batch; employees without email listed as failed; action guarded to HR_PAYROLL_MANAGER.

### TASK-019: Payroll dashboard (P0, deps: 015)
**Goal:** FR-15 live aggregated dashboard per `04-API-CONTRACTS.md` §3 dashboard.
**Scope:** reports module aggregate queries; /dashboard/metrics single payload; web: 5 KPI cards, salary-cost-by-department bar, monthly-net-trend line, alerts panel, attendance + time-off overviews, department breakdown; Period/Department/Employee-Type filters.
**AC:** every number traceable to source records (QA verifies 3 metrics by hand against seeded data); filters change all widgets; zero static/mock data; loads < 1.5 s on seed volume.

### TASK-020: Seed/demo dataset (P0, deps: 012, 014)
**Goal:** Representative data per `03-DATABASE-DESIGN.md` §7.
**Scope:** users for all 5 roles; 12 employees across 4 departments incl. edge cases (missing bank details, no schedule, overlapping-contract candidate, part-time); 60 days attendance incl. late/missing-checkout/manual-edit; leave types/allocations/requests in mixed states; Regular Salary structure (spec example rules); 2 historical PAID payruns + 1 DRAFT payrun.
**AC:** fresh `docker-compose up && seed` yields a fully navigable system; the ₹50,000 employee computes to NET 55,000; dashboard trends have 6+ months of history.

### TASK-021: Kanban + polish + demo rehearsal (P1, deps: 019, 020)
**Goal:** Deliverable-ready demo.
**Scope:** employee Kanban view (group by department/status); loading/empty/error states sweep; role-based menu polish; rehearse Scenario A (employee→payslip) and Scenario B (leave allocation→request→deduction→dashboard); record fallback screenshots; README quick-start.
**AC:** both scenarios run end-to-end in under 5 minutes on a fresh seed; every P0 route reachable without console errors; 403 page shows for unauthorized role access attempts.

---

## Definition of Done (every task)

- [ ] Meets all acceptance criteria; zod validation on new endpoints; error envelope everywhere
- [ ] Role enforcement implemented + tested (403 paths)
- [ ] Happy + error path tests for P0 endpoints; engine changes have pytest
- [ ] No secrets, no console.log, no `any` escapes in TS, lint clean
- [ ] Audit rows for security-sensitive actions; UI follows `06-FRONTEND-ARCHITECTURE.md` §6 patterns
- [ ] Board status updated in `00-MASTER-PLAN.md` §6
