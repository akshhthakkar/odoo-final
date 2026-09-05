# Pay365 — Payroll Calculation Engine Contract (TypeScript, in-process) (ADR-005, revised v1.1)

**Date:** 2026-09-05 · **Module:** `apps/api/src/engine/` (TypeScript) inside the Node.js + Express backend
**Pure function library. No database. No HTTP. No I/O of any kind. Same input → same output, always.**
Previously (v1.0) a dedicated Python/FastAPI service — relocated in-process; the compute contract below is unchanged.

---

## 1. Responsibility Boundary & Engine Invariants

The engine **owns:** rule sequencing, condition evaluation, fixed/percentage/formula computation, subtotal assembly (GROSS/DEDUCTIONS/NET), precision/rounding, rule-level warnings.
The engine **never:** touches PostgreSQL, decides which employees belong in a payrun, queries contracts, resolves date overlaps, persists anything, sends email/PDF, or performs any I/O. Node application services (`payroll-run` and `payroll-config`) own all of that orchestration and pass a sanitized, flat variable map into the engine.

### Strict Engine Invariants
1. **Pure Function:** $f(\text{Input}, \text{Rules}) = \text{Output}$. No side effects.
2. **Deterministic:** Given the same input and rules, the output is byte-for-byte identical every single time.
3. **Idempotent:** Executing calculation multiple times yields identical results.
4. **Zero I/O & Isolation:**
   - ❌ No Database access (Prisma / SQL)
   - ❌ No HTTP / Network calls
   - ❌ No Filesystem operations
   - ❌ No Process Environment (`process.env`) access
   - ❌ No Global mutable state
   - ❌ No non-deterministic functions (`Date.now()`, `Math.random()`, `crypto.randomUUID()`)
5. **Contract Resolution Outside Engine:** The Node orchestration service resolves the active contract, collects attendance/leave/schedule aggregates, and passes pure numbers to the engine.

## 2. Public API (exported functions)

| Export | Purpose | Returns |
|---|---|---|
| `computeBatch(request: ComputeBatchRequest): ComputeBatchResponse` | compute payslip results for N employees against one rule set | per-employee results (lines, totals, warnings) |
| `validateRules(rules: SalaryRule[]): ValidationResult` | syntax-check a rule set (used by salary config save) | `{ valid, errors[] }` |

Both are synchronous pure functions validated by zod schemas. Inputs are validated with zod at the module boundary; malformed input throws a typed `EngineInputError` (mapped to 500 by the caller).

## 3. computeBatch Contract

### Request
```ts
{
  "period": { "start": "2026-09-01", "end": "2026-09-30" },
  "rules": [
    { "code": "BASIC",     "name": "Basic",            "category": "BASIC",
      "sequence": 10, "computation_type": "FIXED", "fixed_amount": null,
      "percentage": null, "base_code": null, "formula": "wage",
      "condition": null, "appears_on_payslip": true },
    { "code": "HRA",       "name": "House Allowance",  "category": "ALLOWANCE",
      "sequence": 20, "computation_type": "PERCENTAGE", "percentage": 20, "base_code": "BASIC" },
    { "code": "TRANSPORT", "name": "Transport",        "category": "ALLOWANCE",
      "sequence": 30, "computation_type": "FIXED", "fixed_amount": 3000 },
    { "code": "GROSS",     "name": "Gross",            "category": "GROSS",
      "sequence": 40, "computation_type": "FORMULA", "formula": "BASIC + HRA + TRANSPORT",
      "appears_on_payslip": true },
    { "code": "PF",        "name": "Provident Fund",   "category": "DEDUCTION",
      "sequence": 50, "computation_type": "PERCENTAGE", "percentage": 12, "base_code": "BASIC",
      "appears_on_payslip": true },
    { "code": "TAX",       "name": "Income Tax",       "category": "DEDUCTION",
      "sequence": 60, "computation_type": "FORMULA", "formula": "GROSS > 50000 ? 2000 : 0" },
    { "code": "NET",       "name": "Net Salary",       "category": "NET",
      "sequence": 70, "computation_type": "FORMULA", "formula": "GROSS - PF - TAX" }
  ],
  "employees": [
    {
      "ref": "emp-uuid-or-index",
      "inputs": {
        "wage": 50000.00,
        "weekly_hours": 40,
        "worked_days": 20,
        "worked_hours": 160,
        "overtime_hours": 4,
        "leave_days": 1
      }
    }
  ]
}
```

### Response
```ts
{
  "results": [
    {
      "ref": "emp-uuid-or-index",
      "ok": true,
      "gross": 63000.00,
      "deductions": 8000.00,
      "net": 55000.00,
      "lines": [
        { "code": "BASIC",     "name": "Basic",           "category": "BASIC",     "sequence": 10, "amount": 50000.00 },
        { "code": "HRA",       "name": "House Allowance", "category": "ALLOWANCE", "sequence": 20, "amount": 10000.00 },
        { "code": "TRANSPORT", "name": "Transport",       "category": "ALLOWANCE", "sequence": 30, "amount": 3000.00 },
        { "code": "GROSS",     "name": "Gross",           "category": "GROSS",     "sequence": 40, "amount": 63000.00 },
        { "code": "PF",        "name": "Provident Fund",  "category": "DEDUCTION", "sequence": 50, "amount": -6000.00 },
        { "code": "TAX",       "name": "Income Tax",      "category": "DEDUCTION", "sequence": 60, "amount": -2000.00 },
        { "code": "NET",       "name": "Net Salary",      "category": "NET",       "sequence": 70, "amount": 55000.00 }
      ],
      "warnings": []
    },
    {
      "ref": "emp-2", "ok": false, "lines": [],
      "warnings": [ { "code": "RULE_ERROR", "severity": "ERROR",
                      "message": "Unknown variable 'BONOS' in rule TAX" } ]
    }
  ]
}
```

Line amount convention: **deductions are negative**, earnings positive. `gross` = Σ positive earnings; `deductions` = |Σ negative|; `net` = gross − deductions. Rounding: round each line using `decimal.js` with `Decimal.ROUND_HALF_UP` to **2 decimal places**; totals = Σ of rounded lines (never recompute from unrounded values).

## 4. Execution Algorithm & Isolated Variable Map

```
for employee in employees:
    # Fixed flat variable map — NO employee object traversal, NO prototype chain
    variables = {
        "wage": employee.inputs.wage,
        "CONTRACT_WAGE": employee.inputs.wage,
        "weekly_hours": employee.inputs.weekly_hours,
        "worked_days": employee.inputs.worked_days,
        "WORKED_DAYS": employee.inputs.worked_days,
        "worked_hours": employee.inputs.worked_hours,
        "overtime_hours": employee.inputs.overtime_hours,
        "OVERTIME_HOURS": employee.inputs.overtime_hours,
        "leave_days": employee.inputs.leave_days,
        "LEAVE_DAYS": employee.inputs.leave_days
    }
    lines, warnings = [], []
    for rule in rules sorted by sequence:
        if rule.condition and not evaluate(condition, variables):
            continue                        # silently skipped
        try:
            amount = compute(rule, variables)   # by computation_type
        except RuleError as e:
            warnings.append(RULE_ERROR(severity=ERROR, msg=e.message)); mark employee not-ok; continue
        variables[rule.code] = abs(amount)      # later rules can reference earlier codes
        lines.append(line(rule, amount))
    gross = Σ positive earnings lines (category in BASIC/ALLOWANCE)
    deductions = |Σ negative lines (category in DEDUCTION/EMPLOYER_CONTRIB)|
    net = gross - deductions
    return result(ref, gross, deductions, net, lines, warnings)
```

## 5. Explicitly Bounded Formula DSL

The formula evaluator uses a strict handwritten tokenizer and recursive-descent AST parser.

### Explicit Supported Grammar:
- **Numbers:** Decimal/integer literals (`50000`, `12.5`, `0.05`)
- **Identifiers / Variables:** `[A-Z_][A-Z0-9_]*` (resolved against the isolated variable map)
- **Arithmetic Operators:** `+`, `-`, `*`, `/`
- **Comparison Operators:** `>`, `>=`, `<`, `<=`, `==`, `!=`
- **Logical Operators:** `AND`, `OR`, `NOT`, `&&`, `||`, `!`
- **Parentheses:** `(` and `)` for grouping
- **Ternary Operator:** `condition ? value_if_true : value_if_false`

### Explicitly Rejected Syntax (Hard Parser Failure):
- ❌ **Function calls:** `fn()`, `alert()`, `console.log()`
- ❌ **Property access:** `obj.prop`, `arr[0]`, `foo['bar']`
- ❌ **Arrays / Object literals:** `[]`, `{}`
- ❌ **Loops & Statements:** `for`, `while`, `do`, `let`, `var`, `const`
- ❌ **Module imports:** `import`, `require`
- ❌ **Assignments:** `=`, `+=`, `-=`
- ❌ **Prototype / Reflection:** `__proto__`, `constructor`, `prototype`, `Reflect`
- ❌ **General JavaScript statements:** No arbitrary JS syntax or closures.

Values are evaluated strictly using `decimal.js` Decimal instances. Mid-calculation operations quantize to 6 decimal places, with final line amounts rounded half-up to 2 decimal places. Unknown variables trigger a fatal `RULE_ERROR (ERROR)` for that employee; division by zero is safely trapped as `0.00` with a `RULE_ERROR (WARNING)`.

## 6. validateRules

Input: `SalaryRule[]`. Output: `{ "valid": true }` or `{ "valid": false, "errors": [{ "rule_code", "message" }] }`. Checks: unique codes, unique sequences, required fields per computation_type, formula/condition syntax, percentage base_code resolvable to an earlier sequence or input, category/sequence sanity (GROSS after all earnings it references, NET last). **The `payroll-config` service calls this on every salary structure save** — invalid config never reaches the engine at compute time.

## 7. Error Handling & Failure Modes

Because the engine is an in-process pure module, network/timeout/availability failure modes from v1.0 (retries, circuit breaker, ENGINE_UNAVAILABLE, shared secret) no longer exist.

| Failure | Engine behavior | Node (caller) behavior |
|---|---|---|
| Invalid request shape (zod) | throws `EngineInputError` | 500 masked, logged (programmer error) |
| Per-employee rule error | `ok:false` for that employee only; others computed | ERROR warning + no payslip for that employee |
| Whole-rule-set error (e.g. every employee fails) | all `ok:false` | 422 ENGINE_RULE_ERROR |
| Rule validation failure at config save | `validateRules` returns `valid:false` | 422 VALIDATION_ERROR with rule errors — structure not saved |
| Unexpected engine exception | throws | 500, payrun stays DRAFT, nothing persisted |

## 8. Testing Requirements (Vitest — pure unit tests, no HTTP)

- Each computation type: fixed, percentage (incl. unknown base), formula (arithmetic, ternary, nested).
- Sequencing: NET after PF/TAX; rule referencing earlier code; GROSS not double-counted.
- Conditions: rule skipped when condition false.
- Warnings: division-by-zero, unknown variable.
- Rounding: ₹ amounts half-up 2 dp; totals = Σ rounded lines.
- Safety: formula containing `eval`-style injection attempts, property access, or calls → rejected by parser.
- Idempotency/purity: same request twice → deep-equal results; no global state mutated.
- Contract parity: the ₹50,000 spec example returns exactly BASIC 50000 / HRA 10000 / TRANSPORT 3000 / GROSS 63000 / PF −6000 / TAX −2000 / NET 55000.
