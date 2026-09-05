# Pay365 Implementation Plan — Change Report (Baseline v1.0 → v1.1)

**Date:** 2026-09-05
**Scope:** All 9 documents in `docs/Implementation plan/` (00-MASTER-PLAN through 08-ROADMAP-AND-TASKS)
**Purpose:** Track what changed between the originally authored architecture baseline (v1.0) and the user-updated plan (v1.1). Read-only audit — no changes were made to the plan documents.

---

## Change 1 — Python microservice removed; payroll engine is now an in-process module inside Node (ADR-001 & ADR-005 revised)

The 4-tier system (React → Node → PostgreSQL + Python) is now a **3-tier system**. This is the dominant change and ripples through nearly every file.

| File | What changed |
|---|---|
| 00-MASTER-PLAN | Tier table: Python row removed; engine = "in-process Payroll Calculation Engine module" (pure, no DB, no HTTP, no I/O); `decimal.js` added for money math; docker-compose drops the engine service; testing drops pytest → Vitest |
| 02-SYSTEM-ARCHITECTURE | Decision table rewritten — dedicated calculation microservice now explicitly **Rejected** (network hop, circuit-breaker/shared-secret ops, harder atomicity); system diagram redrawn with the engine nested inside the Node box; §5.2 compute flow now calls `computeBatch()` directly, with atomic delete+replace of payslips on recompute added as an explicit transaction step; §6 integration table: no more timeouts/retries/shared secret/circuit breaker — "pure functions cannot time out or go down" |
| 05-PAYROLL-ENGINE-CONTRACT | Completely rewritten: "Payroll Calculation Engine Contract (TypeScript, in-process)". Exported functions `computeBatch()` / `validateRules()` replace HTTP endpoints. New Strict Engine Invariants (no `process.env`, no `Date.now()`, `Math.random()`, no global mutable state). Failure-modes table shrinks (no 503/ENGINE_UNAVAILABLE). TAX formula syntax changed from Python ternary `2000 if gross > 50000 else 0` → JS ternary `GROSS > 50000 ? 2000 : 0` |
| 04-API-CONTRACTS | `ENGINE_UNAVAILABLE (503)` removed from error catalog & status codes; `ENGINE_RULE_ERROR` note updated to in-process |
| 07-SECURITY-RBAC | Engine shared secret removed from secrets standard ("no engine shared secret is needed") |
| 08-ROADMAP-AND-TASKS | TASK-014 retitled "Pure In-Process TypeScript Payroll Engine Module"; new hard invariants in acceptance criteria (deep-equal idempotency, no Date.now/Math.random) |

## Change 2 — Language: TypeScript → JavaScript (ES Modules)

- 00-MASTER-PLAN: Frontend "React 19 + JavaScript (JSX)", API "Express 5 + JavaScript (ES Modules)"; repo files now `server.js`, `seed.js`
- 06-FRONTEND-ARCHITECTURE: extensions `.jsx`, `router.jsx`, `providers.jsx`, `api.js`

## Change 3 — Styling: Tailwind → SCSS design system

- 00-MASTER-PLAN: stack table + repo structure (`styles/` folder)
- 06-FRONTEND-ARCHITECTURE: **new §7 "SCSS & Styling Architecture"** — `_variables.scss` (design tokens), `_mixins.scss`, `main.scss`, co-located per-component SCSS

## Change 4 — Client state: Zustand → Redux Toolkit

- 00-MASTER-PLAN, 02-SYSTEM-ARCHITECTURE (caching table), 06-FRONTEND-ARCHITECTURE (`authSlice`/`uiSlice`, `useSelector(selectAuth)` in route guards), 08-ROADMAP-AND-TASKS (store/slices in structure)

## Change 5 — Phases restructured: 5 phases → 2 phases

- **P0 "Critical Core Business Flow" (TASK-001–016)** and **P1 "Finishing & Polish" (TASK-017–021)**
- **Dashboard demoted P0 → P1** (was TASK-019 P0 in baseline, now P1)
- **Seed/demo dataset task removed from the board entirely** (baseline TASK-020 "Seed/demo dataset" was P0)

## Change 6 — Task board re-sequenced (new 21-task breakdown)

- Baseline TASK-001/002/003 (scaffold, schema, auth) **merged** into new TASK-001 "Foundation / Auth & Scaffolding"
- Departments & Jobs promoted to their own task (new TASK-002), now before Employees
- Time Off split 2 → 3 tasks (008 Types, 009 Allocations, 010 Requests)
- Salary config split into Structures (011) + Rules (012)
- Payroll stage split finer: 013 Wizard/Orchestration, 014 Engine, 015 Payslip Generation, 016 Validation/Warnings/State Machine
- **New TASK-020**: "Advanced Reporting & Analytics Breakdown" (department/job payroll summaries, leave utilization, attendance exceptions, CSV export)
- **New section in 08**: "Business Scenario Test Specifications (Agent 3 QA)" — 5 concrete scenarios:
  1. Two-contract period selection (Contract A Jan–Jun wage 40,000; Contract B Jul–Dec wage 55,000; August payrun must select Contract B)
  2. Leave deduction math (10-day allocation, 3-day approved request → taken=3, remaining=7)
  3. Salary rule math (BASIC 50000 / HRA 10000 / TRANSPORT 3000 / GROSS 63000 / PF −6000 / TAX −2000 / NET 55000)
  4. RBAC 403 enforcement (Employee role → GET /payruns, POST /salary-structures)
  5. Duplicate payslip semantics (Test A: recompute = clean atomic replacement, no warning; Test B: overlapping second payrun → DUPLICATE_PAYSLIP warning)

## Change 7 — Schema refinements (03-DATABASE-DESIGN)

- **`salary_rules`: `UNIQUE (structure_id, sequence)` constraint removed** — replaced with deterministic ordering via `ORDER BY sequence ASC, id ASC`; "Sequence itself does not require global database-level uniqueness"
- **`payslips`: UNIQUE (payrun_id, employee_id) note expanded** — recompute within a payrun atomically replaces; cross-payrun overlap is a non-blocking `DUPLICATE_PAYSLIP` warning (formalizes what TASK-015/016 implement)

## Change 8 — Security phased (07-SECURITY-RBAC)

- Auth section restructured into **P0 Security Essentials** vs **P1 Security Hardening**
- Moved **to P1**: refresh-token rotation/session-family reuse detection, login rate limiting, helmet/CSP headers, security telemetry (new item)
- New P0 additions: self-approval block (403), formula-injection protection, expanded audit list

---

## Governance Findings — Inconsistencies Introduced by the Update (flagged only, not fixed)

| # | Severity | Location | Issue |
|---|---|---|---|
| 1 | 🟡 TS/JS mixed | 00 status line & TASK-014 title, 01 §1 ("all TypeScript") & §5, 02 header/ADR-001/invariants/engine module row, 05 title | The stack switched to JavaScript, but ~10 residual references still say "TypeScript". The engine contract (05) even declares TypeScript signatures. One wording should be chosen. |
| 2 | 🟡 Spec path mismatch | All docs reference `docs/Others/Pay365 HR & Payroll.md`; the file on disk is `docs/Others/PeoplePay365 HR & Payroll.md` | Close, but the literal path referenced in 9 documents does not resolve. |
| 3 | 🔴 Contract contradiction | 03 salary_rules says sequence is **not** unique; but 03 §5 Index table still lists `(structure_id, sequence)` as **unique btree**, 04 §3 still says "validates unique codes/sequences", and TASK-012 AC still says "duplicate sequence… rejected with 422" | Three documents enforce what the schema change removed. This will surface as a failed acceptance test. |
| 4 | 🟡 P0/P1 drift | 07 moved refresh rotation + login rate limiting to **P1**; but 02 §3 and 04 login/refresh contracts still document rotation as core behavior, and TASK-001 (P0) AC requires "rate limiting blocks 5 bad attempts" | Rate limiting appears both as P0 (task) and P1 (security doc). |
| 5 | 🟡 Stale artifact | 04 compute contract still says "Timeout: 60 s"; 06 still sets a 60 s compute timeout | Meaningless for an in-process call — harmless but signals the edit did not reach every line. |
| 6 | 🟡 Gap | Seed task removed, but TASK-021 demo rehearsal, 03 §7 seed strategy, and both demo scenarios assume seeded data exists | Nothing on the board now *produces* the seed. Should be folded into TASK-001 or TASK-021 scope. |
| 7 | 🟢 Minor | 05 §4 variable map now includes uppercase aliases (`CONTRACT_WAGE`, `WORKED_DAYS`, `OVERTIME_HOURS`, `LEAVE_DAYS`) | Robustness improvement — but 02 §5.2 step 2d still describes only the lowercase flat map. |
| 8 | 🟢 Minor | 06 folder structure dropped the old `types/` directory | Consistent with JS adoption; noting the type-sharing layer is gone. |

---

## Summary Judgment

The update is coherent in direction — collapsing the Python service into a pure in-process module simplifies deployment, removes the entire network failure-mode surface, and makes atomic recompute easier; the phased P0/P1 security split and the new QA scenario section strengthen the plan.

The only 🔴 item is **Finding #3** (salary_rules sequence-uniqueness contradiction across 03/04/08) — it will cause a real test failure if left as-is. Everything else is cosmetic drift.
