# PeoplePay360 — Security Architecture & RBAC

**Date:** 2026-09-05 · **Status:** Approved baseline

---

## 1. Authentication Strategy (ADR-004)

| Aspect | Decision |
|---|---|
| Method | JWT (stateless) — access token + refresh token |
| Access token | 15 min expiry, contains `sub` (user id), `role`, `jti`; sent as `Authorization: Bearer` |
| Refresh token | 7 days, opaque random string, **httpOnly + Secure + SameSite=Lax cookie** on `/api/v1/auth/*`; hashed in DB (`sessions` via user record or refresh_tokens table) so it can be revoked |
| Rotation | Refresh rotates: old token invalidated on every refresh; reuse of a rotated token → revoke family (basic detection) |
| Passwords | bcrypt, cost 12; never logged; minimum 8 chars |
| Login abuse | Rate limit: 5 failed attempts per email+IP per 15 min → 429; generic error message (no user enumeration) |
| Registration | No public signup. Admin creates users (`POST /users`); seeded demo users for all roles |

## 2. RBAC Model

- **Model:** flat role-based (5 roles). Enforcement: `requireAuth` middleware (validates JWT, loads user) → `requireRole(...roles)` middleware per route.
- **Row-level rules** (in services, not middleware):
  - Employee role: all reads filtered `employee.user_id = current user`; writes only own attendance + own time off requests.
  - Everyone: cannot approve own time off request (approver ≠ requester) unless Admin.
- **Frontend:** routes and action buttons check the role from the session store; the API remains the enforcement point (UI checks are UX only).

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
8. Secrets: env vars only; `.env` git-ignored; `.env.example` committed with placeholders; engine shared secret compared with timing-safe compare.
9. Audit log for: login success/failure, role changes, user create/deactivate, time off approve/refuse, payrun create/compute/validate/mark-paid/send, salary config changes, attendance manual corrections. Record: actor, action, entity, entity_id, payload diff (JSONB), ip, timestamp.
10. Error hygiene: 5xx responses never leak stack traces; logger logs them with request_id.
11. Token/PII hygiene: never log tokens, passwords, full bank account numbers (mask to last 4 in UI and logs).

## 6. Threat Notes (hackathon-relevant subset)

| Threat | Mitigation |
|---|---|
| Stolen access token | 15-min expiry + refresh rotation; revocable sessions |
| Privilege escalation via API | Role middleware on every route + integration tests asserting 403s per role |
| IDOR (access others' payslips) | Row-level filter for Employee role; tests included |
| Formula injection into Python engine | AST-whitelist evaluator: only numbers, + - * / ( ), named variables; no names, no attribute access, no calls; input size caps |
| Mass assignment | zod strips unknown fields; services whitelist updatable fields |
| Duplicate/phantom payroll | Duplicate warning engine check + payrun state machine guards |