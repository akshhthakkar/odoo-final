# Pay365 — Remaining UI Features Implementation Plan (Repo Comparison)

**Date:** 2026-09-05
**Method:** Feature-by-feature comparison of the reference workspace (`workspace-37b80ad6-f762-4962-9c2f-7e88ea060fae` — a complete working PeoplePay360 implementation) against the current `odoo-final` codebase.
**Purpose:** Specify exactly what must be built to close every UI gap, in dependency order, with backend prerequisites and acceptance criteria.
**Status:** Approved plan — ready for implementation agent.

---

## 1. The Two Repos at a Glance

| | Reference workspace | odoo-final (current) |
|---|---|---|
| Stack | Next.js + TypeScript + Zustand + shadcn/ui + Tailwind | React 19 SPA + JavaScript + Redux Toolkit + React Query + SCSS |
| Data layer | **Mock store** (`lib/store.ts`, localStorage-persisted, mirrors a Node API 1:1) | **Real API** (Express + Prisma + PostgreSQL) |
| Payroll engine | `lib/payroll.ts` (client-side mirror) | `backend/src/engine/` (real, pure, tested shape) |
| UI completeness | **All 14 views fully implemented** | 4 views wired to API; 7 views mock-driven; payslips/reports views missing |
| Auth | Mock login (seed users) | Real session auth (httpOnly cookie, 5 roles) |

**Key insight:** the reference store's action list is literally documented as the API contract (`login→POST /api/auth/login`, `computePayrun→POST /api/payruns/:id/compute`, …). Porting = replacing store calls with React Query mutations against our real backend, and building the 4 missing backend modules the reference's store already models.

## 2. Gap Matrix (module × reference × current × gap)

| # | Module | Reference UI features | Current odoo-final | Gap |
|---|---|---|---|---|
| 1 | Salary Structures + Rules | Structure cards (rule count, assigned employees, ordered rule list), drag-reorder, rule table with live formula validation | `SalaryConfigPage.jsx` — **mock**; backend **fully implemented** (structures/rules/validateRules) | Wire UI → API |
| 2 | Users / Admin | Role management behind Admin gate | `AdminPage.jsx` — **mock**; backend users module **implemented** | Wire UI → API |
| 3 | Schedules | Card grid, line editor (day switches, auto weekly hours), PUT lines | `SchedulesPage.jsx` — **mock**; backend **implemented** (user added post-audit) | Wire UI → API |
| 4 | Attendance | Check-in/out widget, corrections dialog, filters, audit flags | `AttendancePage.jsx` — **mock**; backend **implemented** (user added post-audit) | Wire UI → API |
| 5 | **Payruns** | Two-step wizard, card grid, processing screen with state machine strip, Compute/Validate/Mark Paid/Send actions, warnings panel | `PayrollPage.jsx` — **mock**; backend payruns = **empty stub** (only payslip preview exists) | **Build backend + UI** (largest gap) |
| 6 | **Payslips** | Filterable list; detail with computation breakdown, print/PDF, email | **No page**; backend has only `POST /payslips/previews` | **Build backend + UI** |
| 7 | Time Off | 4 tabs (Calendar week-planner / Requests / Allocations / Types), request dialog with live balance, approve/refuse with balance guard | `TimeOffPage.jsx` — **mock**; backend timeoff = **empty stub** | **Build backend + UI** |
| 8 | Dashboard | Role-variant (Payroll/HR), 4 KPIs + MoM deltas, 2 chart modes, recent payslips, payrun donut, 3 overview cards, 6-type alert catalogue | `DashboardPage.jsx` — **mock**; backend reports = **empty stub** | **Build backend + UI** |
| 9 | Reports | Dept gross/net chart, leave summary, payroll history table | **No page**; backend stub | Build backend + UI (after dashboard) |
| 10 | Employees upgrades | Kanban (4 status columns), smart buttons deep-linking, payroll-context card, create-dialog auto-contract | `EmployeesPage` + `EmployeeProfilePage` — **wired to API** but list-only, no Kanban/smart-buttons | Enhance |
| 11 | App shell | Role-gated nav groups (main / Payroll / Insights), notification bell, global search, user dropdown, view guard | `AppShell.jsx` basic | Enhance |
| 12 | Shared primitives | PageHeader, PayrunStatusBadge, LeaveStatusBadge, AttendanceStatusBadge, CategoryBadge, TypeChip, EmptyState, SmartButton | Partial/ad-hoc per page | Extract once, reuse everywhere |

---

## 3. Porting Decisions (reference → odoo-final)

| Reference pattern | odoo-final adaptation |
|---|---|
| Zustand store actions = mock API | **React Query mutations** against real `/api/v1` endpoints; no client-side business logic — the backend owns all rules |
| Store-enforced state machine | Backend-enforced (409 STATE_ERROR); UI only disables buttons + toasts the API error message |
| `can(role, p => p.payruns.compute)` granular flags | Port `permissions.ts` shape to `frontend/src/lib/permissions.js` with our 5 SCREAMING_SNAKE roles; UI gating only |
| `ViewState { name, id, filter }` deep-links | React Router search params (`?employeeId=&tab=requests&self=1`) — same deep-link capability, URL-native |
| shadcn/ui components | Existing `components/ui` + SCSS; build the 8 shared primitives once (§4) |
| `window.print()` payslip | **V1:** print stylesheet on the computation card (same as reference). **V2:** `GET /payslips/:id/pdf` via pdfkit (already planned) |
| Recharts charts | Recharts (already a dependency) |
| dnd-kit drag reorder of structure rules | Drag **renumbers `sequence`** (10/20/30…) then persists via `PUT /salary-structures/:id/rules` — our backend stores sequence, not an ordered id list |
| Mock month bounds (`2026-06`–`2026-12`) | Month input unbounded (default = current month) |
| Brand "PeoplePay360" | "Pay365" everywhere |

---

## 4. Phase A — Shared Foundations (build first, ~1 day)

Everything below is reused by every feature; build before any module work.

### A1. `lib/permissions.js` — port the RBAC matrix
Port `ROLE_PERMISSIONS` exactly (reference §permissions.ts) with our role names: `EMPLOYEE, HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN`. Granular flags:
```
payruns: { read, write, compute, validate, pay, send }
payslips: { read, readSelf, write }
attendance: { read, writeSelf, writeAll }
timeOff: { read, request, approve, manage }
structures/rules: { read, write } · schedules/contracts: { read, write }
employees: { read, write, delete } · dashboard: { hr, payroll } · reports: bool · users: bool
```
Role mapping per the approved matrix: HR_MANAGER = no payroll section at all; HR_PAYROLL_USER = structures/rules read-only, payruns {read,write,compute,send}, validate=false, pay=false; HR_PAYROLL_MANAGER = everything payroll; ADMIN = all + users.
Export helper `can(role, predicate)`.

### A2. `components/shared/` — 8 primitives (SCSS, token-driven)
Port from reference `shared.tsx`: **PageHeader** (title/subtitle/actions), **PayrunStatusBadge** (Draft gray / Computed sky / Validated amber / Paid emerald), **LeaveStatusBadge** (To Approve amber / Approved emerald / Refused rose / Cancelled gray), **AttendanceStatusBadge** (Present emerald / Late amber / Absent rose / On Leave sky / Half Day accent), **CategoryBadge** (Basic sky / Allowance emerald / Gross accent / Deduction rose / Net amber), **TypeChip**, **EmptyState** (icon tile + title + hint), **SmartButton** (icon + count + label, hover lift).
Files: `frontend/src/components/shared/*.jsx` + `shared.scss`.

### A3. Deep-link filter convention
Standardize URL search params on list pages: `?employeeId=&status=&tab=&q=&self=1`. Every list page reads them via `useSearchParams` and every smart button/notification navigates with them. (This replaces the reference's `ViewState.filter`.)

### A4. App shell upgrade (F-11 core)
- Nav groups: **main** (Dashboard, Employees, Contracts, Attendance, Time Off, Schedules) / **"Payroll"** (Payruns, Payslips, Salary Structures, Salary Rules) / **"Insights"** (Reports) — each item visibility-gated via `permissions.js` (Payroll group hidden from HR_MANAGER; Dashboard shown to HR with HR-variant).
- Route guard: if the current route isn't allowed for the role → redirect to role home (dashboard for HR/payroll, own attendance for EMPLOYEE).
- User dropdown (name, email, role label, Sign out) — replaces current static user chip.
- **Notification bell** (P2, after dashboard): 3 alert types — pending time-off approvals (approvers), draft/computed payruns (payroll roles), contracts expiring within 30 days (HR). Poll `/dashboard/metrics` alerts feed (or dedicated lightweight endpoint).
- Global search (HR only): Enter → `/employees?q=…`.

**AC-A:** every page uses PageHeader/EmptyState/badges; nav hides Payroll group for HR_MANAGER; deep-links work from smart buttons.

---

## 5. Phase B — Wire Existing Backends (4 mock pages become real, ~2 days)

These need **zero backend work** — the APIs exist and are smoke-tested.

### B1. Salary Structures + Rules (replaces `SalaryConfigPage.jsx` mock)
**Backend (exists):** `GET/POST /salary-structures`, `GET/PATCH/DELETE /:id`, `PUT /:id/rules` (validates via engine), roles: read = HR_PAYROLL_USER+, write = HR_PAYROLL_MANAGER+.

Split into two views (reference has separate nav items):
- **StructuresView** (`features/payroll-config/pages/StructuresPage.jsx`): card grid — name, mono code, Active pill, edit (gated), stat tiles (rule count, assigned-employee count), ordered rule list (index, code, name, CategoryBadge). New/Edit dialog: name, code (auto-uppercase), active toggle, **rule membership editor** — add/remove rules + drag-reorder that renumbers `sequence` (10/20/30…) and persists the whole set via `PUT /:id/rules`. Save disabled when name empty or 0 rules.
- **RulesView** (`RulesPage.jsx`): table sorted by sequence — Seq | Rule (click to edit) | Code | Category | Computation | Expression (`₹fixed` / `20% × BASIC` / formula string) | Active switch (inline toggle → PUT rules). Inactive rows 50% opacity.
- **RuleFormDialog**: name; code (auto-uppercase, **uniqueness check** — red border "Code already used — it becomes a formula variable"); category select; sequence (hint: "Lower runs first. Dependents (e.g. PF on GROSS) need higher values."); computation type with conditional fields — fixed → amount; percentage → percentage + base select (earlier rule codes + inputs); formula → mono input with **live validation** calling `POST /payslips/preview`-style dry-run OR port the engine's `validateRules` via a new lightweight endpoint `POST /salary-structures/validate-rules` (recommended — backend already exports it). Live feedback: "✓ Valid — sample result ₹1,500 (sample vars = 10,000)" / "✗ {message}".
- **Test button**: "Preview payslip" → `POST /payslips/previews` with a chosen employee + period → shows the computed breakdown in a dialog (backend exists).

**AC-B1:** structures list shows live rule/employee counts; rule editor rejects duplicate codes and invalid formulas before save; HR_PAYROLL_USER gets read-only UI (write buttons hidden + API 403 toast).

### B2. Users / Admin (replaces `AdminPage.jsx` mock)
**Backend (exists):** `GET/POST /users`, `PATCH /users/:id`, `POST /users/:id/reset-password` — ADMIN only.
- `features/admin/pages/UsersPage.jsx`: table (Employee-code-linked avatar+name, email, role badge, active toggle, created) + search/role filters; **New User** dialog (email, password min 8, full name, role select, optional employee link); **Edit** dialog (name, role, active, employee link — with "already linked" 409 surfaced); **Reset password** dialog.
- Deactivate = PATCH `is_active:false` (no hard delete).

**AC-B2:** full user lifecycle works; non-admin route access redirects.

### B3. Schedules (replaces `SchedulesPage.jsx` mock)
**Backend (exists — verify contract):** `GET /schedules`, `GET /:id`, `POST /`, `PATCH /:id`, `PUT /:id/lines` (atomic replace; weekly hours computed server-side).
- Card grid: name, type, **weekly hours (from API, never typed)**, assigned-employee count, per-day list ("Mon 09:00–18:00 · 60m break").
- Form dialog: name, type select, **line editor** — per-day Switch (Mon–Sun), start/end time, break minutes, per-day computed hours, footer "Total weekly hours (auto-calculated)". Save → `PUT /:id/lines` with active lines. Disabled when 0 active days.

**AC-B3:** weekly hours always equal Σ(end−start−break) as returned by the API; editing lines replaces atomically.

### B4. Attendance (replaces `AttendancePage.jsx` mock)
**Backend (exists):** `GET /attendance` (filters employee_id/status/date range), `GET /summary`, `POST /attendance`, `PATCH /:id`, `DELETE /:id` (ADMIN/HR).
- 3-state **check-in widget** (self, when user has employee record): no record → "Check In"; open record → "Check Out"; complete → "Day complete" (disabled). Status inference (late) is backend's job.
- Filters: status select, date range, employee (when deep-linked). Table: Employee | Date | Check In | Check Out | Worked | Overtime | Status (+ "edited" chip) | Actions (corrections, HR only).
- **Correction dialog** (HR): check-in/out, status, worked hours **disabled/auto**, note → PATCH; surface `manuallyEdited` chip from API.
- Employee role: force `self` scope; hide corrections.

**AC-B4:** check-in/out round-trip; corrections set the edited flag (visible in UI); absent = 0 worked hours; employee sees only own records.

---

## 6. Phase C — Payroll Execution Core (the biggest gap, ~3–4 days)

### C1. Backend: Payruns module (prerequisite — engine already exists)
Implement `backend/src/modules/payroll-run/` (routes file is mounted; service orchestrates the existing engine). Endpoints (aligns with `04-API-CONTRACTS.md`):

| Endpoint | Role | Behavior |
|---|---|---|
| `GET /payruns/eligible-employees?structure_id=&period_start=&period_end=` | HR_PAYROLL_USER+ | ACTIVE employees with an ACTIVE contract overlapping the period (+ structure match flag) — wizard step 2 source |
| `POST /payruns` | HR_PAYROLL_USER+ | body {name, structure_id, period_start, period_end, employee_ids[]} → DRAFT payrun + payrun_employees |
| `GET /payruns` · `GET /payruns/:id` | HR_PAYROLL_USER+ | list w/ status+totals; detail incl. payslip summaries + warnings |
| `POST /payruns/:id/compute` | HR_PAYROLL_USER+ | per employee: resolve period contract (0/>1 → ERROR warning, skip), aggregate attendance + approved leave, build inputs, call `engine.computeBatch`, atomically replace payslips+lines+warnings, set status COMPUTED + totals. Warnings: NO_ACTIVE_CONTRACT, AMBIGUOUS_CONTRACT, DUPLICATE_PAYSLIP, MISSING_BANK_DETAILS, ZERO_WORKED_DAYS, RULE_ERROR |
| `POST /payruns/:id/validate` | HR_PAYROLL_MANAGER+ | guard: status COMPUTED **and zero ERROR-severity warnings** → VALIDATED (locks payslips) |
| `POST /payruns/:id/mark-paid` | HR_PAYROLL_MANAGER+ | guard: VALIDATED → PAID (terminal) |
| `POST /payruns/:id/cancel` | HR_PAYROLL_MANAGER+ | guard: DRAFT/COMPUTED only |
| `POST /payruns/:id/send-payslips` | HR_PAYROLL_MANAGER+ | V2 (pdfkit + nodemailer); V1 returns 501 with clear message |
| `GET /payslips` · `GET /payslips/:id` | HR_PAYROLL_USER+ (EMPLOYEE: own) | list (filters payrun_id/employee_id/period) + detail with ordered lines |

State machine server-side: DRAFT→COMPUTED→VALIDATED→PAID (+CANCELLED); illegal transitions → 409 STATE_ERROR.

### C2. Frontend: Payruns list + wizard (replaces `PayrollPage.jsx` mock)
- **List** (`features/payroll-run/pages/PayrunsPage.jsx`): card grid — Wallet icon tile, name, `{month range} · {structure}`, status badge, 3 stat tiles (payslips / net total / **warnings — rose when >0**); click → detail. Empty: "No payruns yet — Launch the wizard to create your first batch."
- **Wizard** (2-step dialog, payrun created only on final step):
  - **Step 1 Scope:** name (placeholder "Payroll — September 2026"), structure select (active only, option label "{name} · {n} rules"), month input; info strip "Rules that will execute, in sequence: BASIC → HRA → …" (from GET structure); Continue disabled until structure+period chosen. Changing structure/period clears selection.
  - **Step 2 Select:** fetch `GET /payruns/eligible-employees`; checkbox rows (name+code, contract reference · job, wage right-aligned); search box; Select all/Deselect all; ineligible employees hidden (they fail the API filter); empty text "No eligible employees — they need a contract valid for {month} with the selected structure."; **Create Payrun (n)** disabled at 0 → POST → navigate to detail.
- **Role gating:** New Payrun hidden without `payruns.write`.

### C3. Frontend: Payrun processing screen (`PayrunDetailPage.jsx`)
- Header: name + `{structure} · {period} · created by {user}`; action bar gated by granular perms:
  - **Compute Payslips** (label → **Recompute** when COMPUTED) — visible `compute && (DRAFT||COMPUTED)`
  - **Validate** — `validate && COMPUTED`
  - **Mark as Paid** — `pay && VALIDATED`
  - **Send Payslips** — `send && PAID` (V1: disabled with tooltip "PDF/email shipping soon")
- **State machine strip:** pills draft→computed→validated→paid; current = filled primary; passed = emerald + "✓"; future = muted. Completion markers from `computedAt/validatedAt/paidAt`.
- **4 summary tiles:** Payslips / Gross total / Net total (emerald) / Warnings (rose when >0).
- **Warnings panel** (hidden once PAID): rose card "Resolve before validating" — rows `{employee} — {message}`, click → payslip detail. **Validate button disabled while any ERROR-severity warning exists.**
- **Payslip table:** Employee (amber ⚠ when warnings) | Contract (ref or "⚠ none") | Worked Days | Gross | Deductions (rose, −prefix) | Net (semibold) | Status badge. Rows → payslip detail. Empty: "No payslips yet — Click Compute Payslips…"
- All actions = React Query mutations; API errors (409 STATE_ERROR etc.) surface as destructive toasts with the server message.

**AC-C:** wizard creates DRAFT only after selection; compute produces payslips matching preview math; validate blocked while ERROR warnings; illegal transitions show the server's 409 message; recompute replaces payslips; HR_MANAGER sees no payroll actions at all.

### C4. Frontend: Payslips list + detail (new pages)
- **List** (`PayslipsPage.jsx`): payrun filter dropdown ("All payruns" + each run); table Employee (⚠ amber when warnings) | Payrun | Period | Worked Days | Gross | Net | Status. EMPLOYEE role: title "My Payslips", self-scoped (backend enforces).
- **Detail** (`PayslipDetailPage.jsx`):
  - Identification grid (6): Employee / Structure / Payrun / Period / Worked days / Status badge.
  - Warnings card (amber) when present.
  - **Salary Computation card** (print area): Earnings table (name + mono code pill + detail sub-line e.g. "20% × BASIC" + right amount) → **Gross Salary** row (tinted) → Deductions table (rose −amounts, "No deductions" empty row) → 3 TotalTiles (Gross / −Deductions rose / **Net Salary** emerald, large). Print-only header: Pay365 brand + "Payslip — {period}" + footnote "rules executed in sequence: BASIC → HRA → …".
  - Actions: **Print / PDF** → print stylesheet + `window.print()` (V1); **Email** (enabled when PAID, V2).
- Print CSS: `@media print` hide shell/nav/actions; show print header.

**AC-C4:** breakdown lines match engine output 1:1 (code, name, category, detail); print output is a clean one-page payslip; employee role sees only own payslips.

---

## 7. Phase D — Time Off (backend + UI, ~2–3 days)

### D1. Backend: Time Off module (stub today)
Implement per `04-API-CONTRACTS.md` §time-off:
- `GET/POST /time-off/types`, `GET/PATCH/DELETE /time-off/types/:id` (R: all; W: HR_MANAGER)
- `GET/POST /time-off/allocations`, `PATCH /:id`, `POST /:id/approve|refuse` (HR_MANAGER)
- `GET /time-off/requests` (HR: all; EMPLOYEE: own), `POST /time-off/requests` (days computed server-side from date range), `PATCH /:id`, `DELETE /:id` (cancel own while TO_APPROVE)
- `POST /time-off/requests/:id/approve` — **transaction**: status→APPROVED + `allocation.taken_days += days`; insufficient remaining → 409 INSUFFICIENT_BALANCE; requester ≠ approver (403)
- `POST /time-off/requests/:id/refuse` (body: refusal_reason)
- `GET /time-off/balances?employee_id=` → per-type {allocated, taken, remaining}

### D2. Frontend: Time Off view (replaces `TimeOffPage.jsx` mock) — 4 tabs
- **Tab strip:** Calendar (default) / Requests (amber pending-count badge) / Allocations / Types. Deep-link `?tab=&employeeId=&self=1`.
- **Requests tab:** table — Employee (+reason sub-line) | Type chip | Dates | Duration "{n} day(s)" | Status badge (+ "bal. {n}d left" sub-line when pending+allocation) | Actions: **Approve** (emerald) / **Refuse** (rose) for approvers; decided rows show decided-by. Approve flow: optimistic guard client-side (fetch balance first) + server 409 INSUFFICIENT_BALANCE toast "Insufficient balance — {name} has only {n} day(s) left of {type}."; success toast "{n} day(s) deducted from {name}'s {type} balance."
- **Allocations tab:** card grid — employee + "{type} · {year}", **progress bar** (emerald ≤50%, amber >50%, rose >80%), footer "{taken} / {allocated} taken · {remaining} remaining". New/Edit allocation dialog (employee, type, validity range, days) → POST/PATCH + approve.
- **Types tab:** card per type — name, code chip, Unit, Requires allocation (Yes/No), Approval needed, Paid ("No — unpaid" rose). New/Edit dialog (HR).
- **Request dialog** (shared, prefilled from calendar): Employee (locked when scoped), Leave type ("{name} ({code})" + " — unpaid" suffix), From/To (To min=From; changing From clamps To), Reason. **Days = inclusive calendar days** (server recomputes). **Live balance strip**: "{n} day(s) requested · balance after approval: {x} / {y} remaining" — rose + "exceeds available balance" when insufficient; submit disabled.

### D3. Frontend: Time Off Calendar (week planner — the signature piece)
- **Week grid Mon–Sat** (Sunday excluded; hatched filler beyond Sat), sticky employee column (initials avatar + name, "(you)" suffix), week pager (prev/next, center label "September 1 – 6, 2026", click = jump to current week).
- **Leave cards** positioned by date range (clamped to week), **lane-packed** when overlapping; per-type icon + color (Privilege sky/Palmtree, Sick emerald/HeartPulse, Casual amber/Coffee, LWP rose/CalendarOff); pending = dashed border + clock icon; refused = 50% opacity grayscale; multi-day shows "Sep 2 – Sep 4 · 3d".
- **Leader lines**: dashed colored line + arrowhead linking card to its start date.
- **Day cells clickable** (canRequest/canApprove) → request dialog prefilled with that employee + date.
- **Card kebab**: View details; Approve/Refuse (when pending + approver) — same guard as Requests tab.
- **"See all requests" drawer**: filter pills This week / Pending (n) / All; rows with inline approve/refuse icon buttons; click → details dialog (dates, duration, balance left, reason, decided-by; footer Approve/Refuse when pending).
- Self mode (EMPLOYEE or `self=1`): only own rows, no approve UI.

**AC-D:** approve deducts balance atomically (server 409 on insufficient — UI toasts it); refused leaves balance untouched; calendar cards render multi-day ranges across the week correctly; employee role sees only own data everywhere.

---

## 8. Phase E — Insights (dashboard + reports, ~2 days)

### E1. Backend: Reports module (stub today)
`GET /dashboard/metrics?period_start=&period_end=&department_id=&employee_type=` (HR_MANAGER: HR widgets; HR_PAYROLL_USER+: full) returning one payload:
```
kpis: { total_net_paid, payslips_count, avg_net_salary, attendance_health_pct, headcount, approved_timeoff_days, pending_approvals }
mom_deltas: { net_pct, payslips_pct, avg_pct }          // vs previous month
charts: { monthly_trend: [{month, gross, net}], attendance_14d: [{date, present, late, away}], payrun_status_counts: {draft, computed, validated, paid} }
recent_payslips: [6 latest paid] · alerts: [{type, tone, text, link}] (6 catalogue types below)
overviews: { attendance: {present, late, absent, half_day, overtime_h, missing_checkouts, manual_edits}, timeoff: {requests, approved_days, pending, per_type[]} }
department_breakdown: [{department, headcount, gross, net}]
```
Alert catalogue (order): draft payrun (amber) · computed payrun (sky) · missing-bank payslips count (rose) · duplicate payslips count (rose) · contract expiring ≤30d (amber) · pending time-off approvals (sky). `payrollOnly` alerts excluded for HR_MANAGER.

### E2. Frontend: Dashboard (replaces `DashboardPage.jsx` mock)
- **Role variant:** Payroll Dashboard (subtitle "Live data across Employees, Contracts, Attendance, Time Off & Payroll") vs HR Dashboard ("…Payroll data is restricted") — payroll-only KPIs/alerts hidden for HR_MANAGER.
- **Filters:** Period (All + last 4 months), Department (HR perm only), Employee type (All/Full-time/Contract/Intern/Part-time).
- **KPI cards ×4** with MoM delta chips (TrendingUp emerald / TrendingDown rose / Minus flat; "good"/"watch" for attendance health ≥90/<90). HR variant KPIs: Headcount / Approved Time Off / Pending Approvals / Attendance Health.
- **Hero chart:** Payroll → grouped bars Gross (soft violet) vs Net (violet), monthly; HR → stacked 14-day attendance bars Present/Late/Away. Empty states per reference.
- **Recent Payslips** card (last 6 paid; row → payslip detail) + **Payrun Status donut** (paid violet / validated amber / computed sky / draft gray; center = paid share %).
- **Operational row (3 cards):** Attendance Overview (Present/Late/Absent/Half-day mini-stats + overtime hours, missing check-outs, manual corrections, leave days) · Time Off Overview (requests/approved/pending + per-type used days, "unpaid" tag) · **Operational Alerts** (scrollable, clickable, tone-colored; empty "All clear — no pending operations").

### E3. Frontend: Reports view (new `ReportsPage.jsx`)
- **Gross vs Net by Department** grouped bar chart (paid payslips only).
- **Leave Summary** table (top 8 by approved days; Approved / Pending columns; row → employee).
- **Payroll History** table — every payrun: name (+ "paid {date}"), period, payslips count, gross, net, warnings, status badge; row → payrun detail.

**AC-E:** every number traces to live records (zero mock); filters update all widgets; HR variant hides payroll data; alerts navigate to their sources.

---

## 9. Phase F — Employees & Polish (~1–2 days)

### F1. Employees upgrades (page already wired)
- **Kanban view** (default, toggle with List): 4 columns Active (emerald) / Probation (amber) / On Leave (sky) / Resigned (rose) — dot + count pill; cards = avatar, name, job title, department + active-contract wage; click → profile.
- **Smart buttons on profile** (deep-link with `?employeeId=`): Contracts / Attendance / Time Off (requests tab) / Allocations (allocations tab) — counts from existing `/employees/:id/summary` endpoint.
- **Payroll Context card** on profile: active contract ref, monthly wage, structure, valid from/until ("Open ended"), bank account (or "⚠ Missing" rose) — from `active_contract` already returned by `GET /employees/:id`.
- **Create dialog auto-contract** (reference behavior): creating an employee also creates a DRAFT contract (wage 35000 default, structure = default) so payroll selection works immediately — implement in the create flow (two API calls).
- **Mark Resigned** (soft delete) — PATCH status; rose outline button gated to HR.

### F2. Notification bell + global search (from A4) — final polish.

---

## 10. Execution Order & Dependencies

```
Phase A (shared foundations) ──────────────┐
Phase B (wire 4 existing backends) ────────┤  no backend work; unblocks 4 mock pages
Phase C (payroll core) ────────────────────┤  C1 backend → C2/C3/C4 UI (engine exists)
Phase D (time off) ────────────────────────┤  D1 backend → D2/D3 UI
Phase E (insights) ────────────────────────┤  E1 backend → E2/E3 UI (needs C for payslip data)
Phase F (employees polish + bell) ─────────┘  needs B + C + D for deep-link targets
```
- A and B can run in parallel immediately.
- C1 (payruns backend) is the critical path — start it alongside A/B.
- E depends on C (payslip/payrun data) and D (time-off data) for full metrics; a partial dashboard (attendance-only HR variant) can ship earlier.
- **Prerequisite fixes from audit v1.0 (do first, ~2 h):** SEC-02 read guards + bank masking (T14 proved it live); SLOP-06 seed `baseCode` fix (blocks T20/preview demo); README password alignment.

## 11. New/Changed File Targets

```
frontend/src/
├── lib/permissions.js                          [new — A1]
├── components/shared/                          [new — A2: 8 primitives + shared.scss]
├── app/layout/AppShell.jsx                     [rewrite — A4: groups, guard, dropdown; bell P2]
├── features/payroll-config/
│   ├── pages/StructuresPage.jsx                [new — B1]
│   ├── pages/RulesPage.jsx                     [new — B1]
│   └── components/{StructureFormDialog,RuleFormDialog}.jsx [new]
├── features/admin/pages/UsersPage.jsx          [replace mock — B2]
├── features/schedules/pages/SchedulesPage.jsx  [rewrite — B3 + components/ScheduleFormDialog]
├── features/attendance/pages/AttendancePage.jsx[rewrite — B4 + components/{CheckInWidget,CorrectionDialog}]
├── features/payroll-run/
│   ├── pages/PayrunsPage.jsx                   [rewrite — C2 + components/PayrunWizard]
│   ├── pages/PayrunDetailPage.jsx              [new — C3]
│   └── pages/PayslipsPage.jsx / PayslipDetailPage.jsx [new — C4]
├── features/timeoff/pages/TimeOffPage.jsx      [rewrite — D2 (4 tabs)]
│   └── components/{TimeOffCalendar,RequestDialog,AllocationDialog}.jsx [new — D3]
├── features/dashboard/pages/DashboardPage.jsx  [rewrite — E2]
├── features/reports/pages/ReportsPage.jsx      [new — E3]
└── features/employees/...                      [enhance — F1: Kanban, smart buttons, payroll card]
backend/src/modules/payroll-run/                [implement — C1: routes/service/controller]
backend/src/modules/timeoff/                    [implement — D1]
backend/src/modules/reports/                    [implement — E1]
```

## 12. Acceptance Criteria (suite-level)

- [ ] Zero mock data files remain referenced by any page (`employeesData.js` deleted; grep "Mock" clean)
- [ ] Every nav item renders live API data; no page 404s against implemented endpoints
- [ ] Full payrun lifecycle executable in UI: create → compute → warnings review → validate → mark paid → payslip breakdown → print
- [ ] Leave lifecycle: allocate → request → approve (balance deducted) → visible on calendar + dashboard
- [ ] RBAC: HR_MANAGER sees no payroll nav/actions; EMPLOYEE sees only self data; every hidden action also 403s at the API
- [ ] All 5 roles can log in and reach a sensible role home
- [ ] Print stylesheet produces a clean one-page payslip
- [ ] Every list page: loading skeletons, empty states, error toasts with server messages
- [ ] Smoke suite V2 passes against all newly implemented endpoints

## 13. Risks

| Risk | Mitigation |
|---|---|
| Payruns compute is the most complex backend piece (contract resolution + aggregation + engine + atomic replace) | Reference store documents exact semantics; preview service already implements 80% of the per-employee pipeline — reuse it |
| DB credentials still broken in env (smoke V1 blocker) | Must be fixed before ANY Phase C/D/E testing; audit §7 item 1 |
| Scope creep on calendar polish | Calendar is P1; ship Requests/Allocations/Types tabs first if time-boxed |
| Drag-reorder vs sequence semantics | Map drag → sequence renumber (10/20/30) + full-set PUT; no partial updates |
| Mock pages demoed by mistake before replacement | Delete mock constants in the same commit that lands each real page |
