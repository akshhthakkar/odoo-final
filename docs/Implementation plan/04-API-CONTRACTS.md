# PeoplePay360 — API Architecture (REST `/api/v1`)

**Date:** 2026-09-05 · Node/Express contract for all endpoints. Auth column = minimum role (see 07-SECURITY-RBAC.md). All endpoints require auth unless marked **Public**.

---

## 1. Standards

**Success envelope** `{ "success": true, "data": …, "meta": { "timestamp", "request_id" } }`
**Error envelope** `{ "success": false, "error": { "code", "message", "details": [{ "field", "rule", "message" }] }, "meta": {…} }`
**Pagination** query `?page=1&limit=20&sort=field:asc|desc&filter=field:op:value`; response adds
`"pagination": { page, limit, total_items, total_pages, has_next, has_previous }`.
**Status codes:** 200 OK · 201 Created · 204 No Content · 400 VALIDATION_ERROR · 401 UNAUTHORIZED · 403 FORBIDDEN · 404 NOT_FOUND · 409 CONFLICT/STATE_ERROR · 422 UNPROCESSABLE · 429 RATE_LIMITED · 500 INTERNAL · 503 ENGINE_UNAVAILABLE.
**Conventions:** kebab-case resource paths, plural nouns, snake_case JSON fields, `X-Request-Id` echoed on every response, zod validation on every input.

## 2. Error Code Catalog

| Code | HTTP | Meaning |
|---|---|---|
| VALIDATION_ERROR | 400 | zod failed; details[] lists field errors |
| INVALID_CREDENTIALS | 401 | login failed (generic, no enumeration) |
| TOKEN_EXPIRED / TOKEN_INVALID | 401 | auth header problems |
| FORBIDDEN | 403 | role lacks permission |
| NOT_FOUND | 404 | resource missing |
| STATE_ERROR | 409 | illegal state transition (e.g. validate a DRAFT payrun) |
| CONTRACT_OVERLAP | 409 | new/updated contract overlaps an ACTIVE one |
| INSUFFICIENT_BALANCE | 409 | leave approval exceeds allocation remaining |
| DUPLICATE | 409 | uniqueness violation (e.g. rule code) |
| ENGINE_UNAVAILABLE | 503 | Python engine down/timeout |
| ENGINE_RULE_ERROR | 422 | engine returned rule errors for all employees |

## 3. Endpoint Catalog

### auth
| Method & Path | Purpose | Role |
|---|---|---|
| POST /auth/login | email+password → access token, set refresh cookie, user+employee summary | Public |
| POST /auth/refresh | rotate refresh, new access token | Public (cookie) |
| POST /auth/logout | revoke session, clear cookie | Authenticated |
| GET /auth/me | current user + linked employee (drives UI role gating) | Authenticated |

### users (Admin)
| POST /users · GET /users · GET/PUT/DELETE /users/:id | user CRUD + role assignment, deactivate | ADMIN |

### employees
| Method & Path | Purpose | Role |
|---|---|---|
| GET /employees | list, filters: department_id, status, employee_type, q(search); paginated | HR_MANAGER |
| POST /employees | create (auto employee_code) | HR_MANAGER |
| GET /employees/:id | full profile incl. department, manager, schedule, job, status | HR_MANAGER |
| PUT /employees/:id | update | HR_MANAGER |
| DELETE /employees/:id | soft: status=TERMINATED (not hard delete) | ADMIN |
| GET /employees/me | own record (Employee role) | EMPLOYEE |
| GET /employees/:id/summary | smart-button counts: contracts, attendance (this month), time off (pending), allocations | HR_MANAGER |

### supporting masters
| Method & Path | Purpose | Role |
|---|---|---|
| /departments CRUD · /jobs CRUD | masters | R: all · W: HR_MANAGER |

### contracts
| Method & Path | Purpose | Role |
|---|---|---|
| GET /contracts | list; filters: employee_id, status, active_only | HR_MANAGER |
| POST /contracts | create — rejects overlapping ACTIVE contract (409 CONTRACT_OVERLAP) | HR_MANAGER |
| GET/PUT /contracts/:id · DELETE /contracts/:id (DRAFT/CANCELLED only) | detail/update/delete | HR_MANAGER |

### schedules
| Method & Path | Purpose | Role |
|---|---|---|
| GET /schedules · POST /schedules | list (name, type, weekly_hours) / create | R: all · W: HR_MANAGER |
| GET/PUT /schedules/:id | detail incl. lines; PUT recomputes weekly_hours server-side from lines | HR_MANAGER |
| PUT /schedules/:id/lines | replace line set; weekly_hours = Σ(end−start−break) | HR_MANAGER |

### attendance
| Method & Path | Purpose | Role |
|---|---|---|
| GET /attendance | list; filters: employee_id, date range, status; paginated | HR_MANAGER (Employee: own via /attendance/me) |
| POST /attendance | create (self or HR); computes worked_hours; one per employee/day | Authenticated |
| PUT /attendance/:id | correction — status→MANUAL_EDIT, source=HR when actor ≠ owner | HR_MANAGER for others |
| GET/PUT/DELETE /attendance/:id | detail ops | per above |

### time off
| Method & Path | Purpose | Role |
|---|---|---|
| GET/POST /time-off/types · GET/PUT/DELETE /time-off/types/:id | leave policy config | R: all · W: HR_MANAGER |
| GET /time-off/allocations | list w/ remaining, filters employee_id/type_id/status | HR_MANAGER (Employee: own) |
| POST /time-off/allocations · PUT /time-off/allocations/:id | create/update | HR_MANAGER |
| POST /time-off/allocations/:id/approve · /refuse | allocation approval | HR_MANAGER |
| GET /time-off/requests | list (employee, type, dates, duration, status) | HR_MANAGER (Employee: own) |
| POST /time-off/requests | create own (or HR on behalf); days computed by service | Authenticated |
| GET/PUT /time-off/requests/:id · DELETE (cancel own, TO_APPROVE only) | detail ops | per above |
| POST /time-off/requests/:id/approve | workflow: deducts allocation (requires_allocation types); 409 INSUFFICIENT_BALANCE | HR_MANAGER, ≠ requester |
| POST /time-off/requests/:id/refuse | body: { refusal_reason } | HR_MANAGER, ≠ requester |
| GET /time-off/balances?employee_id= | per-type allocated/taken/remaining | Employee(own)/HR_MANAGER |

### salary config
| Method & Path | Purpose | Role |
|---|---|---|
| GET /salary-structures · POST · GET/PUT/DELETE /salary-structures/:id | structure CRUD; list shows rule_count, employee_count, active | R: HR_PAYROLL_USER · W: HR_PAYROLL_MANAGER |
| PUT /salary-structures/:id/rules | replace full rule set with sequences (single tx; validates unique codes/sequences, formula syntax) | HR_PAYROLL_MANAGER |
| GET /salary-rules?structure_id= | flat rule list | HR_PAYROLL_USER |

### payruns & payslips
| Method & Path | Purpose | Role |
|---|---|---|
| GET /payruns/eligible-employees?structure_id=&period_start=&period_end= | wizard Step 2: ACTIVE employees + eligibility flags (active contract for period, structure match) | HR_PAYROLL_USER |
| POST /payruns | body: { name, structure_id, period_start, period_end, employee_ids[] } → creates DRAFT run + selections | HR_PAYROLL_USER |
| GET /payruns | list w/ status, period, totals | HR_PAYROLL_USER |
| GET /payruns/:id | detail + payslip summaries + warnings | HR_PAYROLL_USER |
| POST /payruns/:id/compute | orchestrates engine; creates payslips+lines+warnings; status→COMPUTED | HR_PAYROLL_USER |
| POST /payruns/:id/validate | guard: no ERROR-severity warnings; status→VALIDATED (locks payslips) | HR_PAYROLL_MANAGER |
| POST /payruns/:id/mark-paid | guard: VALIDATED; status→PAID (archive) | HR_PAYROLL_MANAGER |
| POST /payruns/:id/cancel | guard: DRAFT/COMPUTED only | HR_PAYROLL_MANAGER |
| POST /payruns/:id/send-payslips | bulk email w/ PDF; per-payslip result summary | HR_PAYROLL_MANAGER |
| GET /payslips | list; filters: payrun_id, employee_id, period, status | HR_PAYROLL_USER |
| GET /payslips/:id | detail + ordered lines (earnings then deductions then subtotals) | HR_PAYROLL_USER (Employee: own) |
| GET /payslips/:id/pdf | PDF stream | owner or HR_PAYROLL_USER |
| POST /payslips/preview | dry-run: engine compute for one employee+period, NOT persisted (config screen testing) | HR_PAYROLL_USER |

### dashboard (reports)
| Method & Path | Purpose | Role |
|---|---|---|
| GET /dashboard/metrics?period_start=&period_end=&department_id=&employee_type= | one payload: KPIs {total_net_paid, payslips_count, avg_net_salary, approved_timeoff_days, attendance_health_pct}, charts {salary_cost_by_department[], monthly_net_trend[]}, alerts {open_warnings[], contract_attention[], pending_requests}, overviews {attendance:{present,late,absent,overtime,missing_checkouts,manual_edits,coverage_pct}, timeoff:{approved_days,pending_requests,leave_balances[]}}, department_breakdown[] | HR_MANAGER (HR widgets), HR_PAYROLL_USER+ |

## 4. Detailed Contracts (critical endpoints)

### POST /api/v1/payruns/:id/compute
```
Auth: Bearer; Role: HR_PAYROLL_USER · Timeout: 60 s
Path: id (uuid)
Response 200:
{ "success": true, "data": {
    "payrun": { "id","status":"COMPUTED","total_gross","total_deductions","total_net" },
    "payslips": [ { "id","employee_id","employee_name","gross","deductions","net",
                    "status":"COMPUTED","worked_days",
                    "lines":[{"code","name","category","sequence","amount"}] } ],
    "warnings": [ { "payslip_id|null","code","severity","message" } ]
} }
Errors: 409 STATE_ERROR (status VALIDATED/PAID) · 503 ENGINE_UNAVAILABLE · 422 ENGINE_RULE_ERROR
Business rules: recompute allowed only in DRAFT/COMPUTED (replaces payslips+warnings atomically);
employees with NO_ACTIVE_CONTRACT / AMBIGUOUS_CONTRACT get ERROR warnings and no payslip;
duplicate-payslip (overlapping period, any non-cancelled run) → WARNING DUPLICATE_PAYSLIP.
```

### POST /api/v1/time-off/requests/:id/approve
```
Auth: Bearer; Role: HR_MANAGER (and requester ≠ approver, else 403)
Response 200: { "data": { "request": {...status:"APPROVED", approver_id, decided_at},
                          "allocation": { "allocated_days","taken_days","remaining" } | null } }
Errors: 409 STATE_ERROR (not TO_APPROVE) · 409 INSUFFICIENT_BALANCE · 403 FORBIDDEN
```

### POST /api/v1/auth/login
```
Body: { "email", "password" } — zod: email format, password min 8
200: { "data": { "access_token", "expires_in": 900,
                 "user": { "id","email","full_name","role","employee_id" } } }
+ Set-Cookie: refresh_token (httpOnly, Secure, SameSite=Lax, Path=/api/v1/auth)
Errors: 401 INVALID_CREDENTIALS · 429 RATE_LIMITED (5 fails/15 min per email+IP)
```

### POST /api/v1/payruns (wizard finalize)
```
Role: HR_PAYROLL_USER
Body: { "name": string(≤140), "structure_id": uuid, "period_start": date,
        "period_end": date, "employee_ids": uuid[] (min 1) }
Validation: period_end ≥ period_start; all employees exist & ACTIVE; no duplicate ids.
201: { "data": { "id","name","status":"DRAFT","period_start","period_end","structure",
                 "employees_count" } }
409: duplicate active payrun for same structure+period is allowed but flagged as
     DUPLICATE_PAYSLIP warning at compute time (per ADR-008, not blocked here).
```

## 5. Rate Limiting Policy
- `/auth/login`: 5 req / 15 min / email+IP → 429.
- Global: 300 req / min / IP.
- `compute` / `send-payslips`: 6 concurrent max (in-process semaphore); 429 if exceeded.
