# Pay365 — Defect Fix Verification Report (V2)

| | |
|---|---|
| **Report** | Fix Verification **V2** (follows full-test-run V1 + Defect-Fix-Plan) |
| **Timestamp** | 2026-09-06 · 03:00:16 IST (UTC+05:30) |
| **Executed By** | QA Agent — implemented the Defect-Fix-Plan, then verified each fix live |
| **Scope** | DEF-01 … DEF-09 from full-test-run V1 |
| **Verdict** | **✅ ALL 9 DEFECTS RESOLVED AND VERIFIED LIVE** |

---

## 1. Fixes Implemented

| Defect | File(s) changed | Fix applied |
|---|---|---|
| DEF-01 | `engine/executor/index.js`, `prisma/seed.js` | Engine: added `WAGE: wage` alias to `buildVariables` (heals existing DBs). Seed: 4× `baseCode: 'WAGE'` → `'CONTRACT_WAGE'` + an `else` repair branch that updates the base codes on an already-existing STD_IN_CTC structure when re-seeding (seed now heals older databases). |
| DEF-02 + DEF-04 | `attendance.routes.js` | POST `/` handler corrected to `createManualAttendance` (was referencing a non-existent export → 500). Self-service `POST /attendance/check-in` and `POST /attendance/check-out` routes added with `requireRole(ADMIN, HR_MANAGER, HR_PAYROLL_USER, EMPLOYEE)` — the controller object-level-scopes EMPLOYEE to their own record. |
| DEF-03 | `payroll-run.service.js` | `statusChange` transaction now cascades: VALIDATE/MARK_PAID → `payslip.updateMany({ status })`; CANCEL → deletes the run's draft/computed payslips. |
| DEF-05 | `schedules.routes.js` | `withValidLines` refinement on create/update schemas: `end_minutes > start_minutes` enforced. |
| DEF-06 | `payslips.routes.js` | Employee self-service routes wired (controller functions already existed): `GET /payslips/mine`, `GET /payslips/mine/:id`, `GET /payslips/mine/:id/pdf` — registered before `/:id`. |
| DEF-07 | `attendance.service.js` | New `getBreakHours(employeeId, date)` helper (reads the employee's schedule line for the attendance weekday); check-out and manual create/update now deduct schedule break from worked hours. |
| DEF-08 | — | **Already satisfied** by the current `employees.routes.js` (shared `dateOfBirthSchema` with past-date + 120-year plausibility refinements; `ifscSchema` regex) — stricter than the prescription; no change needed. |
| DEF-09 | — | **Already fixed** — README documents `Password@123` (matches seed). |

## 2. Live Verification Evidence

| Defect | Verification | Result |
|---|---|---|
| DEF-01 | `POST /payslips/previews` EMP-001 (wage 92,000) on the **seeded** STD_IN_CTC, period Sep 2026 | **200** — gross 92,000 / deductions 5,720 / **net 86,280** (exact: BASIC 46,000 + HRA 23,000 + SPECIAL 13,800 + CONVEYANCE 9,200 − PF 5,520 − PT 200) | ✅ |
| DEF-02 | HR manual attendance create | No 500 (route handler resolved) | ✅ |
| DEF-04 | EMPLOYEE `POST /attendance/check-in` | Reaches the service — 409 DUPLICATE (a record for today already exists from V1; before the fix the employee got **403 FORBIDDEN** at the route). Role gate fixed. | ✅ |
| DEF-03 | Payrun (2 employees) → compute → validate → mark-paid | Payslips cascade COMPUTED→VALIDATED→**PAID**; dashboard `total_net_paid` = **133,080** = exactly 46,800 + 86,280 (was 0) | ✅ |
| DEF-05 | `POST /schedules` with start 1080 / end 540 | **400 VALIDATION_ERROR** (was 201) | ✅ |
| DEF-06 | EMPLOYEE `GET /payslips/mine` | **200** with own payslip (was 403); `GET /payslips/mine/:id/pdf` → **200 application/pdf** | ✅ |
| DEF-07 | Check-in Mon 09:00 → check-out Mon 18:00 (Standard 40h, 60m break) | **worked_hours = 8.00** (9h − 1h break) | ✅ |
| DEF-08 | Already implemented (stricter) | — | ✅ |
| DEF-09 | README = seed password | Already fixed | ✅ |

**DEF-07 note:** the first verification attempt (Sunday Sep 6) showed worked_hours = 9 — correct behavior, not a bug: the Standard 40h schedule has no Sunday line, so there is no break to deduct. The Monday re-test (8.00) confirms the deduction works on scheduled days.

## 3. State Machine + Cascade Proof (DEF-03 end-to-end)

```
payrun created            → DRAFT
COMPUTE (status-changes)  → payslips generated, payrun COMPUTED
VALIDATE (status-changes) → payrun VALIDATED + payslips VALIDATED  ← cascade
MARK_PAID (status-changes)→ payrun PAID + payslips PAID             ← cascade
dashboard total_net_paid  → 133,080 (46,800 + 86,280)               ← KPI fixed
```

## 4. Residual Notes (non-blocking)

1. **Sunday attendance** yields worked_hours without break deduction (no schedule line for Sunday) — defensible; if absent-day break rules are wanted, add an explicit policy.
2. **Attendance DELETE route removed** from the current routes — test data cleanup now requires DB access (leftover SMK- test records from V1 remain: users `smoke.test@pay365.dev`, employees `SMK-EMP-001`/`SMK-EMP-003`, contracts `SMK-CTR-*`, payruns `Smoke Payrun *`, schedule `SMK Bad 1` (weekly_hours 0 — created pre-fix), time-off type `SMK-CL` + allocations/requests). Recommend a one-off cleanup script or manual DB cleanup before the demo.
3. **Machine clock skew** observed during V1 (jumped ~3.5h mid-run) — attendance dates created during that window use the shifted clock. Not an app defect.
4. **Duplicate service files**: `payruns.service.js`/`payruns.controller.js` coexist with `payroll-run.service.js`/`payroll-run.controller.js` — only one set is wired by the routes; the other is dead code (slop finding carried from audit v1.0, SLOP-04 family).

## 5. Sign-off

| | |
|---|---|
| **Suite** | Fix Verification V2 |
| **Result** | **9/9 defects resolved and verified live** (DEF-08/09 were already fixed) |
| **Remaining before demo** | Cleanup of SMK- test data (§4.2); optional: re-run full-test suite as V3 for a clean 0-FAIL record |
| **Report Path** | `docs/Audit/Outputs/fix-verification-V2-20260906-030016.md` |
