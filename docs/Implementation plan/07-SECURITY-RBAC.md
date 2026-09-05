# Pay365 — Security Architecture & RBAC

**Date:** 2026-09-05 · **Status:** Approved baseline

---

## 1. Authentication Strategy & Implementation Phases (ADR-004)

**Approach:** Stateful session-based authentication via `express-session` + `connect-pg-simple`. On successful login, the server creates a session row in the PostgreSQL `sessions` table and returns a signed `sid` cookie. No tokens are issued to the client — the session ID cookie is the only credential.

### Session Cookie Configuration
| Property | Value | Reason |
|---|---|---|
| `httpOnly` | `true` | JavaScript cannot read or steal the cookie |
| `Secure` | `true` (production) | Cookie only sent over HTTPS |
| `SameSite` | `Lax` | CSRF protection on cross-site navigations |
| `Path` | `/` | Covers all API routes |
| `maxAge` | 7 days | Persistent login; destroyed on explicit logout |

### P0 Security Essentials (Critical Path)
- **Password Hashing:** bcrypt with cost factor 12. Passwords never logged or returned in API responses.
- **Session Authentication:** `express-session` with `connect-pg-simple` store. Server reads `session.userId` and `session.role` on every request — no token decoding required.
- **5-Role RBAC Model:** `EMPLOYEE`, `HR_MANAGER`, `HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`. Role stored in session row.
- **Route Authorization:** Enforced via `requireAuth` (checks valid session exists) and `requireRole(...roles)` (checks `session.role`) middleware.
- **Resource Ownership:** Employees restricted to own payslips, attendance, and leave requests via `session.employeeId`. Self-approval of time-off blocked (`403 Forbidden`).
- **Formula Injection Protection:** Strict AST parser whitelist; execution over isolated variable map with zero function calls or object traversal.
- **Sensitive Audit Logs:** Audit records for user creation/role changes, leave approvals/refusals, payrun compute/validation/paid transitions, salary rule changes, and HR manual attendance edits.

### P1 Security Hardening
- **Session Regeneration:** Session ID is regenerated on login (`req.session.regenerate()`) to prevent session fixation attacks.
- **Rate Limiting:** 5 failed login attempts / 15 min / IP → 429; global 300 req/min / IP → 429.
- **Security Headers & CSP:** `helmet` header tuning, HSTS, frame denial, and CSP restrictions.
- **Extensive Security Telemetry:** Suspicious activity metrics and extended security event tracing.

## 2. RBAC Model

- **Model:** Flat role-based authorization across 5 roles. Enforcement: `requireAuth` → `requireRole(...roles)` per route.
- **Session payload:** `{ userId, role, employeeId | null }` stored server-side. Middleware reads `req.session` — no decoding step.
- **Row-level checks (Application Services):**
  - Employee role: Filtered to `employee.user_id = req.session.userId`; can only create own attendance and own time off requests.
  - Self-service routes (`GET /me/employee-profile`, `GET /me/attendance`, `GET /me/payslips`) enforced by matching `req.session.employeeId`.
  - Time off approvals: Requester cannot approve their own request (`req.session.userId !== request.requester_id`).
  - List routes for EMPLOYEE role: backend middleware force-appends `WHERE employee_id = req.session.employeeId` to prevent data leaks.
- **Frontend:** Protected routes and UI action visibility dynamically adjust to user role (read from Redux store, seeded by `GET /auth/me`). API middleware is the true enforcement layer.

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

| Endpoint | Minimum Role | Auth Check |
|---|---|---|
| `POST /auth/login` | Public | — |
| `POST /auth/logout` | Authenticated (session cookie) | `requireAuth` — destroys session even if expired |
| `GET /auth/me` | Authenticated | `requireAuth` |
| `GET /employees` | HR_MANAGER | `requireRole('HR_MANAGER')` |
| `GET /me/employee-profile` | EMPLOYEE | `requireAuth` + `session.employeeId` match |
| `POST /employees` | HR_MANAGER | `requireRole('HR_MANAGER')` |
| `PATCH /users/:id/deactivate` | ADMIN | `requireRole('ADMIN')` |
| `POST /time-off-requests/:id/status-changes` | HR_MANAGER | `requireRole('HR_MANAGER')` + `userId !== request.requester_id` |
| `GET /employees/:id/time-off-balances` | EMPLOYEE (own) / HR_MANAGER | `requireAuth` + ownership check if EMPLOYEE |
| `POST /payruns` | HR_PAYROLL_USER | `requireRole('HR_PAYROLL_USER')` |
| `POST /payruns/:id/status-changes` (COMPUTE) | HR_PAYROLL_USER | `requireRole('HR_PAYROLL_USER')` + concurrency semaphore |
| `POST /payruns/:id/status-changes` (VALIDATE / MARK_PAID / CANCEL) | HR_PAYROLL_MANAGER | `requireRole('HR_PAYROLL_MANAGER')` + state check |
| `POST /payruns/:id/dispatches` | HR_PAYROLL_MANAGER | `requireRole('HR_PAYROLL_MANAGER')` |
| `PUT /salary-structures/:id/rules` | HR_PAYROLL_MANAGER | `requireRole('HR_PAYROLL_MANAGER')` |
| `GET /me/payslips` / `GET /me/payslips/:id` | EMPLOYEE | `requireAuth` + `session.employeeId` match |
| `POST /users` | ADMIN | `requireRole('ADMIN')` |

## 5. Security Standards (all mandatory)

1. **Input validation:** zod schema on **every** endpoint body/query/param — reject with 400 VALIDATION_ERROR.
2. **Parameterized queries only** — Prisma enforces this; **no raw SQL with interpolation** (any `$queryRaw` must use tagged templates + review).
3. **Password hashing:** bcrypt cost factor 12; passwords never in logs or responses.
4. **Session security:** `express-session` secret from `SESSION_SECRET` env var (min 32 chars); session store is `connect-pg-simple` (PostgreSQL `sessions` table). Session ID regenerated on login to prevent fixation.
5. **HTTPS everywhere** in deployment; `Secure` flag on `sid` cookie in production.
6. **CORS:** explicit allow-list (`WEB_ORIGIN` env); no `*` in production.
7. **Rate limiting:** `express-rate-limit` — `/auth/login`: 5 req / 15 min / IP → 429; global: 300 req / min / IP → 429.
8. **Security headers:** `helmet` (X-Frame-Options: DENY, HSTS, no-sniff, CSP for the SPA host).
9. **Secrets:** env vars only; `.env` git-ignored; `.env.example` committed with placeholders. (The calculation engine is in-process — no engine shared secret needed.)
10. **Audit log** for: login success/failure, role changes, user create/deactivate, time off approve/refuse, payrun create/compute/validate/mark-paid/dispatch, salary config changes, attendance manual corrections. Record: `actor_id`, `action`, `entity`, `entity_id`, `payload_diff` (JSONB), `ip`, `timestamp`.
11. **Error hygiene:** 5xx responses never leak stack traces; logger records them with `request_id`.
12. **PII hygiene:** never log session IDs, passwords, or full bank account numbers (mask to last 4 in UI and logs).

## 6. Threat Notes (hackathon-relevant subset)

| Threat | Mitigation |
|---|---|
| Session hijacking (stolen `sid` cookie) | `httpOnly` prevents JS access; `Secure` flag prevents transmission over HTTP; `SameSite=Lax` blocks cross-site requests; `express-session` secret signs cookie to prevent forgery |
| Session fixation | Session ID regenerated via `req.session.regenerate()` on every successful login |
| Brute-force login | `express-rate-limit`: 5 attempts / 15 min / IP → 429 |
| Privilege escalation via API | `requireRole` middleware on every route; session role read server-side (not client-supplied); integration tests assert 403 per role |
| IDOR (access others' payslips/attendance) | Row-level `session.employeeId` filter for EMPLOYEE role; backend force-appends tenant filter on list routes |
| CSRF | `SameSite=Lax` on session cookie; explicit `CORS` allow-list prevents unauthorized origins from making credentialed requests |
| Formula injection into the calculation engine | Grammar-whitelisted parser/evaluator: only numbers, + - * / ( ), named variables, ternary/comparison; no `eval` / `new Function`, no dynamic property access, no calls; variables resolved from a fixed map (no prototype chain); input size caps |
| Mass assignment | zod strips unknown fields; services whitelist updatable fields |
| Duplicate/phantom payroll | Duplicate warning engine check + payrun state machine guards + 409 INVALID_STATE_TRANSITION on concurrent mutations |