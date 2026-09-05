# TASK-015 — Payslips Generation & Line Assembly (Plan)

## Already built by TASK-013/012 (verified, not rebuilt)
- Atomic `payslips` + `payslip_lines` creation inside the compute transaction
- Line snapshot: code, name, category, sequence, amount, rate, computation_type, rule_id
- UNIQUE(payrun_id, employee_id) + atomic replacement on recompute (delete-then-create in one tx)
- POST /payslips/previews dry-run

## What TASK-015 adds: the read side (4 endpoints)

| # | Endpoint              | What it does                                                        | Role            |
|---|-----------------------|---------------------------------------------------------------------|-----------------|
| 1 | GET /payslips         | Back-office list; filters payrun_id, employee_id, period, status    | HR_PAYROLL_USER+|
| 2 | GET /payslips/:id     | Detail + lines ordered by sequence (earnings → deductions → totals) | HR_PAYROLL_USER+|
| 3 | GET /me/payslips      | Self-service: own payslip history                                   | any logged-in   |
| 4 | GET /me/payslips/:id  | Self-service: own payslip detail                                    | any logged-in   |

PDF endpoints (/pdf) belong to TASK-017 - out of scope.
Note the mount: /me/* lives under /api/v1/me (not /api/v1/payslips/me/...).

## Files (3 new, 2 modified)

1. payroll-run/payslip.schema.js      -> 1 zod schema (list filters + page/limit)
2. payroll-run/payslip.service.js     -> listPayslips / getPayslip / listMyPayslips / getMyPayslip
3. payroll-run/payslip.controller.js  -> thin HTTP layer
4. modify payroll-run/payslips.routes.js -> add GET / + GET /:id
5. new payroll-run/me.routes.js + app.js mount -> GET /me/payslips + /me/payslips/:id

## Guards (simple)

- Session without employee link -> 404 "No employee linked to this account"
- Accessing another employee's payslip -> 404 (no existence leak)
- Decimals -> numbers at the boundary (Number(...) pattern)

## Verification (curl)

1. GET /payslips with filters (payrun_id, status, period)
2. GET /payslips/:id -> 7 lines in sequence order, rates on PERCENTAGE lines
3. SNAPSHOT AC: rename rule via PUT rules -> old payslip still shows old name;
   recompute -> new name appears (atomic replace)
4. GET /me/payslips -> only own payslips; other employee's payslip -> 404
5. RBAC: EMPLOYEE gets 403 on GET /payslips
