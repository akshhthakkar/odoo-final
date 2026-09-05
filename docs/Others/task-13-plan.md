# TASK-013 — Payrun Wizard & Orchestration (Plan)

## Goal
Use the engine (TASK-012) to run a real payrun:
create DRAFT payrun → COMPUTE (payslips + warnings) → VALIDATE → MARK_PAID → CANCEL

## Endpoints (4)

| # | Endpoint                          | What it does                                  | Role              |
|---|-----------------------------------|-----------------------------------------------|-------------------|
| 1 | GET  /payruns/eligibility-checks  | Wizard step 2: employees + eligibility flags  | HR_PAYROLL_USER+  |
| 2 | POST /payruns                     | Create DRAFT payrun + employee selections     | HR_PAYROLL_USER+  |
| 3 | GET  /payruns, GET /payruns/:id   | List + detail (totals only, no payslips)      | HR_PAYROLL_USER+  |
| 4 | POST /payruns/:id/status-changes  | action: COMPUTE/VALIDATE/MARK_PAID/CANCEL     | see state table   |

## State Machine

| Action    | From                     | To        | Role        |
|-----------|--------------------------|-----------|-------------|
| COMPUTE   | DRAFT or COMPUTED        | COMPUTED  | USER+       |
| VALIDATE  | COMPUTED                 | VALIDATED | MANAGER+    |
| MARK_PAID | VALIDATED                | PAID      | MANAGER+    |
| CANCEL    | DRAFT/COMPUTED/VALIDATED | CANCELLED | MANAGER+    |

Wrong transition -> 409 STATE_ERROR.
State check + status update happen inside ONE transaction -> concurrent calls get 409.

## Files (5 new, 0 modified)

1. payroll-run/schemas.js            -> 2 zod schemas (createPayrun, statusChange)
2. payroll-run/orchestrator.js       -> CONTRACT + AGGREGATE + ENGINE + SAVE (the AC core)
3. payroll-run/payroll-run.service.js-> CRUD + state machine
4. payroll-run/payroll-run.controller.js -> thin HTTP layer
5. payroll-run/payroll-run.routes.js -> routes + roles (replaces empty stub)

app.js already mounts /api/v1/payruns -> no changes needed there.

## Orchestrator (AC core) - 4 simple steps, per employee

1. CONTRACT: find ACTIVE contract covering period.
   none -> warning NO_ACTIVE_CONTRACT (ERROR), skip employee (no payslip)
2. AGGREGATE: 2 prisma aggregate calls
   attendance -> worked_days (count), worked_hours, overtime_hours (sums)
   timeoff    -> leave_days (sum of APPROVED days in period)
3. ENGINE: buildVariables(inputs) + computeBatch(rules, employees)  <- pure, no DB
4. SAVE: payslips + payslip_lines + warnings in ONE transaction.
   Recompute (DRAFT/COMPUTED) deletes old payslips/warnings first.

## Warnings (simple)

- NO_ACTIVE_CONTRACT   ERROR   employee skipped
- DUPLICATE_PAYSLIP    WARNING overlapping period exists in a non-cancelled run (ADR-008)
- AMBIGUOUS_CONTRACT   ERROR   theoretically impossible (DB exclusion constraint) - logged only

## Simplifications (documented, OK for demo scale)

- eligibility flags = has_active_contract + structure_match only
- no semaphore; tx state-guard already prevents double compute
- payslip.employee_name joined once via simple fetch (no fancy serializer)

## Verification (curl, same as TASK-012)

1. POST /salary-structures + PUT rules         (STD_INR already exists)
2. Seed 2 demo employees + contracts (tagged DEMO)
3. GET  /payruns/eligibility-checks            -> flags correct
4. POST /payruns                               -> 201 DRAFT
5. POST /payruns/:id/status-changes COMPUTE    -> gross 63000 / net 55000 (matches engine example)
6. VALIDATE without COMPUTE -> 409; double COMPUTE in parallel -> one wins, one 409
7. employee without contract -> ERROR warning, no payslip
