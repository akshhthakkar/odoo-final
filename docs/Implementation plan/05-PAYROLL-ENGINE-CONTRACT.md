# PeoplePay360 — Python Payroll Engine Contract (ADR-005)

**Date:** 2026-09-05 · **Service:** FastAPI + uvicorn · **Port:** 8000 (internal: `http://engine:8000`)
**Stateless. No database. No I/O except request parsing. Same input → same output, always.**

---

## 1. Responsibility Boundary

Python **owns:** rule sequencing, condition evaluation, fixed/percentage/formula computation, subtotal assembly (GROSS/DEDUCTIONS/NET), precision/rounding, rule-level warnings.
Python **never:** touches PostgreSQL, decides which employees belong in a payrun, persists anything, sends email/PDF. Node owns all of that.

## 2. Endpoints

| Method & Path | Purpose | Timeout (Node side) |
|---|---|---|
| GET /health | liveness for docker-compose + circuit breaker | 3 s |
| POST /v1/compute-batch | compute payslips for N employees against one rule set | 60 s |
| POST /v1/validate-rules | syntax-check rule set (used by salary config save) | 5 s |

Auth: `X-Engine-Secret` header must equal `ENGINE_SHARED_SECRET` (timing-safe compare) → else 401.

## 3. POST /v1/compute-batch

### Request
```json
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
      "sequence": 60, "computation_type": "FORMULA", "formula": "2000 if gross > 50000 else 0" },
    { "code": "NET",       "name": "Net Salary",       "category": "NET",
      "sequence": 70, "computation_type": "FORMULA", "formula": "GROSS - PF - TAX" }
  ],
  "employees": [
    {
      "ref": "emp-uuid-or-index",
      "inputs": {
        "wage": 50000, "weekly_hours": 40, "worked_days": 20, "worked_hours": 160,
        "overtime_hours": 4, "leave_days": 1
      }
    }
  ]
}
```

### Response 200
```json
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

Line amount convention: **deductions are negative**, earnings positive. `gross` = Σ positive earnings; `deductions` = |Σ negative|; `net` = gross − deductions. Rounding: round each line half-up to 2 decimals; totals = Σ of rounded lines (never recompute from unrounded values).

## 4. Execution Algorithm

```
for employee in employees:
    variables = { "wage", "weekly_hours", "worked_days", "worked_hours",
                  "overtime_hours", "leave_days" } ∪ employee.inputs
    lines, warnings = [], []
    for rule in rules sorted by sequence:
        if rule.condition and not evaluate(condition, variables):
            continue                        # silently skipped
        try:
            amount = compute(rule, variables)   # by computation_type
        except RuleError as e:
            warnings.append(RULE_ERROR(severity=ERROR, msg=e)); mark employee not-ok; continue
        variables[rule.code] = abs(amount)      # later rules can reference earlier codes
        lines.append(line(rule, amount))
    gross = Σ positive earnings lines (category in BASIC/ALLOWANCE)
    deductions = |Σ negative lines (category in DEDUCTION/EMPLOYER_CONTRIB)|
    net = gross - deductions
    return result(ref, gross, deductions, net, lines, warnings)
```

**Computation types:**
- `FIXED` → `fixed_amount`
- `PERCENTAGE` → `variables[base_code] * percentage / 100` — unknown base_code → RULE_ERROR (ERROR)
- `FORMULA` → safe AST evaluation of `formula` over `variables`

**Categories:** BASIC/ALLOWANCE add to gross; GROSS/NET are informational subtotal lines (not double-counted into gross; NET is the final line); DEDUCTION/EMPLOYER_CONTRIB subtract (employer contributions reduce nothing from net but appear on the payslip — they are excluded from `deductions` and from `net`).

## 5. Formula DSL (safe evaluator)

- Grammar: arithmetic over variables — `+ - * / ( )`, numeric literals, variable names `[A-Z_][A-Z0-9_]*`, ternary `X if cond else Y`, comparisons `> >= < <= == !=`.
- **Implementation:** Python `ast.parse` → walk and whitelist node types (`Expression, BinOp, UnaryOp, Num/Constant, Name, Compare, IfExp, BoolOp, operator.Add/Sub/Mult/Div`). Anything else → `RuleError("Forbidden syntax in formula")`. **No `eval`, no `exec`, no `__import__`, no attribute access, no function calls.**
- Variables available: engine built-ins (wage, weekly_hours, worked_days, worked_hours, overtime_hours, leave_days) + every previously computed rule code (by sequence).
- Division by zero → RULE_ERROR (WARNING severity): rule treated as 0.00 with warning, execution continues.
- Unknown variable → RULE_ERROR (ERROR): employee fails, no payslip for them.
- Values: `decimal.Decimal`, division uses quantize to 6 dp mid-calc, final lines 2 dp.

## 6. POST /v1/validate-rules

Request: `{ "rules": [...] }`. Response: `{ "valid": true }` or `{ "valid": false, "errors": [{ "rule_code", "message" }] }`. Checks: unique codes, unique sequences, required fields per computation_type, formula/condition syntax, percentage base_code resolvable to an earlier sequence or input, category/sequence sanity (GROSS after all earnings it references, NET last). **Node calls this on every salary structure save** — invalid config never reaches the engine at compute time.

## 7. Error Handling & Failure Modes

| Failure | Engine behavior | Node behavior |
|---|---|---|
| Bad secret | 401 | logged, 500 masked |
| Malformed request | 422 with field details | 500 masked, logged |
| Per-employee rule error | `ok:false` for that employee only; others computed | ERROR warning + no payslip for that employee |
| Whole-rule-set error (e.g. every employee fails) | all `ok:false` | 422 ENGINE_RULE_ERROR |
| Timeout / connection refused | — | 1 retry (only for network/5xx), then 503 ENGINE_UNAVAILABLE; payrun stays DRAFT, nothing persisted |
| 30 s circuit (5 consecutive engine failures) | — | open circuit → immediate 503; half-open probe after 30 s |

## 8. Testing Requirements (pytest)

- Each computation type: fixed, percentage (incl. unknown base), formula (arithmetic, ternary, nested).
- Sequencing: NET after PF/TAX; rule referencing earlier code; GROSS not double-counted.
- Conditions: rule skipped when condition false.
- Warnings: division-by-zero, unknown variable.
- Rounding: ₹ amounts half-up 2 dp; totals = Σ rounded lines.
- Safety: formula containing `__import__`, attribute access, or call → rejected.
- Idempotency: same request twice → byte-identical responses.
