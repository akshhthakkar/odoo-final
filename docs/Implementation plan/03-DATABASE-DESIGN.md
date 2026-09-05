# Pay365 — Database Design (PostgreSQL 16 + Prisma)

**Date:** 2026-09-05 · **Owner:** Architecture · **ORM:** Prisma · **Migration tool:** `prisma migrate`

---

## 1. ER Overview

```
users ──0..1──> employees (self-ref manager) ──> departments (self-ref parent)
employees ──1..*──> contracts ──> salary_structures
working_schedules ──1..*──> schedule_lines
employees ──1..*──> attendance
time_off_types ──1..*──> time_off_allocations ──> employees
time_off_types ──1..*──> time_off_requests ──> employees
salary_structures ──1..*──> salary_rules
payruns ──1..*──> payrun_employees ──> employees
payruns ──1..*──> payslips ──1..*──> payslip_lines ──> salary_rules (nullable)
payruns/payslips ──1..*──> payroll_warnings
audit_logs (standalone)
```

## 2. Enumerations

| Enum | Values |
|---|---|
| Role | EMPLOYEE, HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN |
| EmployeeStatus | ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED |
| ContractType | FULL_TIME, PART_TIME, CONTRACT, INTERN |
| ContractStatus | DRAFT, ACTIVE, EXPIRED, CANCELLED |
| ScheduleType | FULL_TIME, PART_TIME, FLEXIBLE |
| AttendanceStatus | PRESENT, LATE, MISSING_CHECKOUT, MANUAL_EDIT |
| AttendanceSource | SELF, HR |
| TimeOffUnit | DAYS, HOURS |
| TimeOffStatus | TO_APPROVE, APPROVED, REFUSED, CANCELLED |
| AllocationStatus | DRAFT, TO_APPROVE, APPROVED, REFUSED |
| RuleCategory | BASIC, ALLOWANCE, GROSS, DEDUCTION, EMPLOYER_CONTRIB, NET |
| ComputationType | FIXED, PERCENTAGE, FORMULA |
| PayrunStatus | DRAFT, COMPUTED, VALIDATED, PAID, CANCELLED |
| PayslipStatus | DRAFT, COMPUTED, VALIDATED, PAID |
| WarningCode | NO_ACTIVE_CONTRACT, AMBIGUOUS_CONTRACT, DUPLICATE_PAYSLIP, MISSING_BANK_DETAILS, NO_SCHEDULE, ZERO_WORKED_DAYS, RULE_ERROR |
| WarningSeverity | WARNING, ERROR |
| Currency | INR (default; stored on contract/payslip) |

## 3. Entity Definitions

Conventions: all tables get `id (uuid, pk, default gen_random_uuid())`, `created_at`, `updated_at` (timestamptz) unless noted. Money = `numeric(14,2)`; rates = `numeric(9,4)`; dates = `date`; instants = `timestamptz`.

### users
| Field | Type | Constraints | Notes |
|---|---|---|---|
| email | varchar(255) | NOT NULL, UNIQUE (lowercase) | login identity |
| password_hash | varchar(100) | NOT NULL | bcrypt |
| full_name | varchar(120) | NOT NULL | |
| role | Role | NOT NULL | |
| is_active | boolean | NOT NULL default true | deactivation instead of delete |
| employee_id | uuid | NULLABLE FK → employees | link for Employee self-service |

### departments
| Field | Type | Constraints |
|---|---|---|
| name | varchar(120) | NOT NULL, UNIQUE |
| code | varchar(20) | NOT NULL, UNIQUE |
| parent_id | uuid | NULLABLE FK → departments |
| manager_employee_id | uuid | NULLABLE FK → employees |

### jobs (job positions)
| Field | Type | Constraints |
|---|---|---|
| name | varchar(120) | NOT NULL, UNIQUE |

### employees
| Field | Type | Constraints | Notes |
|---|---|---|---|
| employee_code | varchar(20) | NOT NULL, UNIQUE | e.g. EMP-0001 |
| first_name / last_name | varchar(80) | NOT NULL | |
| email | varchar(255) | NOT NULL, UNIQUE | |
| phone | varchar(20) | NULLABLE | |
| date_of_birth | date | NULLABLE | |
| gender | varchar(10) | NULLABLE | |
| address | text | NULLABLE | |
| hire_date | date | NOT NULL | |
| termination_date | date | NULLABLE | |
| status | EmployeeStatus | NOT NULL default ACTIVE | |
| department_id | uuid | NULLABLE FK → departments | |
| job_id | uuid | NULLABLE FK → jobs | |
| manager_id | uuid | NULLABLE FK → employees (self) | |
| working_schedule_id | uuid | NULLABLE FK → working_schedules | |
| bank_account_name | varchar(120) | NULLABLE | warning if missing |
| bank_account_number | varchar(34) | NULLABLE | never logged in full |
| bank_ifsc | varchar(20) | NULLABLE | |

### working_schedules
| Field | Type | Constraints | Notes |
|---|---|---|---|
| name | varchar(120) | NOT NULL, UNIQUE | |
| schedule_type | ScheduleType | NOT NULL | |
| weekly_hours | numeric(5,2) | NOT NULL | **computed** from lines by service; kept denormalized for list performance |

### schedule_lines
| Field | Type | Constraints |
|---|---|---|
| schedule_id | uuid | NOT NULL FK → working_schedules (CASCADE delete) |
| day_of_week | smallint | NOT NULL, CHECK 0–6 (Mon=0) |
| start_time | time | NOT NULL |
| end_time | time | NOT NULL |
| break_minutes | int | NOT NULL default 0, CHECK ≥ 0 |
| — | — | UNIQUE (schedule_id, day_of_week); service computes hours = end − start − break |

### contracts
| Field | Type | Constraints | Notes |
|---|---|---|---|
| employee_id | uuid | NOT NULL FK → employees | |
| reference | varchar(40) | NOT NULL | e.g. CTR-2026-001 |
| start_date | date | NOT NULL | |
| end_date | date | NULLABLE | NULL = open-ended |
| wage | numeric(14,2) | NOT NULL, CHECK > 0 | monthly gross wage |
| currency | varchar(3) | NOT NULL default 'INR' | |
| contract_type | ContractType | NOT NULL | |
| department_id | uuid | NULLABLE FK | |
| job_id | uuid | NULLABLE FK | |
| working_schedule_id | uuid | NULLABLE FK | overrides employee-level schedule |
| salary_structure_id | uuid | NULLABLE FK → salary_structures | |
| status | ContractStatus | NOT NULL | |

**Business constraints (service-enforced, tested):**
- Overlap rule: for the same employee, two contracts with status ACTIVE must not overlap in date ranges.
- end_date ≥ start_date (CHECK).
- Payroll uses the ACTIVE contract overlapping the payrun period — zero or multiple matches produce ERROR warnings (never silent picks).

### attendance
| Field | Type | Constraints | Notes |
|---|---|---|---|
| employee_id | uuid | NOT NULL FK | |
| attendance_date | date | NOT NULL | |
| check_in | timestamptz | NOT NULL | |
| check_out | timestamptz | NULLABLE | |
| worked_hours | numeric(5,2) | NULLABLE | computed by service on write |
| overtime_hours | numeric(5,2) | NOT NULL default 0 | |
| status | AttendanceStatus | NOT NULL | |
| source | AttendanceSource | NOT NULL | SELF or HR (corrections) |
| note | text | NULLABLE | reason for corrections |
| — | — | UNIQUE (employee_id, attendance_date) | one record per day |

### time_off_types
| Field | Type | Constraints |
|---|---|---|
| name | varchar(120) | NOT NULL, UNIQUE |
| code | varchar(20) | NOT NULL, UNIQUE |
| unit | TimeOffUnit | NOT NULL |
| requires_allocation | boolean | NOT NULL default true |
| allows_request | boolean | NOT NULL default true |
| color | varchar(9) | NULLABLE (hex) |
| is_active | boolean | NOT NULL default true |

### time_off_allocations
| Field | Type | Constraints | Notes |
|---|---|---|---|
| employee_id | uuid | NOT NULL FK | |
| type_id | uuid | NOT NULL FK → time_off_types | |
| valid_from / valid_to | date | NOT NULL | validity period |
| allocated_days | numeric(6,2) | NOT NULL, CHECK > 0 | (or hours per unit) |
| taken_days | numeric(6,2) | NOT NULL default 0 | incremented on request approval |
| status | AllocationStatus | NOT NULL | |
| — | — | remaining = allocated − taken (computed in service) |

### time_off_requests
| Field | Type | Constraints | Notes |
|---|---|---|---|
| employee_id | uuid | NOT NULL FK | |
| type_id | uuid | NOT NULL FK | |
| date_from / date_to | date | NOT NULL, CHECK date_to ≥ date_from | |
| days | numeric(6,2) | NOT NULL, CHECK > 0 | computed by service (calendar days minus non-working, or hours) |
| status | TimeOffStatus | NOT NULL default TO_APPROVE | |
| reason | text | NULLABLE | |
| approver_id | uuid | NULLABLE FK → users | |
| decided_at | timestamptz | NULLABLE | |
| refusal_reason | text | NULLABLE | |

### salary_structures
| Field | Type | Constraints |
|---|---|---|
| name | varchar(120) | NOT NULL, UNIQUE |
| code | varchar(20) | NOT NULL, UNIQUE |
| description | text | NULLABLE |
| is_default | boolean | NOT NULL default false |
| is_active | boolean | NOT NULL default true |

### salary_rules
| Field | Type | Constraints | Notes |
|---|---|---|---|
| structure_id | uuid | NOT NULL FK → salary_structures (CASCADE) | |
| name | varchar(120) | NOT NULL | |
| code | varchar(20) | NOT NULL | engine variable name — UNIQUE per structure |
| category | RuleCategory | NOT NULL | |
| sequence | int | NOT NULL | execution order |
| computation_type | ComputationType | NOT NULL | |
| fixed_amount | numeric(14,2) | NULLABLE | required if FIXED |
| percentage | numeric(9,4) | NULLABLE | required if PERCENTAGE |
| base_code | varchar(20) | NULLABLE | required if PERCENTAGE (e.g. BASIC, GROSS) |
| formula | text | NULLABLE | required if FORMULA (DSL, see 05 doc) |
| condition | text | NULLABLE | optional DSL gate, e.g. `worked_days > 0` |
| appears_on_payslip | boolean | NOT NULL default true | GROSS/NET subtotal lines may be display-only |
| is_active | boolean | NOT NULL default true | |
| — | — | **UNIQUE (structure_id, code)** | Deterministic execution ordering via `ORDER BY sequence ASC, id ASC`. Sequence itself does not require global database-level uniqueness. |

### payruns
| Field | Type | Constraints | Notes |
|---|---|---|---|
| name | varchar(140) | NOT NULL | e.g. "Regular Payroll — Sep 2026" |
| structure_id | uuid | NOT NULL FK | |
| period_start / period_end | date | NOT NULL, CHECK end ≥ start | |
| status | PayrunStatus | NOT NULL default DRAFT | state machine (ADR-008) |
| total_gross / total_deductions / total_net | numeric(14,2) | NULLABLE | Σ over payslips after compute |
| computed_at / validated_at / paid_at | timestamptz | NULLABLE | |
| created_by | uuid | NOT NULL FK → users | |

### payrun_employees
| Field | Type | Constraints |
|---|---|---|
| payrun_id | uuid | NOT NULL FK (CASCADE) |
| employee_id | uuid | NOT NULL FK |
| — | — | UNIQUE (payrun_id, employee_id) |

### payslips
| Field | Type | Constraints | Notes |
|---|---|---|---|
| payrun_id | uuid | NOT NULL FK | |
| employee_id | uuid | NOT NULL FK | |
| contract_id | uuid | NOT NULL FK → contracts | snapshot of the applicable contract |
| structure_id | uuid | NOT NULL FK | |
| period_start / period_end | date | NOT NULL | copied from payrun (history survives) |
| worked_days | numeric(6,2) | NOT NULL default 0 | |
| gross | numeric(14,2) | NOT NULL | |
| deductions | numeric(14,2) | NOT NULL | positive number |
| net | numeric(14,2) | NOT NULL | |
| currency | varchar(3) | NOT NULL | |
| status | PayslipStatus | NOT NULL | mirrors payrun progression |
| email_sent_at | timestamptz | NULLABLE | |
| — | — | **UNIQUE (payrun_id, employee_id)** | Exactly one payslip per employee per payrun. Recompute within the same payrun atomically deletes/replaces existing payslips in that payrun. Overlapping payslips across different payruns trigger a non-blocking `DUPLICATE_PAYSLIP` warning. |

### payslip_lines
| Field | Type | Constraints | Notes |
|---|---|---|---|
| payslip_id | uuid | NOT NULL FK (CASCADE) | |
| rule_id | uuid | NULLABLE FK → salary_rules | NULL for computed subtotal lines |
| code | varchar(20) | NOT NULL | snapshot |
| name | varchar(120) | NOT NULL | snapshot |
| category | RuleCategory | NOT NULL | |
| sequence | int | NOT NULL | display order |
| amount | numeric(14,2) | NOT NULL | negative for deductions |
| rate | numeric(9,4) | NULLABLE | for % rules (audit) |
| base_amount | numeric(14,2) | NULLABLE | what % was applied to (audit) |
| computation_type | ComputationType | NOT NULL | snapshot |

### payroll_warnings
| Field | Type | Constraints | Notes |
|---|---|---|---|
| payrun_id | uuid | NOT NULL FK (CASCADE) | |
| payslip_id | uuid | NULLABLE FK (CASCADE) | employee-level warnings |
| code | WarningCode | NOT NULL | |
| severity | WarningSeverity | NOT NULL | |
| message | text | NOT NULL | human-readable |
| resolved | boolean | NOT NULL default false | |

### audit_logs
| Field | Type | Constraints |
|---|---|---|
| actor_id | uuid | NULLABLE FK → users |
| action | varchar(60) | NOT NULL (e.g. PAYRUN_VALIDATED) |
| entity | varchar(40) | NOT NULL |
| entity_id | uuid | NULLABLE |
| payload | jsonb | NULLABLE (diff/context, PII-masked) |
| ip | inet | NULLABLE |

## 4. Relationship & Cascade Map

| Relationship | Type | On delete | Reason |
|---|---|---|---|
| employees → contracts | 1:N | RESTRICT | payroll history must survive |
| employees → attendance | 1:N | RESTRICT | historical records |
| working_schedules → schedule_lines | 1:N | CASCADE | lines are meaningless alone |
| salary_structures → salary_rules | 1:N | CASCADE | config owned by structure |
| payruns → payrun_employees | 1:N | CASCADE | selection is part of the run |
| payruns → payslips | 1:N | RESTRICT | archive integrity |
| payslips → payslip_lines | 1:N | CASCADE | lines owned by payslip |
| payruns/payslips → payroll_warnings | 1:N | CASCADE | warnings live with their run |
| time_off_types → requests/allocations | 1:N | RESTRICT | leave history |
| users → audit_logs | 1:N | SET NULL | keep logs after user deletion |

## 5. Index Strategy

| Table | Index | Type | Serves |
|---|---|---|---|
| employees | (department_id), (status), (manager_id) | btree | filtered lists, smart-button counts |
| employees | lower(email) | unique | login identity |
| contracts | (employee_id, status, start_date) | btree | period-contract selection (hot path) |
| contracts | (employee_id) WHERE status='ACTIVE' | partial | active-contract uniqueness check |
| attendance | (employee_id, attendance_date) | unique btree | daily record + period aggregation |
| attendance | (attendance_date) | btree | dashboard date-range scans |
| time_off_requests | (employee_id, status), (type_id), (date_from, date_to) | btree | balance math + dashboard |
| time_off_allocations | (employee_id, type_id, status) | btree | balance lookup |
| salary_rules | (structure_id, sequence) | unique btree | ordered engine payload |
| payslips | (payrun_id), (employee_id, period_start, period_end) | btree | run detail + duplicate detection |
| payslip_lines | (payslip_id, sequence) | btree | ordered payslip rendering |
| payroll_warnings | (payrun_id, resolved) | btree | payrun warning panel |
| audit_logs | (created_at), (entity, entity_id) | btree | review queries |

## 6. Primary Access Patterns

| Pattern | Freq | Query shape | Index |
|---|---|---|---|
| Employee list + filters (dept/status/search) | High | paginated, filter+ilike | dept/status indexes |
| Period contract lookup (per employee, per compute) | High per compute | employee_id + status + date overlap | contracts composite |
| Attendance aggregation for period | High per compute | employee_id, attendance_date between | attendance composite |
| Leave balance / approved days for period | High per compute | requests by employee+status+date range | requests composite |
| Payslip duplicate check | High per compute | employee_id + period overlap, status ≠ CANCELLED | payslips composite |
| Dashboard aggregates | Medium | group-bys over period/department | above indexes + date scans |
| Payrun detail + payslips + warnings | Medium | 3 queries or 1 include | FK indexes |

## 7. Migration & Seed Strategy

- Tool: `prisma migrate dev` (dev) / `prisma migrate deploy` (prod-like). Naming: `YYYYMMDDHHMMSS_description`.
- Rollback: forward-only; corrective migrations preferred (documented in each migration folder) — acceptable for hackathon.
- Seed (`prisma/seed.js`, idempotent upserts): 1 admin + demo users per role (password `Password123!`), 4 departments, 12 employees with varied contracts (FULL_TIME/PART_TIME/CONTRACT), 2 working schedules, attendance for 60 days, 3 time off types + allocations + requests in mixed states, "Regular Salary" structure with rules BASIC (fixed=wage), HRA (20% BASIC), TRANSPORT (fixed 3000), GROSS (subtotal), PF (12% BASIC), TAX (formula), NET (subtotal); 2 historical PAID payruns (for dashboard trends) + 1 fresh DRAFT payrun for the live demo.

**Numerical guarantee:** engine math uses `Decimal`/fixed-2 rounding at line level; payslip totals are stored, never recomputed for display.
