# TASK-016 — Payroll Validation, Warnings & State Machine (Plan)

## Already built & verified in TASK-013/015 (not rebuilt)
- State machine DRAFT -> COMPUTED -> VALIDATED -> PAID / CANCELLED with atomic
  conditional-update guards -> 409 STATE_ERROR on illegal transitions (tested)
- Recompute replaces payslips + warnings atomically (tested: 1 stays 1)
- Warning codes already generated + persisted:
  NO_ACTIVE_CONTRACT (ERROR), DUPLICATE_PAYSLIP (WARNING), RULE_ERROR (ERROR)
- resolved flag column exists (default false)

## What TASK-016 adds (3 gaps)

### 1. Missing warning codes in the orchestrator (payroll-run/orchestrator.js)

| Code                 | Severity | Trigger                                   | Blocks validate? |
|----------------------|----------|-------------------------------------------|------------------|
| MISSING_BANK_DETAILS | WARNING  | employee has no bank name/number/IFSC     | no               |
| ZERO_WORKED_DAYS     | WARNING  | 0 attendance rows in the period           | no               |
| AMBIGUOUS_CONTRACT   | ERROR    | >1 active contract covers the period      | yes              |

- MISSING_BANK_DETAILS + ZERO_WORKED_DAYS are PAYSLIP-level warnings
  (payslip_id filled) - collected right after each payslip row is created.
- AMBIGUOUS_CONTRACT: impossible in practice (DB exclusion constraint allows
  at most one ACTIVE contract overlap) - implemented defensively anyway
  (contract query findFirst -> findMany + count check).

### 2. ERROR-severity validation blocker (payroll-run/payroll-run.service.js)

VALIDATE action, before the state transition:

    unresolved ERROR warnings on this payrun -> 422 UNPROCESSABLE
    details = the blocking warning list

WARNINGS never block; only unresolved ERRORs do.
Unblock flow: fix the data -> re-COMPUTE (wipes + regenerates all warnings).

### 3. Nothing else
No new endpoints, no schema changes. Routes/controller untouched.

## Files (2 modified, 0 new)
- orchestrator.js          -> ~20 lines (bank check, zero-days check,
                              contract count check, payslip-linked warnings)
- payroll-run.service.js   -> ~10 lines in statusChange() (VALIDATE blocker)

## Demo data (Option B - chosen)
Add bank details to the 2 demo employees WITH contracts in seed.demo-payrun.js
so demo payslips stay clean; MISSING_BANK_DETAILS is then verified with a
bankless employee instead. Zero-worked-days is verified with an employee who
has a contract but no September attendance.

## Verification (curl, same style)

1. Compute a fresh payrun (contract employees with bank details)
   -> NO MISSING_BANK_DETAILS noise; payslips created
2. Bankless employee in a payrun -> MISSING_BANK_DETAILS warning linked
   to its payslip_id
3. Contract-but-no-attendance employee -> ZERO_WORKED_DAYS warning
4. Payrun containing the contract-less employee -> NO_ACTIVE_CONTRACT ERROR
   -> VALIDATE -> 422 with the warning in details
5. Re-COMPUTE (warnings wiped) -> VALIDATE succeeds
6. Regression: recompute-replace atomic, DUPLICATE_PAYSLIP fires,
   illegal transitions still 409
