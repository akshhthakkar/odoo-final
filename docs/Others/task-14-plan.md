# TASK-014 — Pure In-Process Payroll Engine (Plan)

## 1. Current State (verified 2026-09-05)

Engine source is ALREADY WRITTEN (5 files, ~640 lines) and matches ADR-005 / 05-PAYROLL-ENGINE-CONTRACT.md:

| File | What it does |
|---|---|
| `backend/src/engine/executor/index.js` | `buildVariables()`, `runRuleSequence()`, `computeBatch()` — zod boundary, sequenced execution, HALF-UP 2dp rounding, totals from rounded lines |
| `backend/src/engine/formula/index.js` | Handwritten tokenizer + recursive-descent parser; strict whitelist (numbers, idents, arithmetic, comparisons, AND/OR/NOT, ternary); Decimal-only math; div-by-zero → 0 + WARNING |
| `backend/src/engine/validator/index.js` | `validateRules()` — dup codes/sequences, per-type required fields, base_code must resolve to earlier sequence or input, GROSS after earnings, NET highest sequence |
| `backend/src/engine/types/index.js` | COMPUTATION_TYPES, RULE_CATEGORIES, WARNING_SEVERITIES, ENGINE_VARIABLES |
| `backend/src/engine/index.js` | barrel export |

Missing per the task AC: **the entire test suite** (contract §8) and the board update.

**Language decision:** roadmap said "TypeScript", codebase is Express+JS. `00-MASTER-PLAN.md` already renames the task "...JavaScript Payroll Engine Module". KEEP JS. No rewrite.

**Purity review done:** only imports in `engine/` are decimal.js + zod; no fs/http/prisma/process.env/Date.now/Math.random.

## 2. Two Small Engine Fixes (found by tracing tests against the code)

### Fix 1 — BUG: rule warnings run outside the try/catch

`executor/index.js:90` calls `computeRuleWarnings()` BEFORE the try block. A formula with an
unknown variable throws out of `runRuleSequence` → crashes the whole batch, violating contract
§7 ("per-employee rule error → ok:false, others computed"). The ₹50,000 case doesn't hit this,
but any HR formula typo takes down the entire payrun.

```js
// BEFORE (lines 89-93)
    warnings.push(...computeRuleWarnings(rule, variables));

    try {
      const raw = computeRuleAmount(rule, variables);

// AFTER — move one line inside the existing try; the catch already does the right thing
    try {
      warnings.push(...computeRuleWarnings(rule, variables));
      const raw = computeRuleAmount(rule, variables);
```

No other change needed: if `computeRuleWarnings` throws, the existing catch pushes
`RULE_ERROR (ERROR)` and marks the employee `ok:false`. Div-by-zero WARNINGs still flow
through normally (they are returned, not thrown).

### Fix 2 — `EngineInputError` not exported from the barrel

Callers can't catch it by type. One line in `engine/index.js`:

```js
export { runRuleSequence, computeBatch, buildVariables, EngineInputError } from './executor/index.js';
```

## 3. Remaining Work

| # | Work | File |
|---|---|---|
| 1 | Fix 1 + Fix 2 (above) | `engine/executor/index.js`, `engine/index.js` |
| 2 | Engine unit test suite — full code in §4 | `backend/tests/engine.test.js` (NEW) |
| 3 | Board update | `00-MASTER-PLAN.md` §6: TASK-014 → Done |

## 4. Test File (complete — write verbatim)

`backend/tests/engine.test.js`. Pure imports only: no HTTP, no DB, no app import.

```js
import { describe, it, expect } from 'vitest';
import {
  computeBatch,
  validateRules,
  parseExpression,
  evaluateFormula,
  RuleError,
  EngineInputError,
} from '../src/engine/index.js';

const STD_RULES = [
  { code: 'BASIC', name: 'Basic', category: 'BASIC', sequence: 10, computation_type: 'FORMULA', formula: 'wage' },
  { code: 'HRA', name: 'House Allowance', category: 'ALLOWANCE', sequence: 20, computation_type: 'PERCENTAGE', percentage: 20, base_code: 'BASIC' },
  { code: 'TRANSPORT', name: 'Transport', category: 'ALLOWANCE', sequence: 30, computation_type: 'FIXED', fixed_amount: 3000 },
  { code: 'GROSS', name: 'Gross', category: 'GROSS', sequence: 40, computation_type: 'FORMULA', formula: 'BASIC + HRA + TRANSPORT' },
  { code: 'PF', name: 'Provident Fund', category: 'DEDUCTION', sequence: 50, computation_type: 'PERCENTAGE', percentage: 12, base_code: 'BASIC' },
  { code: 'TAX', name: 'Income Tax', category: 'DEDUCTION', sequence: 60, computation_type: 'FORMULA', formula: 'GROSS > 50000 ? 2000 : 0' },
  { code: 'NET', name: 'Net Salary', category: 'NET', sequence: 70, computation_type: 'FORMULA', formula: 'GROSS - PF - TAX' },
];

const BASE_INPUTS = { wage: 50000, weekly_hours: 40, worked_days: 20, worked_hours: 160, overtime_hours: 0, leave_days: 0 };
const emp = (ref = 'e1', over = {}) => ({ ref, inputs: { ...BASE_INPUTS, ...over } });
const run = (rules, employees = [emp()]) => computeBatch({ rules, employees });

describe('spec case (contract section 3)', () => {
  it('computes the 50,000 example exactly', () => {
    const r = run(STD_RULES).results[0];
    expect(r.ok).toBe(true);
    expect(r.gross).toBe(63000);
    expect(r.deductions).toBe(8000);
    expect(r.net).toBe(55000);
    expect(r.warnings).toEqual([]);
    expect(r.lines.map((l) => [l.code, l.amount])).toEqual([
      ['BASIC', 50000],
      ['HRA', 10000],
      ['TRANSPORT', 3000],
      ['GROSS', 63000],
      ['PF', -6000],
      ['TAX', -2000],
      ['NET', 55000],
    ]);
  });
});

describe('computation types', () => {
  it('FIXED uses fixed_amount directly', () => {
    const rules = [{ code: 'BONUS', name: 'Bonus', category: 'ALLOWANCE', sequence: 10, computation_type: 'FIXED', fixed_amount: 1500 }];
    expect(run(rules).results[0].lines[0].amount).toBe(1500);
  });

  it('PERCENTAGE computes from its base variable', () => {
    const rules = [{ code: 'HRA', name: 'HRA', category: 'ALLOWANCE', sequence: 10, computation_type: 'PERCENTAGE', percentage: 25, base_code: 'wage' }];
    expect(run(rules).results[0].lines[0].amount).toBe(12500);
  });

  it('PERCENTAGE with unknown base fails that employee with RULE_ERROR', () => {
    const rules = [{ code: 'HRA', name: 'HRA', category: 'ALLOWANCE', sequence: 10, computation_type: 'PERCENTAGE', percentage: 20, base_code: 'NOPE' }];
    const r = run(rules).results[0];
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatchObject({ code: 'RULE_ERROR', severity: 'ERROR' });
    expect(r.lines).toEqual([]);
  });

  it('FORMULA supports nested ternary and parentheses', () => {
    const rules = [{ code: 'TAX', name: 'Tax', category: 'DEDUCTION', sequence: 10, computation_type: 'FORMULA', formula: '(wage > 60000) ? 2000 : (wage > 40000 ? 1000 : 0)' }];
    expect(run(rules).results[0].lines[0].amount).toBe(-1000);
  });
});

describe('sequencing', () => {
  it('executes rules by sequence regardless of array order', () => {
    expect(run([...STD_RULES].reverse()).results[0]).toEqual(run(STD_RULES).results[0]);
  });
});

describe('conditions', () => {
  const rule = (condition) => ({ code: 'OT', name: 'Overtime', category: 'ALLOWANCE', sequence: 10, computation_type: 'FIXED', fixed_amount: 500, condition });

  it('skips the rule when the condition is false', () => {
    expect(run([rule('OVERTIME_HOURS > 0')]).results[0].lines).toEqual([]);
  });

  it('keeps the rule when the condition is true', () => {
    const r = run([rule('OVERTIME_HOURS > 0')], [emp('e1', { overtime_hours: 4 })]).results[0];
    expect(r.lines[0].amount).toBe(500);
  });

  it('flags a broken condition as RULE_ERROR instead of crashing', () => {
    const r = run([rule('OVERTIME_HOURS >')]).results[0];
    expect(r.ok).toBe(false);
    expect(r.warnings[0].severity).toBe('ERROR');
  });
});

describe('warnings', () => {
  it('treats division by zero as 0 with a WARNING', () => {
    const rules = [{ code: 'X', name: 'X', category: 'ALLOWANCE', sequence: 10, computation_type: 'FORMULA', formula: 'wage / 0' }];
    const r = run(rules).results[0];
    expect(r.lines[0].amount).toBe(0);
    expect(r.ok).toBe(true);
    expect(r.warnings[0].severity).toBe('WARNING');
  });

  it('unknown variable in a formula is an ERROR, not a crash', () => {
    const rules = [{ code: 'X', name: 'X', category: 'ALLOWANCE', sequence: 10, computation_type: 'FORMULA', formula: 'BONOS + 1' }];
    const r = run(rules).results[0];
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatchObject({ code: 'RULE_ERROR', severity: 'ERROR', message: expect.stringContaining('BONOS') });
  });

  it('invalid employee inputs fail only that employee', () => {
    const { results } = run(STD_RULES, [emp('bad', { wage: -1 }), emp('good', { wage: 10000 })]);
    expect(results[0].ok).toBe(false);
    expect(results[1].ok).toBe(true);
    expect(results[1].net).toBe(13800);
  });
});

describe('rounding', () => {
  it('rounds each line half-up to 2 dp and totals the rounded lines', () => {
    const rules = [
      { code: 'A1', name: 'A1', category: 'ALLOWANCE', sequence: 10, computation_type: 'PERCENTAGE', percentage: 10, base_code: 'wage' },
      { code: 'A2', name: 'A2', category: 'ALLOWANCE', sequence: 20, computation_type: 'PERCENTAGE', percentage: 10, base_code: 'wage' },
    ];
    const r = run(rules, [emp('e1', { wage: 0.05 })]).results[0];
    expect(r.lines.map((l) => l.amount)).toEqual([0.01, 0.01]);
    expect(r.gross).toBe(0.02);
  });
});

describe('formula DSL safety', () => {
  it.each(['obj.prop', 'arr[0]', 'fn()', '{}', '[]', 'x = 1', 'a; b'])('parse-rejects %s', (expr) => {
    expect(() => parseExpression(expr)).toThrow(RuleError);
  });

  it.each(['__proto__', 'constructor', 'import', 'require'])('eval-rejects %s as unknown variable', (expr) => {
    expect(() => evaluateFormula(expr, { wage: 1 })).toThrow(/Unknown variable/);
  });
});

describe('purity', () => {
  it('returns deep-equal results for identical requests', () => {
    expect(run(STD_RULES, [emp()])).toEqual(run(STD_RULES, [emp()]));
  });

  it('does not mutate its inputs', () => {
    const rules = JSON.parse(JSON.stringify(STD_RULES));
    const employees = [emp(), emp('e2', { wage: 10000 })];
    const rulesBefore = JSON.stringify(rules);
    const employeesBefore = JSON.stringify(employees);
    run(rules, employees);
    expect(JSON.stringify(rules)).toBe(rulesBefore);
    expect(JSON.stringify(employees)).toBe(employeesBefore);
  });
});

describe('input boundary', () => {
  it('throws EngineInputError on a malformed batch', () => {
    expect(() => computeBatch({ rules: [], employees: [] })).toThrow(EngineInputError);
  });
});

describe('validateRules', () => {
  it('accepts the standard rule set', () => {
    expect(validateRules(STD_RULES)).toEqual({ valid: true, errors: [] });
  });

  it('rejects duplicate codes', () => {
    const rules = [
      { code: 'A', name: 'A', category: 'ALLOWANCE', sequence: 10, computation_type: 'FIXED', fixed_amount: 1 },
      { code: 'A', name: 'A2', category: 'ALLOWANCE', sequence: 20, computation_type: 'FIXED', fixed_amount: 2 },
    ];
    expect(validateRules(rules).valid).toBe(false);
  });

  it('rejects duplicate sequences', () => {
    const rules = [
      { code: 'B', name: 'B', category: 'ALLOWANCE', sequence: 10, computation_type: 'FIXED', fixed_amount: 1 },
      { code: 'C', name: 'C', category: 'ALLOWANCE', sequence: 10, computation_type: 'FIXED', fixed_amount: 2 },
    ];
    expect(validateRules(rules).valid).toBe(false);
  });

  it('rejects unknown variables in formulas', () => {
    const rules = [{ code: 'A', name: 'A', category: 'ALLOWANCE', sequence: 10, computation_type: 'FORMULA', formula: 'MYSTERY + 1' }];
    expect(validateRules(rules).valid).toBe(false);
  });

  it('rejects a base_code defined at a later sequence', () => {
    const rules = [
      { code: 'A', name: 'A', category: 'ALLOWANCE', sequence: 10, computation_type: 'PERCENTAGE', percentage: 10, base_code: 'B' },
      { code: 'B', name: 'B', category: 'ALLOWANCE', sequence: 20, computation_type: 'FIXED', fixed_amount: 1 },
    ];
    expect(validateRules(rules).valid).toBe(false);
  });

  it('rejects a NET rule that is not last', () => {
    const rules = STD_RULES.map((r) => ({ ...r, sequence: r.code === 'NET' ? 5 : r.sequence }));
    expect(validateRules(rules).valid).toBe(false);
  });

  it('rejects an empty rule set', () => {
    expect(validateRules([]).valid).toBe(false);
  });
});
```

### Why these tests are correct (traced against the implementation)

- Spec case: GROSS category is NOT counted in `gross` (only BASIC/ALLOWANCE), deductions stored
  as positive `abs()` in the variable map so `GROSS - PF - TAX` = 55000 works.
- `parse-rejects` vs `eval-rejects` split: `__proto__`/`import`/etc. tokenize fine as plain
  identifiers and are stopped at evaluation by the `hasOwnProperty` variable check — that is
  the designed safety net, not a hole.
- Rounding: `new Decimal(0.05)` is exact, `10% → 0.005`, HALF_UP → `0.01` per line, so gross
  is `0.02` (unrounded sum would be `0.01`) — proves totals come from rounded lines.
- Isolation test: wage −1 fails the zod input schema for that ref only; other employee's
  10000 wage → 15000 gross − 1200 PF − 0 TAX = 13800 net.

## 5. Verification

```bash
cd backend
npx vitest run tests/engine.test.js   # all green
npx vitest run                        # whole suite (health + engine) still green
```

Then update `00-MASTER-PLAN.md` §6: TASK-014 → Done.

## 6. Out of Scope

- No engine rewrites, no TS migration, no new features — the 2 one-line fixes + tests only.
- Orchestration/DB wiring is TASK-013 (done). Payslip persistence is TASK-015.
