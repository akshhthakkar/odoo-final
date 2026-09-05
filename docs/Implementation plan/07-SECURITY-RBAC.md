# Pay365 — Security Architecture & RBAC

**Date:** 2026-09-05 · **Status:** Approved baseline

---

## 1. Authentication Strategy & Implementation Phases (ADR-004)

### P0 Security Essentials (Critical Path)
- **Password Hashing:** bcrypt with cost factor 12. Passwords never logged or returned in API responses.
- **JWT Authentication:** 15-minute access token (`sub`, `role`, `jti`) via `Authorization: Bearer` header.
- **5-Role RBAC Model:** `EMPLOYEE`, `HR_MANAGER`, `HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`.
- **Route Authorization:** Enforced via `requireAuth` and `requireRole` middleware.
- **Resource Ownership:** Employees restricted to own payslips, attendance, and leave requests. Self-approval of time-off blocked (`403 Forbidden`).
- **Formula Injection Protection:** Strict AST parser whitelist; execution over isolated variable map with zero function calls or object traversal.
- **Sensitive Audit Logs:** Audit records for user creation/role changes, leave approvals/refusals, payrun compute/validation/paid transitions, salary rule changes, and HR manual attendance edits.

### P1 Security Hardening
- **Refresh Token Rotation:** Refresh cookie (`httpOnly`, `SameSite=Lax`) with session family tracking and reuse detection.
- **Advanced Rate Limiting:** 5 failed logins per 15 min per IP/email triggering 429; global 300 req/min limit.
- **Security Headers & CSP:** `helmet` header tuning, HSTS, frame denial, and CSP restrictions.
- **Extensive Security Telemetry:** Suspicious activity metrics and extended security event tracing.

## 2. RBAC Model

- **Model:** Flat role-based authorization across 5 roles. Enforcement: `requireAuth` $\rightarrow$ `requireRole(...roles)` per route.
- **Row-level checks (Application Services):**
  - Employee role: Filtered to `employee.user_id = current user`; can only create own attendance and own time off requests.
  - Time off approvals: Requester cannot approve their own request (`approver_id !== requester_id`).
- **Frontend:** Protected routes and UI action visibility dynamically adjust to user role, while API middleware acts as the source of truth.

## 3. Full Permission Matrix

Legend: **F**ull CRUD · **CRU** (no delete) · **R**ead · **—** none · ⚡ workflow actions

| Resource | Employee | HR Manager | HR Payroll User | HR Payroll Manager | Admin |
|---|---|---|---|---|---|
| Users & roles | — | — | — | — | F |
| Employees (others) | — | F | F | F | F |
| Employees (own record) | R | F | F | F | F |
| Departments / Jobs | R | F | F | F | F |
| Contracts | — | F | F | F | F |
| Working schedules & lines | R | F | F | F | F |
| Attendance (own) | F (own) | F | F | F | F |
| Attendance (others) | — | F (incl. corrections) | F | F | F |
| Time off types | R | F | F | F | F |
| Time off allocations | R (own) | F | F | F | F |
| Time off requests (own) | F (create/cancel own) | F | F | F | F |
| Time off requests ⚡approve/refuse | — | ⚡ | ⚡ | ⚡ | ⚡ |
| Salary structures | — | — | R | F | F |
| Salary rules | — | — | R | F | F |
| Payruns | — | — | CRU + ⚡compute | F + ⚡compute/validate/paid/send | F |
| Payslips | R (own) | — | CRU | F | F |
| Payslip PDF (own) | R | R | R | R | R |
| Dashboard | — | R (HR widgets) | R | R | R |

## 4. Endpoint-Level Enforcement Examples

| Endpoint | Minimum role |
|---|---|
| `POST /auth/login`, `POST /auth/refresh` | Public |
| `GET /employees` | HR Manager+ (Employee gets `/employees/me`) |
| `POST /employees` | HR Manager |
| `POST /time-off/requests/:id/approve` | HR Manager (and ≠ requester) |
| `POST /payruns` | HR Payroll User |
| `POST /payruns/:id/compute` | HR Payroll User |
| `POST /payruns/:id/validate` · `/mark-paid` · `/send-payslips` | HR Payroll Manager |
| `POST /salary-structures` / `PUT /salary-rules/:id` | HR Payroll Manager |
| `GET /payruns` | HR Payroll User |
| `POST /users` | Admin |

## 5. Security Standards (all mandatory)

1. Input validation: zod schema on **every** endpoint body/query/param — reject with 400 VALIDATION_ERROR.
2. Parameterized queries only — Prisma enforces this; **no raw SQL with interpolation** (any `$queryRaw` must use tagged templates + review).
3. bcrypt password hashing; passwords never in logs or responses.
4. HTTPS everywhere in deployment; secure cookies in production.
5. CORS: explicit allow-list (`WEB_ORIGIN` env); no `*` in production.
6. Rate limiting: `express-rate-limit` on `/auth/login` (5/15 min) and global 300/min.
7. Security headers: `helmet` (X-Frame-Options: DENY, HSTS, no-sniff, CSP for the SPA host).
8. Secrets: env vars only; `.env` git-ignored; `.env.example` committed with placeholders. (The calculation engine is in-process — no engine shared secret is needed.)
9. Audit log for: login success/failure, role changes, user create/deactivate, time off approve/refuse, payrun create/compute/validate/mark-paid/send, salary config changes, attendance manual corrections. Record: actor, action, entity, entity_id, payload diff (JSONB), ip, timestamp.
10. Error hygiene: 5xx responses never leak stack traces; logger logs them with request_id.
11. Token/PII hygiene: never log tokens, passwords, full bank account numbers (mask to last 4 in UI and logs).

## 6. Threat Notes (hackathon-relevant subset)

| Threat | Mitigation |
|---|---|
| Stolen access token | 15-min expiry + refresh rotation; revocable sessions |
| Privilege escalation via API | Role middleware on every route + integration tests asserting 403s per role |
| IDOR (access others' payslips) | Row-level filter for Employee role; tests included |
| Formula injection into the calculation engine | Grammar-whitelisted parser/evaluator: only numbers, + - * / ( ), named variables, ternary/comparison; no eval / new Function, no dynamic property access, no calls; variables resolved from a fixed map (no prototype chain); input size caps |
| Mass assignment | zod strips unknown fields; services whitelist updatable fields |
| Duplicate/phantom payroll | Duplicate warning engine check + payrun state machine guards |