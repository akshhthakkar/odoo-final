# Pay365 — Development Roadmap & Task Specifications

**Date:** 2026-09-05 · Executor: implementation agent · Board status lives in `00-MASTER-PLAN.md` §6.

---

## Phase Overview

| Phase | Tasks | Exit criteria |
|---|---|---|
| **P0 Core Business Flow** | 001–016 | Complete business flow: Auth → Org → Employees → Contracts → Schedules → Attendance → Leave Allocation & Request → Salary Rules → Payrun → Pure Engine → Payslips → Warnings/Validation |
| **P1 Finishing & Polish** | 017–021 | Non-blocking layer: PDF generation, Bulk email, Live SQL Dashboard, Advanced Reporting, Kanban view & Demo rehearsal |

---

## Task Specifications

### TASK-001: Foundation / Auth & Scaffolding (P0, deps: —)
**Goal:** Monorepo skeleton + DB migrations + base authentication.
**Scope:** Monorepo layout (`backend/`, `frontend/`), Express+JS hello API, Vite React app with SCSS, Docker Compose (PostgreSQL 16, API, Web), Prisma ORM migrations, session auth endpoints (`/login`, `/logout`, `/me`) using `express-session` + `connect-pg-simple`, bcrypt password hashing, `sid` httpOnly cookie.
**AC:** `docker-compose up` serves API + Web + DB; login creates server-side session and sets `sid` cookie; `/me` returns user identity from session; logout destroys session; rate limiting blocks 5 bad attempts per IP.

### TASK-002: Departments & Jobs CRUD (P0, deps: 001)
**Goal:** Organizational structure master data.
**Scope:** Departments (code, name, parent hierarchy, manager reference) and Jobs CRUD endpoints and UI selectors.
**AC:** HR Manager and Admin can create/update departments and jobs; hierarchical parent-child relationships validated; unique codes enforced.

### TASK-003: Users + 5-Role RBAC Model (P0, deps: 001, 002)
**Goal:** 5-Role RBAC enforcement (`EMPLOYEE`, `HR_MANAGER`, `HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`).
**Scope:** `requireAuth` + `requireRole` middleware, route guards, resource ownership checks, audit logging for role/user changes.
**AC:** Integration tests assert 403 Forbidden for unauthorized roles across all endpoints; audit rows recorded for user creation/deactivation.

### TASK-004: Employees Master Data & Smart-Button Hub (P0, deps: 002, 003)
**Goal:** Employee master management and central navigation hub.
**Scope:** Employee CRUD, `/employees/me` self-view, `/employees/:id/summary` for smart-button counts (Contracts, Attendance, Time Off balances), active/suspended/terminated states.
**AC:** HR Manager has full CRUD; Employee sees only own profile; smart-button counts accurately reflect related records.

### TASK-005: Contracts CRUD & Active-Contract Period Logic (P0, deps: 004)
**Goal:** Historical contracts with strict active-period resolution.
**Scope:** Contract CRUD (wage, currency, type, start/end date, structure link); overlap validation; `findApplicableContract(employeeId, period)` resolution helper.
**AC:** Overlapping ACTIVE contracts for the same employee rejected with 409; `end_date < start_date` rejected; lookup helper unit-tested (0 contracts → null, 1 matching → contract, multiple overlapping → ambiguous error).

### TASK-006: Working Schedules & Schedule Lines (P0, deps: 004)
**Goal:** Working schedules defining expected working hours.
**Scope:** Working schedules + lines CRUD; server-side weekly hours computation (`Σ(end - start - break)`); schedule assignment to employee/contract.
**AC:** Weekly hours computed automatically from line items; duplicate day-of-week per schedule rejected at DB/API layer (`UNIQUE(schedule_id, day_of_week)`).

### TASK-007: Attendance Management (P0, deps: 004, 006)
**Goal:** Daily check-in/out tracking and schedule-based status inference.
**Scope:** Attendance CRUD (one per employee/day via `UNIQUE(employee_id, attendance_date)`), `worked_hours` and `overtime_hours` computation, status inference (PRESENT, LATE, MISSING_CHECKOUT, MANUAL_EDIT), HR manual corrections with audit logging.
**AC:** Duplicate check-in on same day rejected with 409; check-out before check-in rejected with 400; HR correction sets `source=HR` and records audit entry.

### TASK-008: Time Off Types (P0, deps: 004)
**Goal:** Leave type policies (e.g. Paid Leave, Casual Leave, Sick Leave).
**Scope:** Time off types CRUD (unit: DAYS/HOURS, `requires_allocation` flag, `allows_request`, color tag, active status).
**AC:** Configurable types stored with unique codes; allocation requirement flag enforced during request creation.

### TASK-009: Time Off Allocations & Balance Tracking (P0, deps: 008)
**Goal:** Employee leave entitlements and allocation lifecycle.
**Scope:** Allocations CRUD, allocation approval workflow (`DRAFT → TO_APPROVE → APPROVED / REFUSED`), remaining balance calculation (`allocated_days - taken_days`).
**AC:** Approved allocation required before leaves can be taken for types requiring allocation; remaining balance endpoint returns exact balances.

### TASK-010: Time Off Requests & Automatic Balance Deduction (P0, deps: 009)
**Goal:** Employee leave request lifecycle with atomic balance deduction.
**Scope:** Leave request creation, working-day calculation, approval/refusal flow (`TO_APPROVE → APPROVED / REFUSED / CANCELLED`), atomic transaction updating `allocation.taken_days += days`, self-approval prevention.
**AC:** Approving request atomically increments allocation `taken_days` and reduces remaining balance; insufficient balance rejected with 409 `INSUFFICIENT_BALANCE`; users cannot approve their own requests (403).

### TASK-011: Salary Structures CRUD (P0, deps: 004)
**Goal:** Salary structure definitions grouping salary rules.
**Scope:** Salary structures CRUD, default structure assignment, structure-employee association.
**AC:** Structures created with unique codes; list displays associated rule counts and assigned employee counts.

### TASK-012: Salary Rules Configuration & Sequencing (P0, deps: 011)
**Goal:** Configurable salary calculation rules.
**Scope:** Rules CRUD (categories: BASIC, ALLOWANCE, GROSS, DEDUCTION, EMPLOYER_CONTRIB, NET; computation types: FIXED, PERCENTAGE, FORMULA), execution sequencing (`UNIQUE(structure_id, sequence)`), rule-set validation calling engine `validateRules()`.
**AC:** Saving invalid rule structure (syntax errors, circular base codes, duplicate sequence/code) rejected with 422; preview dry-run returns computed lines without DB writes.

### TASK-013: Payrun Wizard & Orchestration Service (P0, deps: 005, 007, 010, 012)
**Goal:** Period-specific payrun setup and data aggregation.
**Scope:** 2-step payrun creation wizard (Period + Structure → Select Employees); payroll orchestration service that queries period-active contracts, aggregates attendance (`worked_days`, `worked_hours`, `overtime_hours`), aggregates approved leave days (`leave_days`), builds flat variable maps, and calls the in-process calculation engine.
**AC:** Contract resolution executes strictly in Node orchestration layer; employees without active contract flagged; flat variable map assembled cleanly.

### TASK-014: Pure In-Process TypeScript Payroll Engine Module (P0, deps: 012 — parallelizable from TASK-001)
**Goal:** In-process, pure, zero-I/O calculation engine in `backend/src/engine/`.
**Scope:** `computeBatch()` and `validateRules()` functions; sequenced rule executor; handwritten tokenizer and recursive descent parser for formula DSL; strict grammar whitelist (numbers, identifiers, arithmetic, comparisons, logical, ternary) and explicit rejection of calls, property access, loops, objects, prototype pollution; `decimal.js` half-up 2 dp rounding.
**AC:** Pure function (no DB, no HTTP, no I/O, no `Date.now()`, no `Math.random()`); identical inputs yield deep-equal outputs; ₹50,000 spec test case yields exact breakdown: BASIC 50000, HRA 10000, TRANSPORT 3000, GROSS 63000, PF -6000, TAX -2000, NET 55000.

### TASK-015: Payslips Generation & Line Assembly (P0, deps: 013, 014)
**Goal:** Atomic payslip persistence and line breakdown.
**Scope:** Atomic transaction creating `payslips` + `payslip_lines` from engine calculation results; `UNIQUE(payrun_id, employee_id)` constraint enforcement; atomic payslip replacement on recompute.
**AC:** Payslip lines snapshot all rule names, codes, rates, categories, amounts; recompute of same payrun replaces payslips atomically.

### TASK-016: Payroll Validation, Warnings & State Machine (P0, deps: 015)
**Goal:** Payrun lifecycle (`DRAFT → COMPUTED → VALIDATED → PAID → CANCELLED`) and warning surfacing.
**Scope:** Warning generation (`NO_ACTIVE_CONTRACT`, `AMBIGUOUS_CONTRACT`, `DUPLICATE_PAYSLIP`, `MISSING_BANK_DETAILS`, `ZERO_WORKED_DAYS`, `RULE_ERROR`); validation blocker for ERROR severity; duplicate payslip detection across overlapping payruns; state machine transition guards.
**AC:** Recompute of same payrun replaces payslips cleanly; overlapping payrun raises `DUPLICATE_PAYSLIP` warning; illegal state transitions return 409 `STATE_ERROR`; ERROR warnings block validation.

### TASK-017: Payslip PDF Generation (`pdfkit`) (P1, deps: 015)
**Goal:** Printable payslip PDF documents.
**Scope:** HTML/PDF template rendered via `pdfkit` using persisted `payslip_lines` data (zero recalculation); `/payslips/:id/pdf` streaming endpoint.
**AC:** PDF renders employee identity, company header, rule line table, and net salary in words; non-owner employees cannot access other users' PDFs (403).

### TASK-018: Bulk Payslip Email Dispatch (`nodemailer`) (P1, deps: 017)
**Goal:** Bulk payslip distribution to employees.
**Scope:** `POST /api/v1/payruns/:id/send-payslips` endpoint; nodemailer SMTP integration (Ethereal test SMTP in dev); per-recipient error handling and delivery summary.
**AC:** Dispatches PDF attachments to employee emails; logs `email_sent_at` on payslips; partial failures do not abort batch; restricted to `HR_PAYROLL_MANAGER`.

### TASK-019: Live Operations Dashboard (P1, deps: 016)
**Goal:** Real-time KPI cards, charts, and operational alerts.
**Scope:** Direct PostgreSQL aggregation endpoints for `Total Net Salary Paid` (`SUM(net) WHERE status = 'PAID'`), `Payslips Generated` (`COUNT(id)`), `Approved Time Off` (`SUM(days) WHERE status = 'APPROVED'`), Department salary breakdown, monthly trends, and open warnings feed.
**AC:** All metrics reflect live database records with zero static/mock data; interactive filters (period, department) dynamically update charts.

### TASK-020: Advanced Reporting & Analytics Breakdown (P1, deps: 019)
**Goal:** Detailed HR and payroll analytics reports.
**Scope:** Exportable report views for payroll summaries by department/job position, leave utilization rates, and attendance exception summaries.
**AC:** Reports query live data with grouping, sorting, and CSV export capabilities.

### TASK-021: Kanban Views, UX Polish & Demo Rehearsal (P1, deps: 016)
**Goal:** Polished UI and verified 5-minute demo walkthroughs.
**Scope:** Employee Kanban view grouped by department/status; loading skeletons, empty states, and toast notifications; rehearsal of Scenario A (Employee to Payslip) and Scenario B (Leave Allocation to Request to Balance Deduction).
**AC:** Both E2E scenarios execute smoothly without console errors or broken navigation; zero mock data visible in demo flow.

---

## Business Scenario Test Specifications (Agent 3 QA)

1. **Scenario 1 — Contract Period Selection:**
   - Setup: Contract A active Jan 1 – Jun 30 (wage 40,000), Contract B active Jul 1 – Dec 31 (wage 55,000).
   - Test: Compute payrun for August 1 – August 31.
   - Expected: System automatically selects Contract B; wage 55,000 used in engine input; Contract A ignored.
2. **Scenario 2 — Leave Allocation & Deduction:**
   - Setup: Employee allocated 10 days of Casual Leave (Approved).
   - Test: Employee requests 3 days (Approved).
   - Expected: Allocation `taken_days` = 3, `remaining` = 7; employee smart button shows 7 days remaining.
3. **Scenario 3 — Salary Rule Sequencing & Math:**
   - Setup: Basic = 50,000, HRA = 20% Basic, Transport = 3,000, PF = 12% Basic, Tax = 2,000.
   - Test: Run batch compute.
   - Expected: Basic 50000, HRA 10000, Transport 3000, Gross 63000, PF -6000, Tax -2000, Net 55000.
4. **Scenario 4 — Security & RBAC Enforcement:**
   - Test: Employee role tries calling `GET /api/v1/payruns` or `POST /api/v1/salary-structures`.
   - Expected: HTTP `403 Forbidden` with standardized error envelope.
5. **Scenario 5 — Duplicate Payslip Semantics:**
   - Test A: Recompute same payrun $\rightarrow$ Atomic replacement of payslips without duplicate warning.
   - Test B: Create second overlapping payrun for same period $\rightarrow$ `DUPLICATE_PAYSLIP` warning generated.

---

## Definition of Done (every task)

- [ ] Meets all acceptance criteria; zod validation on new endpoints; error envelope everywhere
- [ ] Role enforcement implemented + tested (403 paths)
- [ ] Happy + error path tests for P0 endpoints; engine changes have Vitest unit tests
- [ ] No secrets, no console.log, no unused variable warnings, lint clean
- [ ] Audit rows for security-sensitive actions; UI follows `06-FRONTEND-ARCHITECTURE.md` patterns
- [ ] Board status updated in `00-MASTER-PLAN.md` §6
