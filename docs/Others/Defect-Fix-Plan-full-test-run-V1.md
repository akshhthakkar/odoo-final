# Pay365 — Defect Fix Plan (from full-test-run V1)

| | |
|---|---|
| **Date:** | 2026-09-06 |
| **Source:** | `docs/Audit/Outputs/full-test-run-V1-20260906-015514.md` (52 checks: 44 PASS / 6 FAIL) |
| **Scope:** | 9 defects + 2 gaps → exact fixes with root causes, file targets, verification steps |
| **Total estimated effort:** | ~4–6 hours (half a day) |
| **Goal:** | Demo-ready state: the spec's ₹50,000 → ₹55,000 payroll flow works end-to-end in the UI |

---

## Fix Order (dependency-driven)

| # | Defect | Sev | Effort | Why this order |
|---|---|---|---|---|
| 1 | DEF-01 Seed baseCode 'WAGE' | 🟠 | 15 min | One-line seed fix + re-seed; unblocks the entire payroll demo |
| 2 | DEF-02 Attendance routes/controller drift | 🟠 | 1–2 h | Root-caused below; also fixes DEF-04 for free |
| 3 | DEF-04 Employee self check-in | 🟠 | (included in 2) | The orphaned `checkIn`/`checkOut` controller functions already solve it |
| 4 | DEF-03 MARK_PAID doesn't cascade | 🟠 | 30 min | One missing DB update in the payrun service |
| 5 | DEF-06 Employee own payslips | 🟡 | 30 min | Role + self-scope on two GET routes |
| 6 | DEF-05 Schedule end<start accepted | 🟡 | 15 min | One zod refinement |
| 7 | DEF-07 Break not deducted from worked hours | 🔵 | 30 min | Schedule-aware worked-hours computation |
| 8 | DEF-08 DOB/IFSC validation | 🔵 | 20 min | Two zod refinements |
| 9 | DEF-09 README password mismatch | 🔵 | 5 min | One line |
| 10 | Re-test (V2) | — | 1 h | Full suite re-run |

---

## DEF-01 — Seeded structure unusable at compute time 🟠

**Confirmed live:** `POST /payslips/previews` on `STD_IN_CTC` → 422 with `Base code 'WAGE' is not defined` for BASIC/HRA/SPECIAL/CONVEYANCE, plus PF_EE cascade failure (`Base code 'BASIC' is not defined` — BASIC never resolved, so the variable was never set).

**Root cause:** `prisma/seed.js` creates the rules with `baseCode: 'WAGE'`, but the engine's variable map (`backend/src/engine/executor/index.js` → `buildVariables`) exposes `wage` and `CONTRACT_WAGE` — **not** `WAGE`. The engine looks up `variables['WAGE']` → undefined → `RuleError`.

**Fix (pick ONE — recommended: Option A):**

- **Option A (seed fix — recommended):** in `prisma/seed.js`, change `baseCode: 'WAGE'` → `baseCode: 'CONTRACT_WAGE'` on the four rules (BASIC, HRA, SPECIAL, CONVEYANCE). Then re-seed: `npm run db:seed` (upserts — but note: the structure creation is `findUnique → if (!structure) create`, so an EXISTING broken structure will NOT be updated by re-seed. Either delete the STD_IN_CTC structure rows first (rules cascade), or run a one-off update: change the seed's findUnique block to also `update: { rules: { deleteMany: {}, create: [...] } }`, or simply drop the DB volume and re-migrate+re-seed: `docker compose down -v && docker compose up -d db && npx prisma migrate deploy && npm run db:seed`.)
- **Option B (engine alias):** in `engine/executor/index.js` `buildVariables`, add `WAGE: wage` alongside `CONTRACT_WAGE`. One line, fixes every existing structure with baseCode WAGE — but widens the variable alias surface (already contains CONTRACT_WAGE/WORKED_DAYS/OVERTIME_HOURS/LEAVE_DAYS aliases, so consistent).

**Recommended: do BOTH** — Option B makes existing DBs work immediately; Option A makes the seed canonical.

**Verify:**
1. `POST /api/v1/payslips/previews` `{employee_id: <EMP-001>, period_start: 2026-09-01, period_end: 2026-09-30}` → 200.
2. With EMP-001 wage 92,000 and STD_IN_CTC: BASIC 46,000 / HRA 23,000 / SPECIAL 13,800 / CONVEYANCE 9,200 / GROSS 92,000 / PF_EE −5,520 / PT −200 / **NET 86,280**.
3. Full payrun compute on the seeded structure returns the same numbers.

---

## DEF-02 + DEF-04 — Attendance routes/controller drift + employee self check-in 🟠

**Root cause (verified in current source):** the attendance trio is mid-refactor and misaligned:

- `attendance.routes.js` POST `/` calls **`attendance.createAttendance`** — which **does not exist** in `attendance.controller.js` (exports: `listAttendance, getAttendance, checkIn, checkOut, createManualAttendance, updateAttendance`). An undefined Express handler → guaranteed 500 on every POST /attendance. (At full-test-run time the then-loaded build still had a working create whose *response path* crashed after the DB write — same drift class, which is why records persisted while the API returned 500.)
- The controller's **`checkIn` and `checkOut` functions are orphaned** — no routes call them. They already implement everything DEF-04 needs: EMPLOYEE role is force-scoped to `req.user.employee_id` (object-level authorization, client-supplied `employee_id` ignored), duplicate-day guard, late-status inference hook, worked-hours computation, P2002 race handling.

**Fix — reconcile the trio to this API shape:**

1. In `attendance.routes.js`:
   - Change POST `/` handler from `attendance.createAttendance` → `attendance.createManualAttendance` (HR manual entry; sets `source: 'HR'`, `MANUAL_EDIT`, audit-logged — the service function already does all of this).
   - ADD two self-service routes (wired to the orphaned controller functions):
     ```js
     router.post('/check-in', requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'), attendance.checkIn);
     router.post('/check-out', requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'), attendance.checkOut);
     ```
     (Place them ABOVE `GET /:id` if route-order matters — they are distinct paths so order is not critical, but grouping them first reads better.)
2. In `attendance.routes.js` POST `/` role list: ADD `'EMPLOYEE'` **only if** the create path is also meant to serve self-entry — otherwise keep manual entry HR-only and let employees use `/check-in`/`/check-out`. **Recommended:** keep POST `/` as HR-only manual entry; employees use check-in/check-out. This matches the reference implementation's 3-state widget.
3. Frontend (`AttendancePage.jsx`): point the Check In / Check Out buttons at `POST /attendance/check-in` / `POST /attendance/check-out` (no employee_id needed — the backend self-scopes EMPLOYEE; HR passes employee_id).

**Verify:**
1. As EMPLOYEE: `POST /attendance/check-in` → 201, record scoped to own employee_id, status PRESENT (or LATE per schedule).
2. Repeat same day → 409 DUPLICATE.
3. `POST /attendance/check-out` → 200, worked_hours computed.
4. As HR: `POST /attendance` (manual entry with employee_id) → 201 + audit row; no more 500.
5. As EMPLOYEE: `POST /attendance` (manual entry) → 403 (HR-only path unchanged).

---

## DEF-03 — MARK_PAID does not cascade to payslips 🟠

**Root cause:** the payrun status-change service updates the **payrun** row only. Payslip rows keep their previous status (COMPUTED), so the dashboard's `total_net_paid` (sums payslips `WHERE status = 'PAID'`) reads 0 despite a paid run.

**Fix:** in the payrun status-change service (`backend/src/modules/payroll-run/payroll-run.service.js` — the VALIDATE and MARK_PAID branches), cascade inside the same transaction:
- On **VALIDATE**: `tx.payslip.updateMany({ where: { payrunId: id }, data: { status: 'VALIDATED' } })`
- On **MARK_PAID**: `tx.payslip.updateMany({ where: { payrunId: id }, data: { status: 'PAID' } })`
- On **CANCEL** (if implemented for DRAFT/COMPUTED): `tx.payslip.updateMany({ where: { payrunId: id, status: { in: ['DRAFT', 'COMPUTED'] } }, data: { status: 'DRAFT' } })` — or delete computed payslips; pick one semantic and document it.

Check whether VALIDATE already cascades (the test only proved MARK_PAID doesn't) — if it does, only add the MARK_PAID branch.

**Verify:**
1. Run create → compute → validate → mark-paid on any payrun.
2. `GET /payslips/:id` → status PAID.
3. `GET /dashboard/metrics` → `total_net_paid` equals the payrun's net total (no longer 0).

---

## DEF-06 — Employee cannot read own payslips 🟡

**Root cause:** `payslips.routes.js` gates the whole router with payroll roles; EMPLOYEE is not included, so self-service payslips 403.

**Fix:** in `payslips.routes.js`:
- `GET /payslips` and `GET /payslips/:id`: allow `EMPLOYEE` **with forced self-scope** — in the controller, when `req.user.role === 'EMPLOYEE'`, override the filter to `employee_id = req.user.employee_id` (same pattern already used in `attendance.controller.js` listAttendance L10–12) and on `GET /:id` return 403 when `record.employee_id !== req.user.employee_id`.
- Keep write/PDF-dispatch routes payroll-only. `GET /payslips/:id/pdf`: allow the owner (EMPLOYEE whose payslip it is) — the spec requires employees to download their own payslip PDF.

**Verify:**
1. As EMPLOYEE: `GET /payslips` → 200, only own records.
2. As EMPLOYEE: `GET /payslips/{someone else's}` → 403.
3. As EMPLOYEE: `GET /payslips/{own}/pdf` → 200 application/pdf.

---

## DEF-05 — Schedule end-before-start accepted 🟡

**Root cause:** `scheduleLineSchema` (schedules module) validates ranges (`0–1440`) but not ordering.

**Fix:** in the schedules schema add a refinement (either per-line or at the lines-array level):
```js
.refine((lines) => lines.every((l) => l.end_minutes > l.start_minutes), {
  message: 'end_minutes must be greater than start_minutes',
})
```
Also enforce `break_minutes < (end_minutes − start_minutes)` while there (a 9h shift with 10h break is nonsense) — optional but cheap.

**Verify:** POST /schedules with start 1080 / end 540 → 400 VALIDATION_ERROR; the valid Mon–Fri schedule still → 201 with weekly_hours 40.

---

## DEF-07 — Worked hours do not deduct schedule break 🔵

**Root cause:** `attendance.service.js` `computeWorkedHours(checkIn, checkOut)` computes raw elapsed hours only; the schedule's `breakMinutes` is never consulted (the reference implementation deducts the first schedule line's break).

**Fix:** in `checkOut` (and `createManualAttendance`/`updateAttendance`), after loading the employee's `workingSchedule` (checkOut already includes it via the employee include), deduct the day's break:
```js
const dayLine = record.employee.workingSchedule?.lines?.find(l => l.day_of_week === (new Date(now).getDay() === 0 ? 6 : new Date(now).getDay() - 1));
const breakHours = (dayLine?.break_minutes ?? 0) / 60;
const workedHours = Math.max(0, rawHours - breakHours);
```
(Requires the schedule include to select `lines` — adjust the Prisma include.) Note: `ScheduleLine` now stores `start_minutes`/`end_minutes`/`break_minutes` (int minutes) per the current schema.

**Verify:** check-in 09:00 → check-out 18:00 with the Standard 40h schedule (60m break) → worked_hours = 8.00 (not 9.00).

---

## DEF-08 — Missing DOB / IFSC validation 🔵

**Fix:** in `employees.routes.js` schemas:
- `date_of_birth`: add `.refine((d) => new Date(d) < new Date(), 'date_of_birth must be in the past')`
- `bank_ifsc`: change to `z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').nullable().optional()`

**Verify:** POST /employees with a future DOB → 400 with field detail; IFSC `HDFC00` → 400; valid values still pass.

---

## DEF-09 — README password mismatch 🔵

**Fix:** one line in `README.md` — change the documented demo password `Password123!` → `Password@123` (matching `prisma/seed.js` L246). Do NOT change the seed (docs follow code).

**Verify:** log in via the UI with the README-documented credentials.

---

## Re-Test Plan (full-test-run V2)

Re-run the same suite after all fixes, with these additions:
1. **DEF-01 regression:** preview on STD_IN_CTC → 200 with exact math (EMP-001 wage 92,000 → NET 86,280).
2. **DEF-02/04 regression:** employee check-in/check-out round-trip; HR manual entry 201 (no 500); duplicate → 409.
3. **DEF-03 regression:** mark-paid → payslip status PAID → dashboard `total_net_paid` > 0.
4. **DEF-06 regression:** employee reads own payslips (200) and own PDF (200).
5. **DEF-05/07/08 regressions:** the three validation checks.
6. Re-run Scenario A end-to-end — must now be a **clean PASS with zero caveats** (this is the judge flow).
7. Update the defect register: DEF-01…09 → CLOSED with evidence.

## Demo-Readiness Checklist (after fixes)

- [ ] `POST /payslips/previews` on STD_IN_CTC returns 200 with correct math (SLOP-06 closed)
- [ ] Employee can check in/out from the UI without errors (DEF-02/04 closed)
- [ ] Mark Paid → payslip PAID → dashboard Total Net Paid > 0 (DEF-03 closed)
- [ ] Employee sees own payslips + can download own PDF (DEF-06 closed)
- [ ] README credentials work verbatim (DEF-09 closed)
- [ ] Scenario A runs in the UI start-to-finish without a single console error
- [ ] full-test-run V2: 0 FAIL
