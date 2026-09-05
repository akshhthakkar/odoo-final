# Pay365 — Conformance Remediation Plan (Spec-Conformance Report V1)

**Date:** 2026-09-06
**Source:** `docs/Audit/Outputs/spec-conformance-report-V1-20260906-032021.md` (defects NC-01…NC-12)
**Goal:** Close every conformance gap → full spec conformance (B7 payslip view, Reports UI, smart buttons, exception statuses) + zero live bugs.
**Total effort:** ~3–4 days across 4 phases.
**Executor:** implementation agent. Every item has exact file targets, verified current-state notes, and acceptance criteria.

---

## Phase 1 — Hotfixes (~1 hour, do first)

### FIX-1 · NC-01 — Attendance audit crash (live 500)
**Root cause (verified):** `attendance.service.js` L269 and L319 call `writeAudit({ actorId, action, … })` with ONE argument, but the helper signature is `writeAudit(tx, { actorId, action, entity, entityId, payload })` (`shared/audit.js`). The options object lands in the `tx` parameter; destructuring from `undefined` throws → every HR manual attendance create/edit returns **500 after the row commits, and no audit row is written**.

**Fix:** in `attendance.service.js`, change both calls (in `createManualAttendance` and `updateAttendance`) from:
```js
await writeAudit({ actorId: data.actorId, action: '…', … });
```
to:
```js
await writeAudit(prisma, { actorId: data.actorId, action: '…', … });
```
(`prisma` is already imported at the top of the file.)

**AC:** HR `POST /attendance` and `PATCH /attendance/:id` → 201/200 (no 500); an `audit_logs` row with action `ATTENDANCE_MANUAL_CREATED` / `ATTENDANCE_MANUAL_EDITED` exists.

### FIX-2 · NC-02 — EmptyState crash + silent text loss
**Root cause (verified):** `components/ui/EmptyState.jsx` accepts `title, hint, icon, action (ReactNode), actionLabel, onAction` — but **not** `description`. Three pages pass `description="…"` (silently dropped) and `action={{ label, onClick }}` (an object rendered as a React child → "Objects are not valid as a React child" crash whenever the empty state renders).

**Fix (single-point — extend the component, all call sites heal):** in `EmptyState.jsx`:
1. Add `description` to the prop list; render it as a second paragraph under `hint` (same styling class).
2. Normalize the action: before the `action ? …` branch, add:
```js
const normalizedAction =
  action && !React.isValidElement(action) && typeof action === 'object'
    ? null
    : action;
const objectAction = action && !normalizedAction ? action : null;
```
Then render `normalizedAction` in the existing `action` slot, and for `objectAction` render a styled button using `objectAction.label` with `onClick={objectAction.onClick}` (same styling as the `actionLabel` button — extract the button into a small local render so both paths share it).

**AC:** PayrunsPage / SalaryConfigPage / DashboardPage empty states render their description text and a working action button; no React child crash on a fresh database.

### FIX-3 · NC-11 — users `is_active` filter silently ineffective
**Root cause (verified):** `users.routes.js` listUsersQuerySchema declares `is_active: z.enum(['true','false']).optional()` (a string), but `users.service.js` listUsers checks `typeof is_active === 'boolean'` — never true, filter never applies.

**Fix:** in `users.routes.js`, change the schema field to:
```js
is_active: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
```
(`validateQuery` writes the transformed value into `req.validatedQuery`, which the controller passes to the service — no service change needed.)

**AC:** `GET /users?is_active=false` returns only deactivated users.

### FIX-4 · NC-10 (partial) — dead links + dead files
1. `DashboardPage.jsx` — replace the three `navigate('/payroll')` calls (L1046, 1077, 1129) with `navigate('/payruns')`.
2. Delete `backend/src/modules/payroll-run/payruns.service.js` and `payruns.controller.js` (verified dead: nothing imports the controller; the service instantiates its own PrismaClient).
3. Keep `me.routes.js` (mounted, harmless duplicate surface) — fold later if desired.

**AC:** no references to `/payroll` remain in the frontend; backend starts clean after file deletion (`npm run build`-equivalent: `node --check` on modified files + server boot).

---

## Phase 2 — UI Conformance (B7, B2, B3, B1) (~1.5 days)

### FIX-5 · NC-03 — PayslipDetailPage (spec B7 — the centerpiece) 
**Current state:** `GET /payslips/:id` returns everything needed — identity refs (employee/structure/payrun via the detail include), period, worked_days, status, gross/deductions/net, and ordered `lines[]` with `{ code, name, category, sequence, amount, rate, base_amount, computation_type }`. No view renders it.

**Build:** `frontend/src/features/payroll-run/pages/PayslipDetailPage.jsx` (+ `.scss`), route `/payslips/:id` (place BEFORE any conflicting route; register inside the payroll role group), nav entry from PayrunsPage payslip rows (rows currently have no drill-down — make the row's Employee or a new "View" action navigate here).

**View spec (top → bottom):**
1. **Header row:** back button ("← {payrun name}" via `GET /payslips/:id`'s payrun ref, else "All Payslips" → `/payruns`); right side: **Download PDF** button (`GET /payslips/:id/pdf` blob download — pattern already exists in PayrunsPage `handleDownloadPdf`) and **Print** button (`window.print()` after 150 ms).
2. **Identification grid** (6 tiles): Employee / Structure / Payrun / Period (`fmtDate(start) → fmtDate(end)`) / Worked Days / Status badge.
3. **Warnings card** (amber, only when warnings exist): bulleted `code: message` list.
4. **Salary Computation card** (the print area):
   - **Earnings table**: lines with `category ∈ [BASIC, ALLOWANCE]` — columns: Name (+ mono code pill) | Computation (for PERCENTAGE lines render `{rate}% × {base_amount}`; for FIXED render "Fixed"; FORMULA renders "Formula") | Amount (right, INR). Follow with a **Gross Salary** row (tinted background, bold) using the payslip's `gross`.
   - **Deductions table**: lines with `category ∈ [DEDUCTION, EMPLOYER_CONTRIB]` — amounts as `−₹{abs}` in rose. Empty → single muted row "No deductions".
   - **Totals row** (3 tiles): Gross / −Deductions (rose) / **Net Salary** (emerald, large).
   - Print-only header: "Pay365 — Payslip {period}" + print-only footnote: "Rules executed in sequence: {line codes joined ' → '}".
5. **Print stylesheet** (in the page SCSS): `@media print { hide app shell, header actions, warnings card; show print header; }`.

**Data notes:** amounts arrive as numbers (service converts Decimals); deduction line amounts are already negative — render `−₹{abs(amount)}`; `rate`/`base_amount` are nullable (null → omit the computation cell).

**AC:** payslip detail renders the exact rule-by-rule breakdown matching the compute output; print preview is a clean one-page payslip; PDF button downloads; employee role reaching this page via `/payslips/mine/:id` equivalent is out of scope here (mine routes already exist — optionally reuse the same component with the `/mine/:id` endpoint later).

### FIX-6 · NC-05 — Attendance corrections role-gated
**Current state:** `AttendancePage.jsx` renders "Add / Correct" (L405–409) and per-row edit buttons (L581–588) for every role; backend allows POST/PATCH only for ADMIN + HR_MANAGER (HR_PAYROLL_USER excluded per current routes).

**Fix:** read the role from the Redux auth slice (`useSelector((s) => s.auth.user?.role)`); `const canCorrect = ['ADMIN', 'HR_MANAGER'].includes(role);` — render the "Add / Correct" button and the per-row edit action only when `canCorrect`. Also hide the Actions column entirely when `!canCorrect`.

**AC:** EMPLOYEE / HR_PAYROLL_USER see no correction buttons on /attendance; ADMIN/HR_MANAGER unchanged.

### FIX-7 · NC-07 — Smart buttons on the employee profile (spec B2)
**Current state:** `EmployeeProfilePage.jsx` already fetches `GET /time-off/allocations?employee_id=` and `GET /attendance?employee_id=` (counts derivable client-side); contracts need one more fetch (`GET /contracts?employee_id=`); `GET /employees/:id/summary` does **not** exist (do NOT build it — client-side counting is zero-backend).

**Build:** a 4-button row under the profile header (grid 2×2 mobile / 4-col desktop), each button = icon + count + label, click → deep link:
| Button | Count source | Deep link |
|---|---|---|
| Contracts (`FileSignature`) | `GET /contracts?employee_id=` length | `/contracts?employee_id={id}` |
| Attendance (`CalendarClock`) | existing attendance fetch length | `/attendance?employee_id={id}` |
| Time Off (`Plane`) | existing requests fetch length (pending count as badge) | `/time-off?employee_id={id}` |
| Allocations (`Landmark`) | existing allocations fetch length | `/time-off?employee_id={id}&tab=allocations` |

**Required enablers:**
- `ContractsPage.jsx`: read `employee_id` from `useSearchParams` and pre-filter the list (it already fetches all contracts — client-side filter is fine); show a "← {employee name}" back link when scoped.
- `AttendancePage.jsx`: already supports `employee_id` param ✓ (no change).
- `TimeOffPage.jsx`: ADD `useSearchParams` support — read `employee_id` and `tab` params; scope the requests/allocations lists to that employee; default the active tab from `?tab=`; show a "← {employee name}" back link when scoped.

**AC:** each smart button shows a live count and lands on the correctly pre-filtered page; back links return to the profile.

### FIX-8 · NC-04 — Reports page + nav (spec B1/A7)
**Current state:** 4 analytics endpoints implemented + unit-tested, `format=csv` supported on all — zero UI.

**Build:** `frontend/src/features/reports/pages/ReportsPage.jsx` (+ `.scss`), route `/reports` in the payroll role group (HR_PAYROLL_USER+; HR_MANAGER excluded per matrix), nav item **"Reports"** (BarChart3 icon) in a new "Insights" nav group in AppShell.

**View spec (4 cards):**
1. **Payroll by Department** — `GET /reports/payroll-by-department` → table (Department | Employees | Gross | Deductions | Net) + **Export CSV** button (fetch with `?format=csv` → blob download, filename from Content-Disposition or `report-payroll-by-department.csv`).
2. **Payroll by Job** — `GET /reports/payroll-by-job` → same table shape + CSV.
3. **Leave Utilization** — `GET /reports/leave-utilization` → table (Type | Allocated | Taken | Utilization % with progress bar) + CSV.
4. **Attendance Exceptions** — `GET /reports/attendance-exceptions` → table (Employee | Date | Exception type | Details) + CSV.
Each card: loading skeleton, empty state, error toast. Period filters if the schema supports them (check `analytics.schema.js` — add `?period_start/period_end` passthrough if implemented).

**AC:** all 4 tables render live data; every CSV downloads and opens cleanly (headers + rows match the table); nav item visible only to payroll roles + hidden for HR_MANAGER.

### FIX-9 · NC-08 — Remove hardcoded fake-data fallbacks
1. `EmployeesPage.jsx` mapper (L101–108): wage/annualCtc → `emp.wage ? … : '—'`; phone → `emp.phone || '—'`; location → `emp.address || '—'`; hireDate → `emp.hire_date ? … : '—'`; contractType → `… || '—'`.
2. `EmployeeProfilePage.jsx` salary tab (L163–174): replace the client-side ratio computation with a real fetch — call `POST /payslips/previews` for this employee (current month) and render the returned `lines` as the salary breakdown; if the preview fails (no contract), show "No active contract — salary structure not available". Relabel the card "Salary Structure (live preview)".
3. `EmployeeProfilePage.jsx` L147: `workingSchedule` fallback string → `schedule ? schedule.name : '—'` (derive from the employee payload's working_schedule).
4. `AppShell.jsx` (L158–159): fallback name/email → `user?.full_name || '—'` / `user?.email || '—'` from the Redux slice.

**AC:** no fabricated values render anywhere; empty backend fields display "—"; the profile salary tab shows the real rule-by-rule preview or an honest empty state.

---

## Phase 3 — Exception Behavior (NC-06) (~1 day)

### FIX-10 · NC-06 — LATE inference, MISSING_CHECKOUT, overtime
**Current state (verified):** check-in always sets `PRESENT`; `MISSING_CHECKOUT` and `overtimeHours` are never written; dashboard/report columns for them always read 0.

**Fix in `attendance.service.js`:**

1. **LATE inference at check-in** (`checkIn`): after resolving `now`, load the employee's schedule line for that weekday (reuse the include pattern; add `workingSchedule: { include: { lines: true } }` to the employee fetch). Compute:
```js
const jsDay = now.getDay(); // 0 = Sun … 6 = Sat (matches day_of_week)
const dayLine = employee.workingSchedule?.lines?.find((l) => l.dayOfWeek === jsDay);
const lateThreshold = dayLine ? dayLine.start_minutes + 15 : null; // 15-min grace
const status = dayLine && (now.getUTCHours() * 60 + now.getUTCMinutes() > lateThreshold + timezoneOffsetAdjustment)
  ? 'LATE' : 'PRESENT';
```
⚠️ Timezone care: compare in IST minutes — use `shared/timezone.js` helpers or compute "minutes since midnight IST" from the timestamp (`Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })`). Add a unit test in `a16-timezone.test.js` style.
2. **Overtime at check-out** (`checkOut`): after computing `workedHours`, set `overtimeHours = max(0, workedHours − scheduledHours)` where `scheduledHours = (dayLine.end_minutes − dayLine.start_minutes − breakMinutes) / 60` (0 if no line). Persist `overtimeHours` in the update (the column exists; currently never written).
3. **MISSING_CHECKOUT on read** (`listAttendance` + `getAttendanceById` mapping): do NOT mutate stored status — compute an **effective status** in `formatAttendance`: if `checkIn && !checkOut && attendanceDate < getBusinessAttendanceDate(new Date())` → expose `status: 'MISSING_CHECKOUT'` (keep the stored status in a new `stored_status` field if the UI needs it). This makes the dashboard/report exception columns real without a cron job.

**Verify:**
- Check-in at 09:40 with a 09:00 schedule → status LATE.
- Check-in 09:00 → check-out 19:00 on an 09:00–18:00 line → worked 9.0 (after break), overtime 1.0.
- A yesterday record with check-in and no check-out → list shows MISSING_CHECKOUT; dashboard missing-checkouts count > 0; attendance-exceptions report includes it.

---

## Phase 4 — Hygiene (~0.5 day)

### FIX-11 · NC-09 — Swagger refresh (`src/docs/swagger.js`)
- Replace the stale `POST /payruns/{id}/compute` + `/validate` paths with the actual `POST /payruns/{id}/status-changes` (`{action: COMPUTE|VALIDATE|MARK_PAID|CANCEL}`) + `POST /payruns/{id}/dispatches` + `GET /payruns/eligibility-checks`.
- Add the entire `/time-off` module (types, allocations, requests, status-changes, cancel), `/time-off-requests` alias note, `/me/payslips*`, `/payslips/mine*`, `/payslips/{id}/pdf`, `POST /payslips/previews`, `/reports/*` (4 endpoints + `format=csv`), `/users` writes + reset-password, `/schedules` writes + assign-employees + delete.
- Fix `/attendance/check-in` documented response 200 → 201.

### FIX-12 · NC-10 (remainder) — dead code
- Delete `payruns.service.js` + `payruns.controller.js` (done in FIX-4 if not already).
- Remove the unused `checkInSchema`/`checkOutSchema` from `attendance.routes.js` if still unreferenced after FIX-2.

### FIX-13 · NC-12 — Test coverage for the untested list
Priority order (each: happy path + error path, Vitest + Supertest against the test DB like `integration.test.js`):
1. `schedules`: create (weekly_hours=40), end<start → 400, negative break → 400, assign-employees, delete-with-dependencies → 409.
2. `payslips`: list filters, detail lines ordered, PDF (200 + %PDF), previews (200 exact math on the repaired seed), `/mine` ownership (200 own / 404 others).
3. `dashboard/metrics`: 200 shape (kpis/charts/alerts), role gating (HR variant), filters change numbers.
4. `reports/*`: 4 endpoints 200 + `format=csv` content-type + header row correctness.
5. `employees` CRUD happy paths + status machine + validation (import the schemas — extract them from the routes file into `employees/schemas.js` first so tests import production code, fixing the a21 copy-test smell).
6. `auth/me` + `logout`.
7. Extract `calculateOverlappingLeaveDays` from `orchestrator.js` into an exported helper and make `a19` import it (fixes the copy-test smell).
Also add `vitest --coverage` config (c8) to package.json scripts.

---

## Execution Order & Estimates

| Phase | Items | Effort | Depends on |
|---|---|---|---|
| 1 Hotfixes | FIX-1, 2, 3, 4 | ~1 h | none — do first |
| 2 UI conformance | FIX-5 (B7), FIX-6, FIX-7 (B2), FIX-8 (B1/A7), FIX-9 | ~1.5 days | Phase 1 (EmptyState) |
| 3 Behavior | FIX-10 (LATE/MISSING/overtime) | ~1 day | none |
| 4 Hygiene | FIX-11, 12, 13 | ~0.5–1 day | after 2–3 |
| Verification | full-test-run V3 + spec-conformance V2 | ~1 h | all |

**Parallelization:** Phase 1 + Phase 3 are backend-only and can run concurrently with Phase 2 (frontend-only).

---

## Suite-Level Acceptance Criteria

- [ ] HR manual attendance create/edit → 2xx + audit row exists (NC-01)
- [ ] Fresh-DB empty states on Payruns/SalaryConfig/Dashboard render text + working buttons, no crash (NC-02)
- [ ] `/payslips/:id` renders a rule-by-rule breakdown page with print + PDF (NC-03 / spec B7)
- [ ] `/reports` renders 4 live tables with working CSV downloads (NC-04 / spec B1+A7)
- [ ] Attendance correction buttons hidden for non-HR roles (NC-05)
- [ ] Employee profile shows 4 count-badged smart buttons with working deep links (NC-07 / spec B2)
- [ ] Check-in 09:40 vs 09:00 schedule → LATE; missing checkout visible; overtime > 0 on long days (NC-06)
- [ ] No fabricated values render anywhere (NC-08)
- [ ] Swagger matches implemented routes; dead files deleted; is_active filter works (NC-09/10/11)
- [ ] New endpoint tests pass; coverage script exists (NC-12 / NFR-05)
- [ ] full-test-run V3: 0 FAIL, and the spec-conformance matrix shows B7 = YES, B1/B2/B3 = YES
