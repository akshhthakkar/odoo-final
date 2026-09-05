# Pay365 — Requirements Analysis

**Date:** 2026-09-05 · **Source:** `docs/Others/Pay365 HR & Payroll.md`

---

## 1. Problem Statement Summary

Basic HR tools store employees, attendance, leave, and salary as disconnected records. Pay365 must connect them into one operational flow: the Employee is the hub; Contracts + Working Schedules provide payroll context; Attendance and Time Off capture daily activity; Salary Structures and Rules define computation; Payruns transform eligible employees into validated payslips that can be printed and emailed. The dashboard must aggregate live data across all of it.

**Domain:** HR / Payroll operations
**Stakeholders:** HR Managers, HR Payroll Users, HR Payroll Managers, Employees, Admins
**Constraints:** Hackathon timeline; business logic must be in application code (not hardcoded values); salary rules must actively drive payslip generation; stack is free choice (we chose React + Node + PostgreSQL — all TypeScript, with the payroll calculation engine as an in-process TypeScript module in the Node backend).

---

## 2. User Personas

### Persona: Employee
- **Goals:** See own details, attendance, leave balances; submit time off requests and attendance entries.
- **Pain points:** No visibility of balances; manual leave paperwork.
- **Key workflows:** Login → view own record → create attendance entry → create time off request → see balance.
- **Permissions:** Read own data only; create own attendance + time off requests. **No** payroll or HR administration.

### Persona: HR Manager
- **Goals:** Keep employee, contract, schedule, attendance, and leave data accurate; approve/refuse leave.
- **Key workflows:** CRUD employees/contracts/schedules/attendance; approve or refuse time off requests.
- **Permissions:** Full CRUD on HR modules. **No access to payroll features** (payruns, payslips, salary config).

### Persona: HR Payroll User
- **Goals:** Run payruns and manage payslips for a period.
- **Permissions:** All HR Manager permissions **plus** Create/Read/Update on Payruns and Payslips; **read-only** on Salary Structures and Rules.

### Persona: HR Payroll Manager
- **Goals:** Configure salary structures/rules; fully control the payroll cycle end to end.
- **Permissions:** All HR Payroll User permissions plus full CRUD on Payruns, Payslips, Salary Structures, Salary Rules; full control over HR and payroll records.

### Persona: Admin
- **Permissions:** Full access to all modules; user management, role assignment, system administration.

---

## 3. Functional Requirements (mapped to spec modules)

| ID | Requirement | Spec Ref | Priority |
|---|---|---|---|
| FR-01 | Employee master: Kanban/List/Form views; department, manager, schedule, job, status on form; smart buttons linking to related records | A1, B1, B2 | P0 |
| FR-02 | Contract management: historical records; list shows dates/wages/status with active highlighted; payroll uses only the period-applicable contract; no concurrent active contracts | A2 | P0 |
| FR-03 | Working schedules: list (name, type, weekly hours); form defines Day/Start/End/Break lines; **weekly hours auto-computed**; assignable to employees/contracts | A3 | P1 |
| FR-04 | Time off types: units (days/hours), allocation requirement, approval workflow flags | A4 | P1 |
| FR-05 | Time off allocations: employee balances, require approval, track taken/remaining/validity | A4 | P1 |
| FR-06 | Time off requests: list (employee, type, dates, duration, status); form with approve/refuse workflow; **approved requests deduct from allocations** | B4 | P0 |
| FR-07 | Attendance: list (check-in, check-out, worked hours, status); detailed form; manual corrections restricted to authorized users; exceptions visible | B3 | P0 |
| FR-08 | Salary structures: containers of rules; list shows rule count/employees/active; form manages rules and execution sequence | A5 | P0 |
| FR-09 | Salary rules: name, code, category (Basic/Allowance/Gross/Deduction/Net), sequence; computation via **fixed, percentage, or formula**; sequenced execution respecting dependencies | A6 | P0 |
| FR-10 | Payrun wizard: Step 1 = structure + period; Step 2 = filter eligible staff and explicitly select; payrun created only after selection | B5 | P0 |
| FR-11 | Payrun processing screen: Compute, Validate, Mark Paid, Send Payslips actions; status and payslip summary; warnings highlighted before finalization; history preserved | B6 | P0 |
| FR-12 | Payslip screen: employee, structure, payrun, period, status, worked days; **rule-by-rule salary computation** (earnings, deductions, gross, net); uses period contract + payrun structure | B7 | P0 |
| FR-13 | Payslip PDF: printable PDF per employee | B8 | P1 |
| FR-14 | Bulk email delivery of payslips from the payrun | B8 | P1 |
| FR-15 | Payroll dashboard: KPI cards (total net paid, payslips generated, average salary, approved time off, attendance health); charts (salary cost by department, monthly net trend); operational alerts; attendance & time off overviews; department headcount + salary; filters by Period / Department / Employee Type — **all from live data** | B9, A7 | P0 |
| FR-16 | RBAC across 5 roles enforced on every endpoint and every UI route/action | §3 | P0 |
| FR-17 | Payroll warnings: missing bank details, duplicate payslips, missing/invalid contract surfaced before finalization | §7 | P0 |
| FR-18 | User management & role assignment (Admin) | §3 | P0 |

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | API response time | p95 < 300 ms for CRUD; payrun compute of 50 employees < 10 s |
| NFR-02 | Payroll correctness | Rule sequencing deterministic; identical inputs → identical payslip |
| NFR-03 | Security | OWASP basics: hashed passwords (bcrypt), JWT, input validation everywhere, parameterized queries (Prisma), rate-limited login |
| NFR-04 | Auditability | Security-sensitive actions (approvals, payroll finalization, role changes) audit-logged |
| NFR-05 | Testability | All P0 API endpoints have happy-path + error-path tests; engine has Vitest coverage of rule types |
| NFR-06 | Deployability | `docker-compose up` brings up the whole stack with seed data |
| NFR-07 | Demo reliability | Two scripted E2E scenarios run on seeded data without manual fixes |

## 5. Technical Requirements

- Monorepo: `apps/api` (Express + JavaScript/ES Modules, containing the in-process `src/engine/` Payroll Calculation Engine), `apps/web` (React 19 + JavaScript + Vite + SCSS), shared PostgreSQL. No separate calculation microservice.
- All config via environment variables validated at startup; `.env.example` per app; no secrets in code.
- Payroll-run service calls the calculation engine via direct, in-process TypeScript function calls (pure functions — no network, no DB inside the engine).
- PDF generation Node-side from persisted payslip lines (not from live recalculation).

## 6. Business Rules (must live in application logic)

1. **Period-based contract selection:** a payslip uses the ACTIVE contract whose `[start_date, end_date]` overlaps the payrun period. Zero matches → ERROR warning; more than one → ERROR warning; never silently pick one.
2. **No concurrent active contracts** per employee (validated at contract save).
3. **Weekly schedule hours are computed** from schedule lines (sum of (end − start − break)), never entered manually.
4. **Approved leave consumes allocation:** deduction only when the type requires allocation and the allocation is APPROVED and covers the request dates. Insufficient balance → block approval with clear error (or per-type allow negative — assumption: block).
5. **Salary rules execute in sequence;** later rules may reference earlier rule codes as variables. Gross = sum of positive-earning categories; Net = Gross − Deductions.
6. **Payrun state machine:** DRAFT → COMPUTED → VALIDATED → PAID (+ CANCELLED). No payslip mutation after VALIDATED; no recompute after VALIDATED; PAID is terminal (archived).
7. **Duplicate payslip detection:** if the employee already has a non-cancelled payslip overlapping the period → WARNING on the payrun before finalization.
8. **Missing bank details** on employee → WARNING before finalization (does not block compute, blocks nothing but is surfaced).
9. **Dashboard data is live:** every metric is a query over employees/contracts/payroll/attendance/time off, filtered by period/department/employee type.

## 7. Prioritized Feature Tiers

- **P0 (demo fails without):** Auth+RBAC, Employees, Contracts, Attendance, Time off requests+approval, Salary structures/rules, Payrun wizard+compute+payslips, Validate/Mark Paid, Warnings, Dashboard core KPIs, Seed data.
- **P1 (strengthens demo):** Kanban view, Schedules UI (weekly-hours computation), Allocations UI, PDF, Bulk email, Attendance overview widgets, employee-type filters.
- **P2 (only if time remains):** Attendance corrections workflow UI niceties, export CSV, payroll history charts, i18n.

## 8. Assumptions Register

| Ambiguity | Assumption | Rationale | Risk if wrong |
|---|---|---|---|
| Currency & locale | INR (₹), en-IN formatting | Spec example uses ₹ | Cosmetic only |
| Overtime handling | Overtime hours tracked on attendance; included as an input variable available to formula rules | Spec mentions overtime in dashboard; keeps engine generic | Low — overtime simply absent from payslips unless a rule uses it |
| Insufficient leave balance on approval | Approval is blocked with a validation error | Transparent, avoids negative balances | Minor UX friction; can relax per type later |
| Duplicate payslips | Allowed by DB but flagged as warnings (no hard unique constraint across payruns) | Spec explicitly wants duplicates *surfaced as warnings* | Compute must check; test covered |
| Employee self-service portal | Employee role gets read-only views of own data in the same SPA | Cheapest way to satisfy the Employee persona | Low |
| Payslip email | SMTP via env; Ethereal catch-all in dev | No real email needed for demo | None |
| Multi-company | Out of scope | Spec never mentions it | None for demo |

## 9. Out of Scope (explicit)

- Multi-tenant/multi-company, self-onboarding, tax tables beyond formula rules, GL/accounting integration, real payment gateway integration ("Mark Paid" is a status action), mobile apps, WebSocket/real-time push (dashboard refreshes on demand), background job queue (compute is synchronous within request timeout for hackathon scale).
