# Pay365 — Security & Quality Assurance Audit (AI-Slop Scan Included)

| | |
|---|---|
| **Audit ID** | QA-AUDIT-2026-09-05-01 |
| **Audit Version** | **v1.0.0** |
| **Timestamp** | 2026-09-05 · 20:18:58 IST (UTC+05:30) |
| **Auditor** | Agent 3 — Security, Quality & Validation |
| **Scope** | Full repository: `backend/` (Express + Prisma + payroll engine), `frontend/` (React SPA), infra (`docker-compose.yml`), seed data |
| **Method** | Manual file-by-file review (all 60+ source files), pattern greps (slop + security), `npm audit` (both apps), git secret-tracking verification |
| **Code changes made by auditor** | **NONE — read-only audit** |
| **Overall Verdict** | **❌ FAIL for release** — see §6 (conditional-pass path documented for hackathon demo scope) |

---

## 1. Executive Summary

The backend that exists is **well-built**: session auth with regeneration (fixation-safe), bcrypt, zod validation on every implemented route, RBAC middleware, helmet, restricted CORS, a genuinely secure formula engine (handwritten parser, **no eval**, prototype-pollution-safe variable lookup, Decimal math), and audit logging in the payroll-config module. The frontend is clean of XSS sinks and its dependency tree has **zero vulnerabilities**.

However, the audit **fails** on three grounds: (1) **six backend modules are empty stubs** (timeoff, attendance, schedules, payruns, dashboard, notifications) while **seven frontend pages run on hardcoded mock data** — the app is a facade over roughly half its promised surface; (2) **secret material is committed** — the real `SESSION_SECRET` value appears in `backend/.env.example` and `docker-compose.yml`; (3) **over-permissive reads** — any authenticated user (including `EMPLOYEE`) can read any employee's full profile **including unmasked bank account numbers**, contradicting the project's own security plan.

One **likely functional bug** was found in the seed data (`baseCode: 'WAGE'` does not match any engine variable) that would make the default salary structure fail at compute time.

---

## 2. AI-Slop Findings

Definition used: content that looks finished but is mass-produced filler — dead code, mock-driven facades, copy-paste drift, placeholder data, inconsistent naming, and unexplained leftovers.

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| SLOP-01 | 🔴 High | **7 of 13 frontend pages are mock-driven facades.** `AdminPage`, `AttendancePage`, `DashboardPage`, `SalaryConfigPage`, `PayrollPage`, `SchedulesPage`, `TimeOffPage` make **zero API calls** — they render hardcoded constants. Their backend counterparts are empty stubs (see SLOP-03). The UI looks complete; the substance is absent. | Grep: `apiUsed=False` for all 7; `DashboardPage.jsx` L6–22 defines `MONTHLY_PAYROLL_DATA`, `DEPT_DISTRIBUTION`, `RECENT_PAYRUNS` constants; `TimeOffPage.jsx`, `SchedulesPage.jsx` similarly static. |
| SLOP-02 | 🔴 High | **`features/employees/data/employeesData.js` — 552 lines of hardcoded mock data**, self-labeled "Shared Mock Employees Data", containing fabricated PII (PAN `ABCDE1234F`, Aadhaar mask, bank account numbers, emergency contacts) for 10 people. `EmployeesPage` (L109) and `EmployeeProfilePage` (L18) fall back to it "if session/network is not connected" — meaning the demo can silently show fake data while looking real. | File content; `EmployeesPage.jsx` L109 comment. |
| SLOP-03 | 🔴 High | **6 mounted backend route modules are empty stubs** — `payroll-run.routes.js`, `notifications.routes.js`, `reports.routes.js`, `timeoff.routes.js`, `attendance.routes.js`, `schedules.routes.js` each contain only `Router()` + export (6 lines). They are mounted in `app.js` (L58–64) so the URLs exist but every request 404s. `payslips.routes.js` implements only `POST /previews`. | File contents; `app.js` L54–64. |
| SLOP-04 | 🟠 Med | **PrismaClient instantiated 5× instead of using `shared/prisma.js`.** `auth.service.js` (L5), `employees.service.js` (L4), `contracts.service.js` (L4), `users.service.js` (L5), `prisma/seed.js` (L4) each run `new PrismaClient()` — five connection pools — while `payroll-config.service.js` and `preview.service.js` correctly import `shared/prisma.js`. Copy-paste drift between generated modules. | File headers; `shared/prisma.js` exists unused by those services. |
| SLOP-05 | 🟠 Med | **Dead auth config:** `config/env.js` defines `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL_MIN`, `REFRESH_TTL_DAYS` (L10–12) and a `RefreshToken` Prisma model exists — but the app uses **cookie sessions** (`express-session`); no JWT code exists anywhere. Leftover from an abandoned auth design, presented as if it were active config. | `env.js` vs `app.js` L29–48; grep: no JWT usage in src. |
| SLOP-06 | 🟠 Med | **Likely functional bug in seed:** the default structure's rules use `baseCode: 'WAGE'` (seed.js L316/326/336/346), but the engine's variable map (`executor/index.js` L30–41) exposes `wage` and `CONTRACT_WAGE` — **not** `WAGE`. At compute time `variables['WAGE']` is undefined → `RuleError` → every employee fails; the validator (`validator/index.js` L82–88) would also reject this rule set. The seed bypasses validation by inserting directly. **Verify by running a preview against the seeded structure.** | `seed.js` L308–368 vs `executor/index.js` L24–42, `validator/index.js` L80–89. |
| SLOP-07 | 🟡 Low | **Fragile seed upsert:** `prisma.contract.upsert({ where: { id: employee.id } ... })` with comment "dummy fallback" (seed.js L418–419), relying on a `.catch()` fallback to `findFirst({ reference })`. Upserting by an ID that is known not to exist is an anti-pattern. | `seed.js` L417–456. |
| SLOP-08 | 🟡 Low | **Brand drift:** seed employees use `@peoplepay360.io` emails (old project name) while users use `@pay365.dev`; frontend mock data also uses `@peoplepay360.io`. Two identities for one product. | `seed.js` L40 etc.; `employeesData.js` L12. |
| SLOP-09 | 🟡 Low | **README/seed password mismatch:** README documents demo password `Password123!`; seed actually creates accounts with `Password@123` (seed.js L246). A reviewer following the README cannot log in. | `README.md` Getting Started vs `seed.js` L246. |
| SLOP-10 | 🟡 Low | **Mojibake / corrupted comment characters:** `DashboardPage.jsx` L5 and `employeesData.js` L1 contain box-drawing comments that decode as replacement characters (`���`) — file was saved in a different encoding than read. Cosmetic but signals unreviewed generated content. | Grep output showing `��� Demo Data ���`. |
| SLOP-11 | 🟡 Low | **Emoji in backend source:** `seed.js` L492 logs "✅ Full database seed finished successfully!" — the emoji-in-code pattern the project explicitly banned elsewhere. | `seed.js` L492. |
| SLOP-12 | 🟡 Low | **`console.error` in `config/env.js` (L21)** instead of the project's `shared/logger.js` — inconsistent logging at the very first file that runs. | `env.js` L20–26. |
| SLOP-13 | 🟡 Low | **`batchSchema` declared after `computeBatch` uses it** (`executor/index.js` L131 vs L158). Works (TDZ only matters at call time) but reads backwards; schema should precede its consumer. | `executor/index.js`. |
| SLOP-14 | 🟡 Low | **Double formula evaluation:** `computeRuleWarnings` (executor L62–66) evaluates every FORMULA rule once for warnings, then `computeRuleAmount` (L59) evaluates it again. 2× parse+eval per formula rule per employee. | `executor/index.js` L59–66, L90. |
| SLOP-15 | 🔵 Low | **Unused assets:** `logo2.svg`, `logo3.svg` are referenced by no file (only `logo.svg` is imported). | Grep: no imports. |
| SLOP-16 | 🔵 Low | **Landing dead CSS:** `.lp-hero-glyph` (L189–206) and `.lp-section-pill` (L414–431) styles remain after the corresponding JSX was manually removed from `Hero.jsx`. | Prior explanation doc §19; current `Hero.jsx`. |
| SLOP-17 | 🔵 Low | **Test coverage is 2 tests** (`health.test.js`: health + 404 envelope) against a plan requiring happy+error tests for all P0 endpoints and engine unit tests. The engine — the most safety-critical pure module — has **zero tests**. | `backend/tests/` contents. |
| SLOP-18 | 🔵 Low | **`validateQuery` mutates `req.query` in place** (delete-all then re-assign, validate.js L36–39) — unusual, works, but a future maintainer will trip on it; `req.validatedQuery` already exists as the clean pattern. | `middleware/validate.js`. |

**Positive quality notes (not slop):** consistent error envelope everywhere; controllers are thin (parse → service → respond); services own business logic; pagination clamps (`limit ≤ 100`) on every list; `payroll-config.service.js` is exemplary (transactions, audit rows, P2002 mapping, dependency-guarded delete); the formula engine is hand-written and genuinely safe.

---

## 3. Security Findings

| ID | Sev | Finding | Evidence | Impact |
|---|---|---|---|---|
| SEC-01 | 🟠 High | **Secret material committed to the repo.** `backend/.env.example` contains the **real** `SESSION_SECRET` (identical to the live `backend/.env`), and `docker-compose.yml` (L26) hardcodes the same value. `.env.example` and `docker-compose.yml` are git-tracked (verified: `git ls-files` lists both; `backend/.env` itself is correctly ignored). Anyone with repo access holds a valid session-signing secret. | `backend/.env` L4 = `backend/.env.example` L4 = `docker-compose.yml` L26 = `4aefb68d…4efb3c`. | Session forgery if the secret is ever used beyond local dev; violates the project's own "`.env.example` committed with placeholders" standard. |
| SEC-02 | 🟠 High | **Over-permissive reads / PII exposure (IDOR-class).** `GET /api/v1/employees/:id` and `GET /api/v1/contracts*` require only `requireAuth` — **any** role, including `EMPLOYEE`, can read **any** employee. `formatEmployee` returns `bank_account_number` **unmasked** (employees.service L51). The security plan (07-SECURITY-RBAC §3) specifies Employee = own record only, and bank numbers masked to last 4. | `employees.routes.js` L69–70; `contracts.routes.js` L58–59; `employees.service.js` L50–52. | Any logged-in user can enumerate employee PII + full bank account numbers by iterating IDs. |
| SEC-03 | 🟠 High | **Contract-overlap race condition (check-then-act).** `checkContractOverlap` reads then creates with **no transaction and no DB exclusion constraint** — two concurrent creates can both pass and produce overlapping ACTIVE contracts, corrupting the payroll hot path. This is schema-review finding F-4, recommended fix (GiST exclusion constraint) never applied. | `contracts.service.js` L56–81, L159–195; migration SQL contains no exclusion constraint. | Silent data corruption; every future payrun for that employee errors with AMBIGUOUS_CONTRACT. |
| SEC-04 | 🟡 Med | **No CSRF defense beyond `SameSite=Lax`.** Auth is a session cookie; state-changing POST/PATCH/DELETE endpoints have no CSRF token and no Origin/Referer verification. Lax blocks cross-site POST cookie attachment in modern browsers, but top-level navigations and older clients remain edge cases. | `app.js` L29–48; no CSRF middleware anywhere. | Low-probability but standard-defense gap for cookie-authenticated APIs. |
| SEC-05 | 🟡 Med | **Rate limiting only on login.** No global limiter and none on authenticated write endpoints; no account lockout. A stolen/valid session can hammer endpoints unthrottled. | `auth.routes.js` L10–20 is the only `rateLimit` in src. | Brute-force/abuse resistance is single-layered. |
| SEC-06 | 🟡 Med | **Dependency vulnerabilities (backend): 8 total — 1 critical, 4 high, 3 moderate.** Critical: `vitest ≤3.2.5` (via `@vitest/mocker`/`vite`) — **dev-only**, practical risk low. High: `prisma 6.13–8.1-dev` chain via `deepmerge-ts` stack exhaustion (GHSA-ggr8-5vv4-36mx); fix = downgrade to prisma 6.12.0 (breaking). Moderate: `esbuild ≤0.24.2` dev-server request forgery (GHSA-67mh-4wv8-2f99) — dev-only. **Frontend: 0 vulnerabilities.** | `npm audit` both apps (run during this audit). | Supply-chain exposure; the prisma chain is the only one touching production code paths. |
| SEC-07 | 🟡 Med | **Dev default secrets fail open.** `env.js` gives `JWT_ACCESS_SECRET` default `'dev-only-secret-change-me'` and `SESSION_SECRET` default `'dev-only-session-secret-change-me-in-prod'` (L10, L13). If `SESSION_SECRET` is unset in a production deploy, the app **boots with a publicly-known secret** instead of refusing. There is no `NODE_ENV === 'production'` guard rejecting defaults. | `config/env.js`. | Predictable session signing in a misconfigured prod. |
| SEC-08 | 🔵 Low | **Client-supplied `X-Request-Id` accepted unvalidated** (`request-id.js` L4) and echoed in responses and logs — unbounded length/content log-injection surface. | `middleware/request-id.js`. | Log forging; trivial to fix (validate format / length-cap). |
| SEC-09 | 🔵 Low | **bcrypt cost inconsistency:** `users.service.js` hashes at cost **10** (L91, L147) while `seed.js` uses **12** and the plan mandates 12. | `users.service.js` vs `seed.js` L246. | Weaker-than-planned hashing for admin-created/reset passwords. |
| SEC-10 | 🔵 Low | **Seed contains realistic fabricated PII** (PAN-style IDs, bank accounts, phone numbers, addresses) in a committed file. Fake, but pattern-realistic — fine for a demo, worth a "synthetic data" banner comment. | `seed.js` L35–236. | None direct; hygiene. |
| SEC-11 | ℹ️ Info | **Dev-only error leakage by design:** 500 messages are masked only when `NODE_ENV=production` (errors.js L12–15) — correct pattern, noted so reviewers don't misread dev stack messages as a flaw. DB creds `pay365/pay365` hardcoded in compose — acceptable for local dev containers. | `middleware/errors.js`; `docker-compose.yml`. | — |

**Security positives (verified, credit where due):** helmet applied; CORS restricted to `WEB_ORIGIN` with `credentials: true`; session cookie `httpOnly` + `SameSite=Lax` + `secure` in production; **session regenerated on login** (fixation defense, auth.controller L8–14); logout destroys server-side session; bcrypt with generic `INVALID_CREDENTIALS` (no user enumeration); login rate-limited per email+IP; zod validation on every implemented route (body + query); Prisma parameterized throughout — the one raw query uses a **tagged template** (`payroll-config.service.js` L33), the safe form; formula engine: handwritten tokenizer/parser, **no `eval`/`new Function`**, `hasOwnProperty` variable lookup (prototype-pollution safe), division-by-zero trapped, Decimal everywhere; RBAC enforced on all implemented write routes; audit logging implemented in payroll-config.

---

## 4. Implementation Coverage Matrix

| Module (per plan) | Backend | Frontend | Status |
|---|---|---|---|
| Auth (login/logout/me, sessions) | ✅ Full | ✅ Wired (LoginPage) | Complete |
| Users & roles (Admin) | ✅ Full (+reset-password) | ❌ Mock (AdminPage) | Backend done, UI mock |
| Employees / Departments / Jobs | ✅ Full | ✅ Wired (Employees, Profile) + ⚠️ mock fallback | Complete (with SLOP-02 fallback) |
| Contracts | ✅ Full (overlap check, no tx) | ✅ Wired (ContractsPage) + mock fallback | Complete |
| Working schedules | ❌ Empty stub | ❌ Mock (SchedulesPage) | **Not implemented** |
| Attendance | ❌ Empty stub | ❌ Mock (AttendancePage) | **Not implemented** |
| Time off (types/allocations/requests) | ❌ Empty stub | ❌ Mock (TimeOffPage) | **Not implemented** |
| Salary structures & rules | ✅ Full (+validateRules + audit) | ❌ Mock (SalaryConfigPage) | Backend done, UI mock |
| Payruns (wizard/compute/validate/paid) | ❌ Empty stub (only payslip **preview** exists) | ❌ Mock (PayrollPage) | **Not implemented** |
| Payslips (list/detail/PDF/email) | ❌ Only `POST /payslips/previews` | ❌ Mock | **Not implemented** |
| Dashboard / reports | ❌ Empty stub | ❌ Mock (DashboardPage) | **Not implemented** |
| Notifications (PDF/email) | ❌ Empty stub | — | **Not implemented** |
| Payroll engine (pure module) | ✅ Full (executor, parser, validator) | — | Complete, **untested** |

**Rough completion:** ~45% of the planned API surface; the entire payroll *execution* pipeline (payrun → payslip → PDF → email → dashboard) is absent behind working-looking UI.

---

## 5. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Reviewer logs in with README password and fails | High | Med (credibility) | Fix SLOP-09 (one string) |
| Seeded salary structure fails at compute (SLOP-06) | High | High (core demo breaks) | Change `baseCode: 'WAGE'` → `'CONTRACT_WAGE'` (or add `WAGE` alias in `buildVariables`), then run preview to verify |
| Reviewer discovers mock pages / 404 endpoints during demo | High | High (facade exposed) | Either implement or clearly scope the demo to wired flows (auth, employees, contracts, salary-config, preview) |
| Secret leak exploited | Low (local dev secret) | Med | Rotate secret, replace committed values with placeholders |
| PII enumeration by any logged-in user | Medium (demo has many logins) | High | Add role guard on employee/contract reads + mask bank numbers |
| Concurrent contract creation corrupts data | Low (single-user demo) | High | Apply exclusion constraint (schema-review F-4 fix) |

---

## 6. Release Decision

| Category | Verdict | Basis |
|---|---|---|
| **Security** | ❌ FAIL | SEC-01 (committed secret), SEC-02 (PIB/IDOR-class reads), SEC-03 (race) |
| **Code Quality** | ❌ FAIL | SLOP-01/02/03 (mock facades + empty stubs), SLOP-04/05 (drift), SLOP-17 (no engine tests) |
| **Testing** | ❌ FAIL | 2 smoke tests total; engine and all P0 endpoints untested |
| **Functionality** | ❌ FAIL | Payrun/payslip/dashboard/timeoff/attendance/schedules unimplemented; likely seed compute bug (SLOP-06) |
| **Documentation accuracy** | ⚠️ Conditional | README password mismatch; brand drift |

### Overall: ❌ FAIL (v1.0.0)

**Reason:** The implemented slices are genuinely good, but half the product is a facade (mock UI over empty endpoints), secret material is committed, and any authenticated user can read all employees' bank details. These are the exact failure classes this audit exists to catch.

### Conditional-PASS path (hackathon demo scope)
If the remaining time is short, the audit can be re-run as **⚠️ CONDITIONAL PASS** once these four items land (in priority order):
1. **SLOP-06** — fix seeded `baseCode` and verify `POST /api/v1/payslips/previews` returns the correct breakdown for a seeded employee (this is the single most demo-critical path that exists today).
2. **SEC-01** — replace the committed secret in `.env.example` + `docker-compose.yml` with `change-me` placeholders; rotate the live secret.
3. **SEC-02** — require `HR_MANAGER+` (or ownership) on employee/contract reads; mask `bank_account_number` to last 4 in `formatEmployee`.
4. **SLOP-09** — align README password with the seed (or vice-versa).
Demo scope should then be limited to wired flows: login → employees → contracts → salary config → payslip preview. Mock pages must not be shown as live features.

---

## 7. Recommended Fix Order (for Agent 2 — no code changed by this audit)

1. SLOP-06 seed `baseCode` fix + preview verification (30 min, unblocks the demo's core proof)
2. SEC-01 secret placeholders + rotation (15 min)
3. SEC-02 read guards + bank masking (1 h)
4. SLOP-09 README password (5 min)
5. SLOP-04 consolidate to `shared/prisma.js` (30 min)
6. SLOP-05 remove dead JWT config or finish the JWT design (30 min)
7. SEC-03 exclusion constraint migration (1–2 h, per `docs/Others/schema-review.md` F-4)
8. SLOP-17 engine unit tests (the ₹50,000 spec case first) (2 h)
9. SLOP-10/11/12/13 hygiene sweep (30 min)
10. Implement or explicitly de-scope stub modules (timebox decision for the team)

---

## 8. Audit Metadata

- **Files reviewed:** 60+ (all backend `src/`, engine, prisma schema/seed/migration, both `package.json`s, both `.env` files, docker-compose, root `.gitignore`, frontend `src/` structure, api/store/guards/lib, representative pages, landing suite)
- **Commands run:** `git ls-files` (secret tracking), `npm audit` ×2 (backend: 8 vulns; frontend: 0), pattern greps (console.log, TODO/FIXME, eval/dangerouslySetInnerHTML, mock/dummy/fake, placeholder, emoji/mojibake, hardcoded URLs)
- **Not in scope (no runtime available):** live endpoint testing, database-state verification (SLOP-06 is flagged "verify by running preview"), load/performance testing
- **Next audit:** v1.1.0 after the conditional-pass items land
