# Pay365 — Schema Review & Fix Recommendations

**Date:** 2026-09-05
**Scope:** `backend/prisma/schema.prisma` (20 models) reviewed against `docs/Implementation plan/03-DATABASE-DESIGN.md`, ADR-005/ADR-008, and task acceptance criteria
**Review verdict:** ✅ Schema approved — correct, scope-aligned, hackathon-ready. This document addresses the 7 review findings + 1 open design decision with **best fixes and their impact**. No schema change is blocking `prisma migrate dev`; fixes below are ordered by priority.

---

## Priority Summary

| ID | Issue | Recommended Fix | Priority | Schema change? | Effort |
|---|---|---|---|---|---|
| F-2 | DB CHECK constraints missing | Raw-SQL migration + zod (defense in depth) | 🔴 High | Migration-only SQL | ~1 h |
| F-4 | Contract-overlap race condition | Exclusion constraint (DB guarantee) + tx re-check | 🔴 High | Migration-only SQL | ~1–2 h |
| D-1 | Duplicate `sequence` behavior undecided | Enforce in `validateRules()` at save | 🔴 High | None | ~30 min |
| F-3 | Partial index absent | Raw-SQL migration (optional but cheap) | 🟡 Medium | Migration-only SQL | ~15 min |
| F-1 | `RefreshToken` undocumented | Design-doc patch + ADR-009 | 🟡 Medium | None (docs) | ~30 min |
| F-5 | Case-sensitive email uniqueness | Service-layer normalization | 🟡 Medium | None | ~30 min |
| F-7 | `Decimal` serialization | Shared money mapper at controller boundary | 🟡 Medium | None | ~1 h |
| F-6 | `@db.Time(0)` date-part footgun | Switch to `Int` minutes (recommended) or guarded helper | 🟢 Low | Optional column change | 1–2 h (option B) |

---

## F-2 — DB CHECK Constraints Missing (🔴 High)

**Issue:** The design doc specifies DB-level rules — `wage > 0`, `end_date ≥ start_date`, `break_minutes ≥ 0`, `date_to ≥ date_from`, `allocated_days > 0`, `days > 0`. Prisma cannot express CHECK constraints, so currently nothing stops bad data from entering via any write path that bypasses the service layer (seeds, scripts, manual SQL, future bugs).

**Best fix — both layers (defense in depth):**
1. Add a raw-SQL migration after the Prisma migration:

```sql
-- migration: add_check_constraints
ALTER TABLE contracts
  ADD CONSTRAINT contracts_wage_positive CHECK (wage > 0),
  ADD CONSTRAINT contracts_date_range CHECK (end_date IS NULL OR end_date >= start_date);

ALTER TABLE schedule_lines
  ADD CONSTRAINT schedule_lines_break_non_negative CHECK (break_minutes >= 0);

ALTER TABLE time_off_requests
  ADD CONSTRAINT time_off_requests_date_range CHECK (date_to >= date_from),
  ADD CONSTRAINT time_off_requests_days_positive CHECK (days > 0);

ALTER TABLE time_off_allocations
  ADD CONSTRAINT time_off_allocations_days_positive CHECK (allocated_days > 0);
```

2. Keep equivalent zod validations in the service layer (you need these anyway for clean 400 responses).

**Impact:**
- ✅ Data integrity becomes unconditional — impossible to corrupt money/date invariants regardless of code path.
- ✅ Zero runtime cost; constraints are declarative.
- ⚠️ Violations surface as Prisma error `P2010` (raw query) / DB error `23514` — the error handler must map them to `400 VALIDATION_ERROR`, not 500.
- ⚠️ Seeds must respect the constraints (they already do per the seed spec).
- Trade-off accepted: constraints live outside `schema.prisma`, so a future `prisma migrate dev` regeneration won't include them — document them in the migration folder (the plan's forward-only migration strategy already covers this).

---

## F-4 — Contract-Overlap Race Condition (🔴 High)

**Issue:** The rule "no two ACTIVE contracts may overlap for the same employee" is service-enforced only. Two concurrent create/update requests can both pass the read-check and insert overlapping contracts — silently corrupting the payroll hot path (`findApplicableContract` returns AMBIGUOUS_CONTRACT for every future payrun).

**Best fix — PostgreSQL exclusion constraint as the hard guarantee:**

```sql
-- migration: add_contract_overlap_exclusion
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_no_overlapping_active
  EXCLUDE USING gist (
    employee_id WITH =,
    daterange(start_date, COALESCE(end_date, DATE 'infinity'), '[)') WITH &&
  ) WHERE (status = 'ACTIVE');
```

Plus: keep the service-level pre-check (for a friendly 409 `CONTRACT_OVERLAP` with a clear message) and wrap create/update in `prisma.$transaction` with a re-check inside the transaction.

**Impact:**
- ✅ Overlap becomes *impossible* at the DB level — the strongest possible guarantee, immune to concurrency.
- ✅ The service pre-check still gives users the clean 409; the constraint is the backstop that turns any race into a caught DB error instead of silent corruption.
- ⚠️ Requires `btree_gist` extension (standard, built into PG16 — `CREATE EXTENSION` needs an owner role; works in local/docker by default).
- ⚠️ Error mapping: Prisma `P2010`/`23514` on contracts writes → `409 CONTRACT_OVERLAP`.
- ⚠️ Trade-off: constraint lives outside Prisma schema (same caveat as F-2).
- ⚠️ Edge case: the check must *exclude the row being updated* (`AND id <> $self.id`) in the service pre-check; the exclusion constraint handles updates natively.

---

## D-1 — Duplicate `sequence` Behavior Undecided (🔴 High — decision, not code volume)

**Issue:** v1.1 removed `UNIQUE(structure_id, sequence)` from the schema (correct), but TASK-012's AC still says "duplicate sequence… rejected with 422". The schema now permits duplicates; the task forbids them. Unresolved, this produces a failed acceptance test and non-deterministic-looking rule execution.

**Best fix — enforce uniqueness in `validateRules()` at save time:**
- `validateRules()` (already called on every structure save per the engine contract) adds: duplicate `sequence` within the rule set → `{ valid: false, errors: [{ rule_code, message: "Duplicate sequence" }] }` → `422 VALIDATION_ERROR`.
- Execution ordering remains `ORDER BY sequence ASC, id ASC` (stable, deterministic even if a duplicate ever slips in via seed/fix).
- Update TASK-012's AC wording to "rejected at rule-save via `validateRules`" so the doc matches reality.

**Impact:**
- ✅ Zero schema change; uses the validation hook that already exists in the architecture.
- ✅ Keeps execution deterministic and payslip line ordering stable.
- ⚠️ Duplicate sequences in legacy/seed data would fail on next save — the seed already uses distinct sequences (10/20/30/…), so no impact.

---

## F-3 — Missing Partial Index on Active Contracts (🟡 Medium)

**Issue:** Design doc specifies `(employee_id) WHERE status='ACTIVE'` partial index to serve the active-contract lookup/uniqueness check. Prisma can't declare partial indexes.

**Best fix — raw-SQL migration (cheap, do it while doing F-2/F-4):**

```sql
-- migration: add_active_contract_partial_index
CREATE INDEX contracts_active_by_employee_idx
  ON contracts (employee_id)
  WHERE status = 'ACTIVE';
```

**Impact:**
- ✅ The hottest query in payroll (period-contract resolution per employee per compute) scans only ACTIVE rows; smaller index, faster lookups on the payrun hot path.
- ⚠️ Trade-off: same "outside schema.prisma" caveat as F-2/F-4.
- ℹ️ Honest note: at 12 seeded employees the performance gain is negligible — this is about doing it right once rather than re-migrating later. Safe to defer to P1 if time-pressed.

---

## F-1 — `RefreshToken` Table Undocumented (🟡 Medium — docs only)

**Issue:** The schema adds a 20th table (`refresh_tokens`) that the design doc ("19 tables") doesn't describe. The table itself is *correct and necessary* — 07-SECURITY-RBAC requires revocable sessions with rotation.

**Best fix — documentation patch (no schema change):**
1. Add a `### refresh_tokens` section to `03-DATABASE-DESIGN.md` (fields: `user_id FK CASCADE`, `token_hash UNIQUE varchar(64)` = sha256 hex, `expires_at`, `revoked_at`) and update the table count.
2. Record it as **ADR-009: "Dedicated refresh_tokens table for revocable JWT sessions"** — context: stateless JWTs can't be revoked; options (in-memory denylist / JWT jti table / hashed-token table); chosen: hashed-token table; trade-off: one DB read per refresh (acceptable — refresh is infrequent vs API calls).
3. Update the master plan's "19 tables" mentions.

**Impact:**
- ✅ Docs and reality re-align; Agent 3/4 get an accurate data model.
- ✅ ADR captures *why* the table exists so it isn't "cleaned up" later by mistake.
- ⚠️ Optional hygiene (P2): a startup/cron cleanup `DELETE FROM refresh_tokens WHERE expires_at < now() OR revoked_at IS NOT NULL AND revoked_at < now() - interval '7 days'` — not needed for demo.

---

## F-5 — Case-Sensitive Email Uniqueness (🟡 Medium)

**Issue:** `User.email @unique` is case-sensitive; the design specifies `lower(email)` uniqueness. `A@x.com` and `a@x.com` can coexist, and login becomes case-dependent.

**Best fix — normalize at the service layer (do NOT add a second functional unique index):**
- On **create/update**: store `email.trim().toLowerCase()` (enforce in the zod schema via `.transform()`).
- On **login**: compare against `email.toLowerCase()`.
- Keep the single Prisma `@unique` — it then guarantees case-insensitive uniqueness *because all stored values are lowercase*.

**Impact:**
- ✅ One rule (normalize at the boundary), zero migration, keeps Prisma's `P2002` error mapping for the 409/duplicate path.
- ⚠️ Requires a one-time data cleanup if any non-lowercase emails are already seeded (`UPDATE users SET email = lower(email)` — run before first seed or as part of it).
- ❌ Rejected alternative: a functional unique index `ON users (lower(email))` alongside `@unique` — two overlapping unique constraints with confusing error semantics; not worth it for this scale.

---

## F-7 — `Decimal` Serialization at the API Boundary (🟡 Medium)

**Issue:** Every money field (`wage`, `gross`, `net`, amounts…) comes out of Prisma as a **decimal.js `Decimal` object**, not a JS number. Naive `JSON.stringify` serializes it as a *string* (`"50000.00"`), and naive arithmetic on it silently falls back to object coercion bugs. This is the most common first-integration failure with Prisma + money.

**Best fix — one shared mapper, applied at the controller/serializer boundary:**
- Add `shared/serializers.ts` with `toMoney(d: Decimal): number { return d.toNumber() }` (safe: 2-dp values up to ~90 trillion are exact in float64) and use it in every response serializer for money/rate fields.
- Rule of thumb enforced in standards: **Decimal inside the service layer (exact math), number at the API edge (display), never arithmetic on values after serialization.**
- The frontend formats with `Intl.NumberFormat('en-IN')` per the frontend architecture doc — it already expects numbers.
- zod response schemas declare money as `z.number()`; request schemas accept `z.number()` and services convert to `Decimal` (or let Prisma do it) with 2-dp rounding.

**Impact:**
- ✅ Prevents a whole class of "payslip shows 0 / NaN / string" bugs during integration week.
- ✅ Single choke point = one place to change if precision requirements grow.
- ⚠️ Trade-off: `toNumber()` is exact only ≤ 2^53/100 — fine for this domain (max wage field is 14,2); anything beyond would need string serialization (documented in the helper's JSDoc).

---

## F-6 — `@db.Time(0)` Date-Part Footgun (🟢 Low — two options)

**Issue:** `ScheduleLine.startTime/endTime` are `DateTime` mapped to SQL `TIME`. Prisma returns them as `Date` objects anchored to **1970-01-01**. Any code that touches the date part (or compares them against real timestamps) silently misbehaves; timezone settings can shift the time during serialization.

**Option A (recommended) — switch to Int minutes:**
```prisma
model ScheduleLine {
  // ...
  startMinutes Int @map("start_time")   // minutes from 00:00, e.g. 540 = 09:00
  endMinutes   Int @map("end_time")     // e.g. 1080 = 18:00
  breakMinutes Int @default(0) @map("break_minutes")
}
```
- Weekly hours = `Σ((end − start − break) / 60)` — pure integer arithmetic, no timezone, no parsing.
- Frontend converts minutes ⇄ `HH:mm` in one small util.
- **Impact:** small schema change + seed/data update + UI conversion helper; eliminates the entire bug class. Migration cost ~1–2 h. Recommended *now*, before seeds exist — trivially cheap; after seeds, slightly annoying.

**Option B — keep `@db.Time(0)` with a guarded helper:**
- One pure helper `lineToMinutes(line): number` is the *only* code allowed to read `startTime/endTime`; unit-test it with TZ set to both UTC and `Asia/Kolkata`.
- **Impact:** zero migration, but a permanent convention ("nobody touches the Date directly") that must be enforced in review — the footgun survives.

---

## What NOT to Change (explicitly verified correct — do not touch)

| Area | Why it's right |
|---|---|
| All 16 enums + values | Exact match with the design doc; no missing states |
| All `onDelete` cascade choices | Match the design's relationship map 10/10; history tables (contracts, attendance, payslips) correctly Restrict |
| `Decimal` precision (14,2 / 9,4 / 6,2 / 5,2) | Correct for money, rates, hours; aligned with ADR-005 |
| `UNIQUE(payrun_id, employee_id)` + `(employee_id, period_start, period_end)` index | Exactly the ADR-008 "duplicates as warnings" pattern |
| `(structure_id, sequence)` as non-unique index | Correct per v1.1 — with D-1 fix, behavior is now consistent |
| Payslip snapshot fields (contract/structure/period/line copies) | History survives any upstream mutation — required for B6 "preserves payroll as historical records" |
| `User.employeeId` unique 1:1 link | Clean basis for the Employee-persona row-level filter |
| Index set on attendance, requests, payslips, warnings, audit | Covers every access pattern in the design's §6 table |

---

## Recommended Execution Order

1. **Now, before first seed:** F-6 Option A (Int minutes) — cheapest window.
2. **With the first migration:** F-2 + F-4 + F-3 as one raw-SQL migration (`add_db_guarantees`).
3. **With engine work (TASK-012/014):** D-1 (`validateRules` duplicate-sequence check) + TASK-012 AC wording update.
4. **With service-layer work (TASK-001/003):** F-5 email normalization in zod; F-7 money mapper in shared serializers.
5. **With documentation pass:** F-1 design-doc patch + ADR-009.

## Final Checklist

- [ ] Raw-SQL migration: CHECK constraints (F-2)
- [ ] Raw-SQL migration: exclusion constraint + `btree_gist` (F-4) + partial index (F-3)
- [ ] Error handler maps `23514`/`P2010` on contracts → `409 CONTRACT_OVERLAP`; on other tables → `400 VALIDATION_ERROR`
- [ ] `validateRules()` rejects duplicate sequences; TASK-012 AC updated (D-1)
- [ ] Email normalized lowercase in zod transform on create + login (F-5)
- [ ] `toMoney()` serializer applied to every money field in responses (F-7)
- [ ] ScheduleLine: Int-minutes decision made and implemented OR guarded helper + tests (F-6)
- [ ] Design doc updated with `refresh_tokens` + ADR-009 recorded (F-1)