# TASK-020 — Advanced Reporting & Analytics Breakdown — Detailed Plan

**Priority:** P1 · **Deps:** TASK-019 · **Contract:** `08-ROADMAP-AND-TASKS.md` TASK-020 (AC)

## Goal

Exportable, live-data report views for HR and payroll analytics: payroll summaries by
department/job position, leave utilization rates, attendance exception summaries —
each with grouping (SQL GROUP BY), whitelisted sorting, and CSV export.

## Design context (documented decision)

TASK-020 has **no pre-defined endpoints** in `04-API-CONTRACTS.md` (it only specifies
`GET /dashboard/metrics` for TASK-019). The route design below is therefore ours:
a dedicated `/api/v1/reports` namespace, separate from `/dashboard` — dashboards are
"one payload" resources; reports are tabular/exportable resources. Flagged for the
team so the contract doc gets an addendum.

## Acceptance Criteria (from the roadmap)

1. Reports query live data (zero mock)
2. Grouping (SQL GROUP BY), sorting (whitelisted `sort`/`order`), CSV export (`format=csv`)

## Endpoints (4)

| # | Endpoint                                  | Rows                                                                | Default sort      |
|---|-------------------------------------------|---------------------------------------------------------------------|-------------------|
| 1 | `GET /api/v1/reports/payroll-by-department` | `{ department, employee_count, gross, deductions, net }`            | `net` desc        |
| 2 | `GET /api/v1/reports/payroll-by-job`        | `{ job, employee_count, gross, deductions, net }`                   | `net` desc        |
| 3 | `GET /api/v1/reports/leave-utilization`     | `{ type_name, allocated, taken, utilization_pct }`                  | `utilization_pct` desc |
| 4 | `GET /api/v1/reports/attendance-exceptions` | `{ employee_name, employee_code, department, late_days, missing_checkouts, manual_edits, overtime_hours }` | `late_days` desc |

```
Auth:  Session
Role:  HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN   (EMPLOYEE -> 403)
Mount: /api/v1/reports (NEW app.js line; dashboard router untouched)
```

## Shared query params (one zod schema, all optional)

```
period_start   YYYY-MM-DD          default: today-30d (dynamic)
period_end     YYYY-MM-DD          default: today
department_id  uuid                — narrows reports 1/2/4
format         enum json | csv     default json
sort           whitelisted column  per-report (below)
order          enum asc | desc     default desc (valid only with sort)
```

Sort whitelists (invalid column -> 400 VALIDATION_ERROR; injection-safe by whitelist):

```
payroll-by-department: department, employee_count, gross, deductions, net
payroll-by-job:        job, employee_count, gross, deductions, net
leave-utilization:     type_name, allocated, taken, utilization_pct
attendance-exceptions: employee_name, employee_code, department,
                       late_days, missing_checkouts, manual_edits, overtime_hours
```

JSON response shape (consistent with TASK-019):

```json
{ "success": true, "data": [ ...rows... ],
  "meta": { "report": "payroll-by-department", "period_start": "…", "period_end": "…", "rows": 4 } }
```

CSV response:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="payroll-by-department-2026-09-01_2026-09-30.csv"
<body> = header row + data rows (RFC-4180)
```

## The 4 report queries (exact SQL shapes, all `prisma.$queryRaw` tagged templates)

Shared period semantics: payslip/attendance rows overlap the period
(`period_start <= :period_end AND period_end >= :period_start` — same overlap rule
as TASK-019's filters). `department_id` narrows via the employee join.

### 1. payroll-by-department

```sql
SELECT d.name AS department,
       COUNT(DISTINCT p.employee_id)::int AS employee_count,
       SUM(p.gross)::float8 AS gross, SUM(p.deductions)::float8 AS deductions,
       SUM(p.net)::float8   AS net
FROM payslips p
JOIN employees   e ON e.id = p.employee_id
JOIN departments d ON d.id = e.department_id
WHERE p.period_end >= $start AND p.period_start <= $end
  [$dept filter]
GROUP BY d.name
ORDER BY <sort> <order>
```

All payslips (COMPUTED/VALIDATED/PAID) are included — "payroll cost" means everything
computed; PAID-only would understate cost. Documented choice; a `status` param can be
added later without breaking anything.

### 2. payroll-by-job

Identical, `JOIN jobs j ON j.id = e.job_id`, `GROUP BY j.name`. Employees without a job
fall under a literal `'Unassigned'` group (`COALESCE(j.name, 'Unassigned')`).

### 3. leave-utilization (per time-off TYPE — documented choice)

```sql
SELECT t.name AS type_name,
       SUM(a.allocated_days)::float8 AS allocated,
       SUM(a.taken_days)::float8     AS taken,
       CASE WHEN SUM(a.allocated_days) > 0
            THEN ROUND(SUM(a.taken_days) / SUM(a.allocated_days) * 100, 1)::float8
            ELSE NULL END AS utilization_pct
FROM time_off_allocations a
JOIN time_off_types t ON t.id = a.type_id
WHERE a.status = 'APPROVED'
  AND a.valid_to >= $start AND a.valid_from <= $end
GROUP BY t.name
ORDER BY <sort> <order>
```

- APPROVED allocations only (DRAFT/TO_APPROVE excluded — same rule as TASK-019 balances)
- `allocated = 0` -> `utilization_pct = null` (no divide-by-zero, no fake 0%)
- Employee-level granularity is a possible future report; per-type satisfies the AC

### 4. attendance-exceptions

"Exception" definition (documented): status in (`LATE`, `MISSING_CHECKOUT`, `MANUAL_EDIT`)
OR `overtime_hours > 0`. `ABSENT` is not stored — employees with zero attendance rows
belong to the dashboard's `contract_attention`/`absent` metric, not this row-set.

```sql
SELECT e.first_name || ' ' || e.last_name AS employee_name,
       e.employee_code,
       COALESCE(d.name, 'Unassigned') AS department,
       COUNT(*) FILTER (WHERE a.status = 'LATE')::int              AS late_days,
       COUNT(*) FILTER (WHERE a.status = 'MISSING_CHECKOUT')::int  AS missing_checkouts,
       COUNT(*) FILTER (WHERE a.status = 'MANUAL_EDIT')::int       AS manual_edits,
       SUM(a.overtime_hours)::float8                               AS overtime_hours
FROM attendance a
JOIN employees   e ON e.id = a.employee_id
LEFT JOIN departments d ON d.id = e.department_id
WHERE a.attendance_date >= $start AND a.attendance_date <= $end
  AND (a.status IN ('LATE', 'MISSING_CHECKOUT', 'MANUAL_EDIT') OR a.overtime_hours > 0)
  [$dept filter]
GROUP BY e.id, e.first_name, e.last_name, e.employee_code, d.name
ORDER BY <sort> <order>
```

## CSV export (zero dependencies — hand-rolled RFC-4180)

```js
// NEW modules/reports/csv.js
export function toCsv(columns, rows) {
  // columns: [{ key, header }]; rows: array of objects (numbers included)
  // escaping: field contains [",\n,]  -> wrap in quotes, double inner quotes
  // first line = header row; values via String(value) — numbers come out clean
}
```

Controller switch (one line per handler): `format=csv` -> `res.type('text/csv')` +
`attachment` headers + `toCsv(...)`, else JSON envelope.

## Numeric boundary rule (same as TASK-019)

`pg` returns `numeric`/`bigint`/`float8` as strings for raw SQL — every numeric field
passes through `Number(...)` in the row mappers before JSON or CSV. (`::float8` casts
in SQL already produce JS numbers for SUM aggregates; the `Number()` pass makes it
explicit and future-proof.)

## Files (5 new, 1 modified, 0 dependencies)

| File | Content |
|---|---|
| NEW `modules/reports/csv.js` | pure RFC-4180 helper (~20 lines) |
| NEW `modules/reports/csv.test.js` | Vitest: plain row, comma value, embedded quotes, newline value, numbers, empty rows |
| NEW `modules/reports/analytics.schema.js` | shared query schema + 4 sort whitelists (~40 lines) |
| NEW `modules/reports/analytics.service.js` | 4 report queries + shared where/period builder (~110 lines) |
| NEW `modules/reports/analytics.controller.js` | 4 thin handlers with json/csv switch (~50 lines) |
| NEW `modules/reports/analytics.routes.js` | 4 routes + roles + `requireUuidParam` for department_id? (it is a query param — validated by zod uuid) |
| MODIFY `app.js` | import + mount `/api/v1/reports` (2 lines) |

Note: unlike TASK-015, `department_id` is a query param, so zod's uuid check covers it;
no path-param middleware needed.

## Verification checklist

1. Each report as payroll.manager -> rows match a direct psql equivalent query (SQL parity)
2. `format=csv` -> attachment headers + parseable CSV (check a quoted field renders intact)
3. Sorting: `sort=net&order=asc` flips report 1; `sort=evil; DROP TABLE` -> 400 (whitelist)
4. Filters change results (period, department_id)
5. RBAC: EMPLOYEE -> 403; unauthenticated -> 401
6. Edge: empty period -> `"data": []` + CSV with header only (zero rows is legal, not an error)
7. Regression: `npm test` -> 37 engine + new CSV tests green

## Explicit non-goals (deferred)

- XLSX/PDF report export — CSV satisfies the AC; XLSX would need a new dependency
- Scheduled/emailed reports — TASK-018 covers email dispatch of payslips only
- Report pagination — GROUP BY outputs are naturally small (departments/jobs/types)
- Per-employee leave utilization report — per-type is the scoped version; add later
- Saved/custom reports builder — not in the roadmap
