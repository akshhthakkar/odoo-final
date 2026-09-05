# TASK-019 — Live Operations Dashboard — Detailed Plan

**Priority:** P1 · **Deps:** TASK-016 · **Contract:** `04-API-CONTRACTS.md` §dashboard, `08-ROADMAP-AND-TASKS.md` TASK-019, `02-SYSTEM-ARCHITECTURE.md` §5.4

## Goal

One endpoint returns the full live dashboard payload — KPI cards, charts, alerts,
overviews — computed from **live PostgreSQL data with zero static/mock values**.
The frontend (Recharts, teammate lane) consumes this single payload and re-fetches
when filters change, which is the "interactive filters update charts" half of the AC.

## Acceptance Criteria (from the roadmap)

1. All metrics reflect live database records, zero mock data
2. Filters (period, department) dynamically change every metric

## Endpoint (1)

```
GET /api/v1/dashboard/metrics
    ?period_start=&period_end=&department_id=&employee_type=
Auth:   Session
Role:   HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN   (EMPLOYEE -> 403)
Mount:  reports module (already mounted at /api/v1/dashboard — stub replaced, no app.js change)
Errors: 400 VALIDATION_ERROR (bad query), 401/403 (auth)
```

## Request filters (zod, all optional)

```
period_start    YYYY-MM-DD   default: today-30d
period_end      YYYY-MM-DD   default: today
department_id   uuid         — scopes department-bound metrics
employee_type   enum ContractType (FULL_TIME | PART_TIME | CONTRACT | INTERN)
```

- `employee_type` is **contract type** (the contract names the param but never defines it;
  this is the only sensible mapping — payslip -> contract.contractType)
- Default period is **dynamic** (rolling 30 days), never hardcoded numbers

## Response payload (exact shape)

```json
{
  "success": true,
  "data": {
    "kpis": {
      "total_net_paid": 55000,        // SUM(payslips.net) WHERE status = 'PAID' (contract-specified)
      "payslips_count": 4,            // COUNT(payslips.id) in the filtered set
      "avg_net_salary": 13750,        // AVG(net) in the filtered set
      "approved_timeoff_days": 2,     // SUM(time_off_requests.days) WHERE status='APPROVED' in period
      "attendance_health_pct": 75     // (PRESENT + MANUAL_EDIT) / total attendance rows in period, x100
    },
    "charts": {
      "salary_cost_by_department": [ { "department": "Engineering", "total_net": 63000 } ],
      "monthly_net_trend": [ { "month": "2026-09", "total_net": 118600 } ]
    },
    "alerts": {
      "open_warnings": [ { "code": "DUPLICATE_PAYSLIP", "severity": "WARNING",
                           "message": "…", "payrun_name": "…", "created_at": "…" } ],
      "contract_attention": [ { "employee_name": "Nikhil Jain", "employee_code": "DEMO-EMP-003" } ],
      "pending_requests": [ { "employee_name": "…", "type_name": "Casual Leave",
                              "days": 2, "date_from": "…", "date_to": "…" } ]
    },
    "overviews": {
      "attendance": {
        "present": 7, "late": 1, "absent": 2, "overtime_hours": 7,
        "missing_checkouts": 0, "manual_edits": 0, "coverage_pct": 85
      },
      "timeoff": {
        "approved_days": 2, "pending_count": 1,
        "leave_balances": [ { "type_name": "Casual Leave", "allocated": 12, "taken": 3, "remaining": 9 } ]
      }
    },
    "department_breakdown": [ { "department": "Engineering", "employee_count": 6, "total_net": 118600 } ]
  }
}
```

## Exact queries (9 total, run via Promise.all, ~10-40ms each at demo scale)

| # | Block | Query | Prisma call |
|---|-------|-------|-------------|
| 1 | kpis.total_net_paid | `SUM(net)` status='PAID', payslip period ∩ filter | `payslip.aggregate` |
| 2 | kpis.payslips_count / avg | same where-clause | `payslip.count` + `aggregate _avg` |
| 3 | kpis.approved_timeoff_days | `SUM(days)` APPROVED, request dates ∩ period | `timeOffRequest.aggregate` |
| 4 | kpis.attendance_health_pct | `groupBy(status)` counts on attendance_date ∩ period | `attendance.groupBy` |
| 5 | charts.salary_cost_by_department | payslips ⨝ employees ⨝ departments, `SUM(net) GROUP BY d.name` | `prisma.$queryRaw` |
| 6 | charts.monthly_net_trend | `SUM(net) GROUP BY DATE_TRUNC('month', period_start)` | `prisma.$queryRaw` |
| 7 | alerts.open_warnings | `payroll_warnings WHERE resolved=false`, newest 20, + payrun name | `payrollWarning.findMany` |
| 8 | alerts.contract_attention | ACTIVE employees with NO contract covering today | `employee.findMany` + relation filter |
| 9 | alerts.pending_requests | time-off requests status='TO_APPROVE', newest 10 | `timeOffRequest.findMany` |
| 10 | overviews.attendance | groupBy counts + `SUM(overtime_hours)` | `attendance.groupBy` + `aggregate` |
| 11 | overviews.timeoff | pending count + per-type balances: `SUM(allocated)-SUM(taken)` on APPROVED allocations, joined to type name | `timeOffRequest.count` + `timeOffAllocation.groupBy` + type lookup |
| 12 | department_breakdown | active employees per department + their payslip net sum | `prisma.$queryRaw` |

Where-clause construction (shared helper):

```
payslipWhere  = { periodStart <= filter.period_end, periodEnd >= filter.period_start,
                  ...(department_id ? { employee: { departmentId } } : {}),
                  ...(employee_type ? { contract: { contractType } } : {}) }
attendanceWhere = { attendanceDate: { gte: start, lte: end }, (department_id via employee) }
timeOffWhere    = { dateFrom >= start, dateTo <= end, (employee department via employee filter) }
```

All rows JOIN-safe: every payslip references a contract and employee (FK NOT NULL),
so raw SQL joins never drop rows silently.

## Numeric boundary rule (the pg-string gotcha)

`node-postgres` returns `numeric`/`bigint` aggregates as **strings**; Prisma `Decimal`
sums are Decimal objects. Every value in the payload passes through `Number(...)`
before leaving the service — no raw strings, no Decimal objects in JSON (same
F-7 money-mapper convention used since TASK-012).

## Documented metric definitions (simple + honest)

- `attendance_health_pct` = (PRESENT + MANUAL_EDIT rows) / all rows in period — LATE
  counts against health, MANUAL_EDIT (HR-corrected) counts as healthy
- `absent` = ACTIVE employees with **zero** attendance rows in the period
  (there is no stored ABSENT status in the enum)
- `coverage_pct` = (ACTIVE employees with ≥1 attendance row in period) / (all ACTIVE employees) × 100
- `contract_attention` = ACTIVE employees whose latest contract does NOT cover today
  (expired/never-had) — the list HR must act on
- `leave_balances` = APPROVED allocations only (DRAFT/TO_APPROVE allocations excluded)

## Files (3 new, 1 modified)

### 1. NEW `modules/reports/reports.schema.js` (~15 lines)

```js
export const dashboardQuerySchema = z.object({
  period_start: z.string().regex(DATE).optional(),
  period_end:   z.string().regex(DATE).optional(),
  department_id: z.string().uuid().optional(),
  employee_type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
});
```

### 2. NEW `modules/reports/reports.service.js` (~130 lines)

```js
export async function getDashboardMetrics(filters) {
  // 1. resolve period (defaults: last 30 days), build 3 where-clauses
  // 2. Promise.all([...12 query helpers])
  // 3. assemble payload, Number() every numeric
}
// one small private helper per block: getKpis(), getCharts(), getAlerts(), getOverviews(), getDepartmentBreakdown()
```

Raw SQL (queries 5, 6, 12) uses tagged-template `prisma.$queryRaw` with parameter
interpolation only — no string concatenation (injection-safe by construction).

### 3. NEW `modules/reports/reports.controller.js` (~10 lines)

One thin handler: `validateQuery` data in, envelope out.

### 4. MODIFY `modules/reports/reports.routes.js` (stub -> 10 lines)

```js
router.get('/metrics', requireRole('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
          validateQuery(dashboardQuerySchema), controller.metrics);
```

No new dependencies, no schema changes, no app.js changes.

## Simplifications (documented, demo scale)

- One endpoint, one payload — contract explicitly says "one payload"; no separate chart routes
- Alerts capped (20 warnings / 10 pending requests) — it is a dashboard, not a report export
- No caching layer — live queries only; data volume is tiny
- No pagination on charts — department/month counts are naturally small

## Verification checklist (curl + SQL spot-checks)

1. `GET /dashboard/metrics` as payroll.manager → every key present; **SQL parity**:
   compare `total_net_paid` against a direct psql `SUM(net) WHERE status='PAID'`
2. Filters change results: narrow period → totals drop; `department_id` filter →
   breakdown narrows; `employee_type=FULL_TIME` → payslip set filtered
3. Alerts: `open_warnings` lists the warnings created in TASK-013/016 payruns;
   `contract_attention` includes the contract-less demo employee
4. Empty period (no data) → zeros/nulls, not errors (zero-mock means zero data is legal)
5. Bad query (e.g. `employee_type=X`) → 400 with field errors
6. RBAC: EMPLOYEE session → 403; payroll.user session → 200
7. `npm test` → 37/37 engine tests still green (no regression)

## Explicit non-goals (deferred)

- Frontend Recharts page — teammate's lane; this task ships the payload it renders
- Caching/materialized views — unnecessary at this scale
- Export (CSV/Excel) — not in the contract for TASK-019
- Per-user dashboard scoping (HR_MANAGER sees HR widgets only) — one payload for all
  back-office roles; role-based widget hiding is a frontend concern
