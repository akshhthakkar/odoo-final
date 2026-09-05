# Pay365 — API Architecture (REST `/api/v1`)

**Date:** 2026-09-05 · Node/Express contract for all endpoints. Auth column = minimum role (see 07-SECURITY-RBAC.md). All endpoints require auth unless marked **Public**.

---

## 1. Standards

**Auth:** Session-based stateful auth via `express-session` + `connect-pg-simple`. Session cookie (`sid`) is `httpOnly`, `Secure`, `SameSite=Lax`. Server-side session row stored in PostgreSQL `sessions` table.
**Success envelope** `{ "success": true, "data": …, "meta": { "timestamp", "request_id" } }`
**Error envelope** `{ "success": false, "error": { "code", "message", "details": [{ "field", "rule", "message" }] }, "meta": {…} }`
**Pagination** query `?page=1&limit=20&sort=field:asc|desc&filter=field:op:value`; response adds
`"pagination": { page, limit, total_items, total_pages, has_next, has_previous }`.
**Status codes:** 200 OK · 201 Created · 204 No Content · 400 VALIDATION_ERROR · 401 UNAUTHORIZED · 403 FORBIDDEN · 404 NOT_FOUND · 409 CONFLICT/STATE_ERROR · 422 UNPROCESSABLE · 429 RATE_LIMITED · 500 INTERNAL.
**Conventions:** kebab-case resource paths, plural nouns, snake_case JSON fields, `X-Request-Id` echoed on every response, zod validation on every input.
**Backend pattern:** Routes → Controllers → Services → Repositories (CSR).

---

## 2. Error Code Catalog

| Code | HTTP | Meaning |
|---|---|---|
| VALIDATION_ERROR | 400 | zod failed; details[] lists field errors |
| INVALID_CREDENTIALS | 401 | login failed (generic, no enumeration) |
| SESSION_INVALID | 401 | session missing or expired |
| FORBIDDEN | 403 | role lacks permission |
| NOT_FOUND | 404 | resource missing |
| DUPLICATE_ENTRY | 409 | duplicate clock-in or uniqueness violation (e.g. rule code) |
| STATE_ERROR | 409 | illegal state transition (e.g. validate a DRAFT payrun) |
| INVALID_STATE_TRANSITION | 409 | concurrent mutation conflict (optimistic lock) |
| CONTRACT_OVERLAP | 409 | new/updated contract overlaps an ACTIVE one |
| INSUFFICIENT_BALANCE | 409 | leave approval exceeds allocation remaining |
| RESOURCE_HAS_DEPENDENCIES | 409 | delete blocked — active employees or historical payslips linked |
| ENGINE_RULE_ERROR | 422 | calculation engine returned rule errors for all employees |

---

## 3. Endpoint Catalog

### auth
| Method & Path | Purpose | Role |
|---|---|---|
| POST /auth/login | email+password → create session, user+employee summary (same schema as GET /auth/me) | Public |
| POST /auth/refresh | no-op (sessions are long-lived; kept for potential future token issuance) | Public |
| POST /auth/logout | destroy session server-side; clear `sid` cookie (accepts expired session gracefully) | Authenticated (session cookie required) |
| GET /auth/me | current user + linked employee — **identical schema to login response** (drives UI role gating) | Authenticated |

> **Session Security:** `POST /auth/logout` verifies the refresh cookie/session regardless of session age. If a user's session has expired, the backend still accepts the logout request, invalidates any lingering session row, and clears the cookie — so clients can always cleanly log out.

### users (Admin)
| Method & Path | Purpose | Role |
|---|---|---|
| GET /users | list all users with roles | ADMIN |
| POST /users | create user + assign role | ADMIN |
| GET /users/:id | user detail | ADMIN |
| PATCH /users/:id | update role, full_name, active flag | ADMIN |
| PATCH /users/:id/deactivate | soft-deactivate — sets `active=false`; **blocked with 409 RESOURCE_HAS_DEPENDENCIES if unexecuted payroll dependencies exist** | ADMIN |

> ⚠️ Hard DELETE on users is not exposed. Deactivation is always a soft operation to prevent orphaned employee records.

### departments & jobs (Supporting Masters)
| Method & Path | Purpose | Role |
|---|---|---|
| GET /departments | list all departments | All authenticated |
| POST /departments | create department | HR_MANAGER |
| GET /departments/:id | department detail | All authenticated |
| PATCH /departments/:id | update department | HR_MANAGER |
| DELETE /departments/:id | delete (blocked if employees assigned) | HR_MANAGER |
| GET /jobs | list all job positions | All authenticated |
| POST /jobs | create job position | HR_MANAGER |
| GET /jobs/:id | job detail | All authenticated |
| PATCH /jobs/:id | update job | HR_MANAGER |
| DELETE /jobs/:id | delete (blocked if employees assigned) | HR_MANAGER |

### employees
| Method & Path | Purpose | Role |
|---|---|---|
| GET /employees | list; filters: department_id, status, employee_type, q(search); paginated | HR_MANAGER |
| POST /employees | create (auto employee_code) | HR_MANAGER |
| GET /me/employee-profile | own employee record (Employee role) — **declared above /:id to avoid route conflict** | EMPLOYEE |
| GET /employees/:id | full profile incl. department, manager, schedule, job, status + `summary` key: `{ contracts_count, attendance_this_month, pending_timeoff, allocations_count }` | HR_MANAGER |
| PATCH /employees/:id | partial update (name, phone, department, schedule, etc.) | HR_MANAGER |
| DELETE /employees/:id | soft: status=TERMINATED (not hard delete); blocked with 409 if unexecuted payroll | ADMIN |

> **Note:** `/employees/me` route removed. Self-service access uses `GET /me/employee-profile` to avoid router confusion between the literal string `"me"` and the `:id` param.
> **Note:** `GET /employees/:id/summary` removed. Smart-button counts are embedded inside the main `GET /employees/:id` response under the `summary` key to save a round-trip.

### contracts
| Method & Path | Purpose | Role |
|---|---|---|
| GET /contracts | list; filters: employee_id, status, active_only | HR_MANAGER |
| POST /contracts | create — rejects overlapping ACTIVE contract (409 CONTRACT_OVERLAP) | HR_MANAGER |
| GET /contracts/:id | contract detail | HR_MANAGER |
| PATCH /contracts/:id | partial update (wage, end_date, etc.) | HR_MANAGER |
| DELETE /contracts/:id | hard delete — DRAFT/CANCELLED only | HR_MANAGER |

### schedules
| Method & Path | Purpose | Role |
|---|---|---|
| GET /schedules | list (name, type, weekly_hours) | All authenticated |
| POST /schedules | create schedule | HR_MANAGER |
| GET /schedules/:id | detail incl. lines array | HR_MANAGER |
| PATCH /schedules/:id | partial update; if `lines[]` included in body, server replaces line set and recomputes `weekly_hours = Σ(end−start−break)` atomically in a single transaction | HR_MANAGER |

> **Note:** Separate `PUT /schedules/:id/lines` removed. Line-set replacement is handled by `PATCH /schedules/:id` with an optional `lines` array, keeping the frontend to a single call.

### attendance
| Method & Path | Purpose | Role |
|---|---|---|
| GET /me/attendance | own attendance records (Employee role) — declared above /:id routes | EMPLOYEE |
| GET /attendance | list; filters: employee_id, date range, status; paginated | HR_MANAGER |
| POST /attendance | create (self or HR); computes worked_hours; **rejects duplicate clock-in for same employee/day with 409 DUPLICATE_ENTRY** | Authenticated |
| GET /attendance/:id | detail | HR_MANAGER |
| PATCH /attendance/:id | correction — status→MANUAL_EDIT, source=HR when actor ≠ owner | HR_MANAGER for others |
| DELETE /attendance/:id | delete — HR only | HR_MANAGER |

> **Note:** `/attendance/me` removed to prevent router conflict. Self-service uses `GET /me/attendance`.

### time off
| Method & Path | Purpose | Role |
|---|---|---|
| GET /time-off-types | list leave policy types | All authenticated |
| POST /time-off-types | create leave type | HR_MANAGER |
| GET /time-off-types/:id | detail | All authenticated |
| PATCH /time-off-types/:id | update leave type | HR_MANAGER |
| DELETE /time-off-types/:id | delete | HR_MANAGER |
| GET /time-off-allocations | list w/ remaining, filters employee_id/type_id/status; **if role=EMPLOYEE, backend force-appends `WHERE employee_id = session.employee_id`** | HR_MANAGER (Employee: own) |
| POST /time-off-allocations | create allocation | HR_MANAGER |
| PATCH /time-off-allocations/:id | update allocation (days, validity window) | HR_MANAGER |
| POST /time-off-allocations/:id/status-changes | body: `{ "action": "APPROVE" \| "REJECT", "reason": "…" }` — replaces /approve + /refuse | HR_MANAGER |
| GET /employees/:id/time-off-balances | per-type allocated/taken/remaining for a specific employee; if role=EMPLOYEE, backend validates `:id` matches session | Employee(own)/HR_MANAGER |
| GET /time-off-requests | list (employee, type, dates, duration, status); **if role=EMPLOYEE, backend force-appends tenant filter** | HR_MANAGER (Employee: own) |
| POST /time-off-requests | create own (or HR on behalf); days computed by service | Authenticated |
| GET /time-off-requests/:id | detail | per above |
| PATCH /time-off-requests/:id | update dates/notes (TO_APPROVE status only) | per above |
| DELETE /time-off-requests/:id | **soft-delete: sets status=CANCELLED** (not hard delete); 409 if already APPROVED or REJECTED | Owner (TO_APPROVE only) |
| POST /time-off-requests/:id/status-changes | body: `{ "action": "APPROVE" \| "REJECT", "reason": "…" }`; deducts balance on APPROVE (409 INSUFFICIENT_BALANCE); 403 if requester=approver | HR_MANAGER, ≠ requester |

### salary config
| Method & Path | Purpose | Role |
|---|---|---|
| GET /salary-structures | list; shows rule_count, employee_count, active | HR_PAYROLL_USER |
| POST /salary-structures | create structure | HR_PAYROLL_MANAGER |
| GET /salary-structures/:id | structure metadata **+ nested `rules[]` array sorted by sequence** (eliminates need for separate GET /salary-rules) | HR_PAYROLL_USER |
| PATCH /salary-structures/:id | partial update (name, active flag, description); if `employee_count > 0` or historical payslips exist, DELETE is blocked — use PATCH to deactivate | HR_PAYROLL_MANAGER |
| DELETE /salary-structures/:id | hard delete; **409 RESOURCE_HAS_DEPENDENCIES if employee_count > 0 or historical payslips linked** | HR_PAYROLL_MANAGER |
| PUT /salary-structures/:id/rules | **KEEP PUT** — atomic full replacement of the ordered rule set in a single transaction; validates unique codes/sequences, formula syntax | HR_PAYROLL_MANAGER |

> **Note:** `GET /salary-rules?structure_id=` removed. Rules are embedded in `GET /salary-structures/:id` response under `rules[]`.

### payruns & payslips
| Method & Path | Purpose | Role |
|---|---|---|
| GET /payruns/eligibility-checks?structure_id=&period_start=&period_end= | wizard Step 2: ACTIVE employees + eligibility flags (active contract for period, structure match) | HR_PAYROLL_USER |
| POST /payruns | body: `{ name, structure_id, period_start, period_end, employee_ids[] }` → creates DRAFT run + selections | HR_PAYROLL_USER |
| GET /payruns | list w/ status, period, totals | HR_PAYROLL_USER |
| GET /payruns/:id | payrun master metadata summary (status, periods, total aggregates only — no nested payslip list) | HR_PAYROLL_USER |
| POST /payruns/:id/status-changes | body: `{ "action": "COMPUTE" \| "VALIDATE" \| "MARK_PAID" \| "CANCEL" }`; 409 INVALID_STATE_TRANSITION if concurrent mutation | HR_PAYROLL_USER (COMPUTE) / HR_PAYROLL_MANAGER (VALIDATE, MARK_PAID, CANCEL) |
| POST /payruns/:id/dispatches | body: `{ "channel": "EMAIL" }` — bulk push PDF payslips; returns per-payslip result summary | HR_PAYROLL_MANAGER |
| GET /payslips | back-office list; filters: payrun_id, employee_id, period, status | HR_PAYROLL_USER |
| GET /payslips/:id | specific payslip detail + ordered lines (earnings → deductions → subtotals) | HR_PAYROLL_USER |
| POST /payslips/previews | dry-run: engine compute for one employee+period, NOT persisted (config screen testing) | HR_PAYROLL_USER |
| GET /me/payslips | self-service: own payslip history | EMPLOYEE |
| GET /me/payslips/:id | self-service: own payslip detail | EMPLOYEE |
| GET /me/payslips/:id/pdf | self-service: own payslip PDF stream | EMPLOYEE |
| GET /payslips/:id/pdf | back-office: payslip PDF stream | HR_PAYROLL_USER |

> **Concurrency Guard:** `POST /payruns/:id/status-changes` checks the current state inside an isolated DB transaction. If state has already changed between client load and execution, it returns **409 INVALID_STATE_TRANSITION** to prevent double-validate or double-pay.

### dashboard (reports)
| Method & Path | Purpose | Role |
|---|---|---|
| GET /dashboard/metrics?period_start=&period_end=&department_id=&employee_type= | one payload: KPIs `{total_net_paid, payslips_count, avg_net_salary, approved_timeoff_days, attendance_health_pct}`, charts `{salary_cost_by_department[], monthly_net_trend[]}`, alerts `{open_warnings[], contract_attention[], pending_requests}`, overviews `{attendance:{present,late,absent,overtime,missing_checkouts,manual_edits,coverage_pct}, timeoff:{approved_days,pending_requests,leave_balances[]}}`, `department_breakdown[]` | HR_MANAGER (HR widgets), HR_PAYROLL_USER+ |

---

## 4. Detailed Contracts (critical endpoints)

### POST /api/v1/auth/login
```
Body: { "email", "password" } — zod: email format, password min 8
200: {
  "data": {
    "user": { "id", "email", "full_name", "role", "employee_id" },
    "employee": { "id", "employee_code", "department_id", "job_id" } | null
  }
}
+ Set-Cookie: sid (httpOnly, Secure, SameSite=Lax, Path=/)
Errors: 401 INVALID_CREDENTIALS · 429 RATE_LIMITED
Note: response schema is IDENTICAL to GET /auth/me to ensure frontend state normalization.
```

### GET /api/v1/auth/me
```
200: {
  "data": {
    "user": { "id", "email", "full_name", "role", "employee_id" },
    "employee": { "id", "employee_code", "department_id", "job_id" } | null
  }
}
Note: IDENTICAL schema to POST /auth/login for consistent frontend store hydration.
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

### POST /api/v1/payruns/:id/status-changes (COMPUTE action)
```
Auth: Session; Role: HR_PAYROLL_USER · Timeout: 60 s
Body: { "action": "COMPUTE" }
Path: id (uuid)
Response 200:
{ "success": true, "data": {
    "payrun": { "id","status":"COMPUTED","total_gross","total_deductions","total_net" },
    "payslips": [ { "id","employee_id","employee_name","gross","deductions","net",
                    "status":"COMPUTED","worked_days",
                    "lines":[{"code","name","category","sequence","amount"}] } ],
    "warnings": [ { "payslip_id|null","code","severity","message" } ]
} }
Errors: 409 STATE_ERROR (status VALIDATED/PAID) · 409 INVALID_STATE_TRANSITION (concurrent) · 422 ENGINE_RULE_ERROR
Business rules: recompute allowed only in DRAFT/COMPUTED (replaces payslips+warnings atomically);
employees with NO_ACTIVE_CONTRACT / AMBIGUOUS_CONTRACT get ERROR warnings and no payslip;
duplicate-payslip (overlapping period, any non-cancelled run) → WARNING DUPLICATE_PAYSLIP.
```

### POST /api/v1/time-off-requests/:id/status-changes (APPROVE action)
```
Auth: Session; Role: HR_MANAGER (and requester ≠ approver, else 403)
Body: { "action": "APPROVE" }
Response 200: { "data": { "request": {...status:"APPROVED", approver_id, decided_at},
                          "allocation": { "allocated_days","taken_days","remaining" } | null } }
Errors: 409 STATE_ERROR (not TO_APPROVE) · 409 INSUFFICIENT_BALANCE · 403 FORBIDDEN
```

---

## 5. Rate Limiting Policy

- `POST /auth/login`: 5 req / 15 min / IP → 429.
- Global: 300 req / min / IP → 429.
- `POST /payruns/:id/status-changes` (COMPUTE) + `POST /payruns/:id/dispatches`: 6 concurrent max (in-process semaphore); 429 if exceeded.

