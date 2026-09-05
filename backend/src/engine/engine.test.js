import { describe, it, expect } from 'vitest';
import { computeBatch, validateRules } from './index.js';

// The canonical rule set from 05-PAYROLL-ENGINE-CONTRACT.md §3.
const contractRules = [
  { code: 'BASIC', name: 'Basic', category: 'BASIC', sequence: 10, computation_type: 'FORMULA', formula: 'wage' },
  { code: 'HRA', name: 'House Allowance', category: 'ALLOWANCE', sequence: 20, computation_type: 'PERCENTAGE', percentage: 20, base_code: 'BASIC' },
  { code: 'TRANSPORT', name: 'Transport', category: 'ALLOWANCE', sequence: 30, computation_type: 'FIXED', fixed_amount: 3000 },
  { code: 'GROSS', name: 'Gross', category: 'GROSS', sequence: 40, computation_type: 'FORMULA', formula: 'BASIC + HRA + TRANSPORT' },
  { code: 'PF', name: 'Provident Fund', category: 'DEDUCTION', sequence: 50, computation_type: 'PERCENTAGE', percentage: 12, base_code: 'BASIC' },
  { code: 'TAX', name: 'Income Tax', category: 'DEDUCTION', sequence: 60, computation_type: 'FORMULA', formula: 'GROSS > 50000 ? 2000 : 0' },
  { code: 'NET', name: 'Net Salary', category: 'NET', sequence: 70, computation_type: 'FORMULA', formula: 'GROSS - PF - TAX' },
];

const contractInputs = { wage: 50000, weekly_hours: 40, worked_days: 20, worked_hours: 160, overtime_hours: 4, leave_days: 1 };

const compute = (rules, inputs) =>
  computeBatch({ rules, employees: [{ ref: 'emp-1', inputs }] }).results[0];

describe('contract parity (₹50,000 spec example)', () => {
  it('returns exactly the amounts from the engine contract', () => {
    const result = compute(contractRules, contractInputs);
    expect(result.ok).toBe(true);
    expect(result.gross).toBe(63000.0);
    expect(result.deductions).toBe(8000.0);
    expect(result.net).toBe(55000.0);
    expect(result.lines.map((l) => [l.code, l.amount])).toEqual([
      ['BASIC', 50000.0],
      ['HRA', 10000.0],
      ['TRANSPORT', 3000.0],
      ['GROSS', 63000.0],
      ['PF', -6000.0],
      ['TAX', -2000.0],
      ['NET', 55000.0],
    ]);
    expect(result.warnings).toEqual([]);
  });
});

describe('computation types', () => {
  const rules = [
    { code: 'WAGE', name: 'Wage', category: 'BASIC', sequence: 10, computation_type: 'FORMULA', formula: 'wage' },
    { code: 'FIX', name: 'Fixed', category: 'ALLOWANCE', sequence: 20, computation_type: 'FIXED', fixed_amount: 1500.5 },
    { code: 'PCT', name: 'Percent', category: 'ALLOWANCE', sequence: 30, computation_type: 'PERCENTAGE', percentage: 10, base_code: 'WAGE' },
    { code: 'TERN', name: 'Ternary', category: 'GROSS', sequence: 40, computation_type: 'FORMULA', formula: 'WAGE > 1000 ? 5 : 15' },
  ];

  it('fixed amounts are used as-is', () => {
    const result = compute(rules, { ...contractInputs, wage: 10000 });
    expect(result.lines.find((l) => l.code === 'FIX').amount).toBe(1500.5);
  });

  it('percentage resolves the base code from an earlier rule', () => {
    const result = compute(rules, { ...contractInputs, wage: 10000 });
    expect(result.lines.find((l) => l.code === 'PCT').amount).toBe(1000.0);
  });

  it('ternary picks the matching branch', () => {
    const result = compute(rules, { ...contractInputs, wage: 10000 });
    expect(result.lines.find((l) => l.code === 'TERN').amount).toBe(5.0);
  });

  it('nested formula with arithmetic and ternary', () => {
    const nested = [
      { code: 'WAGE', name: 'Wage', category: 'BASIC', sequence: 10, computation_type: 'FORMULA', formula: 'wage' },
      { code: 'X', name: 'X', category: 'ALLOWANCE', sequence: 20, computation_type: 'FORMULA', formula: '(WAGE + 500) * 2 >= 3000 ? WAGE / 4 : 0' },
    ];
    const result = compute(nested, { ...contractInputs, wage: 1000 });
    // (1000+500)*2 = 3000 >= 3000 → true → 1000/4 = 250
    expect(result.lines.find((l) => l.code === 'X').amount).toBe(250.0);
  });

  it('percentage with an unknown base marks the employee not ok', () => {
    const result = compute(
      [{ code: 'P', name: 'P', category: 'DEDUCTION', sequence: 10, computation_type: 'PERCENTAGE', percentage: 5, base_code: 'NOTHING' }],
      contractInputs
    );
    expect(result.ok).toBe(false);
    expect(result.warnings[0].severity).toBe('ERROR');
    expect(result.lines).toEqual([]);
  });
});

describe('sequencing', () => {
  it('executes rules in sequence order so later rules see earlier codes', () => {
    const result = compute(
      [
        { code: 'B', name: 'B', category: 'BASIC', sequence: 10, computation_type: 'FIXED', fixed_amount: 100 },
        { code: 'A', name: 'A', category: 'ALLOWANCE', sequence: 20, computation_type: 'PERCENTAGE', percentage: 50, base_code: 'B' },
      ],
      contractInputs
    );
    expect(result.lines.find((l) => l.code === 'A').amount).toBe(50.0);
  });

  it('GROSS subtotal is not double-counted into gross total', () => {
    const result = compute(contractRules, contractInputs);
    // gross = BASIC(50000) + HRA(10000) + TRANSPORT(3000) — the GROSS line itself is excluded
    expect(result.gross).toBe(63000.0);
  });

  it('deductions are negative on lines but positive in the deductions total', () => {
    const result = compute(contractRules, contractInputs);
    expect(result.lines.find((l) => l.code === 'PF').amount).toBe(-6000.0);
    expect(result.deductions).toBe(8000.0);
  });
});

describe('conditions', () => {
  it('skips the rule silently when the condition is false', () => {
    const result = compute(
      [
        { code: 'B', name: 'B', category: 'BASIC', sequence: 10, computation_type: 'FIXED', fixed_amount: 100 },
        { code: 'S', name: 'Skip', category: 'ALLOWANCE', sequence: 20, computation_type: 'FIXED', fixed_amount: 999, condition: 'B > 500' },
      ],
      contractInputs
    );
    expect(result.lines.find((l) => l.code === 'S')).toBeUndefined();
  });

  it('applies the rule when the condition is true', () => {
    const result = compute(
      [
        { code: 'B', name: 'B', category: 'BASIC', sequence: 10, computation_type: 'FIXED', fixed_amount: 100 },
        { code: 'S', name: 'Keep', category: 'ALLOWANCE', sequence: 20, computation_type: 'FIXED', fixed_amount: 999, condition: 'B > 50 AND B < 200' },
      ],
      contractInputs
    );
    expect(result.lines.find((l) => l.code === 'S').amount).toBe(999.0);
  });
});

describe('warnings', () => {
  it('division by zero becomes 0 with a WARNING and the employee stays ok', () => {
    const result = compute(
      [{ code: 'D', name: 'D', category: 'DEDUCTION', sequence: 10, computation_type: 'FORMULA', formula: 'wage / 0' }],
      contractInputs
    );
    expect(result.ok).toBe(true);
    expect(result.lines[0].amount).toBe(0.0);
    expect(result.warnings[0].severity).toBe('WARNING');
  });

  it('unknown variable is a fatal ERROR for that employee only', () => {
    const result = compute(
      [
        { code: 'GOOD', name: 'Good', category: 'BASIC', sequence: 10, computation_type: 'FIXED', fixed_amount: 100 },
        { code: 'BAD', name: 'Bad', category: 'DEDUCTION', sequence: 20, computation_type: 'FORMULA', formula: 'BONOS * 2' },
      ],
      contractInputs
    );
    expect(result.ok).toBe(false);
    expect(result.lines.some((l) => l.code === 'GOOD')).toBe(true);
    expect(result.lines.some((l) => l.code === 'BAD')).toBe(false);
    expect(result.warnings[0].code).toBe('RULE_ERROR');
  });
});

describe('rounding (decimal.js half-up, totals from rounded lines)', () => {
  it('rounds each line half-up to 2 dp', () => {
    const result = compute(
      [{ code: 'R', name: 'R', category: 'BASIC', sequence: 10, computation_type: 'PERCENTAGE', percentage: 12.345, base_code: 'wage' }],
      { ...contractInputs, wage: 100 }
    );
    // 100 * 12.345% = 12.345 → half-up 2dp = 12.35 (half-even would give 12.34)
    expect(result.lines[0].amount).toBe(12.35);
  });

  it('totals are the sum of rounded lines, not of raw values', () => {
    const result = compute(
      [
        { code: 'B', name: 'B', category: 'BASIC', sequence: 10, computation_type: 'FIXED', fixed_amount: 100 },
        { code: 'D1', name: 'D1', category: 'DEDUCTION', sequence: 20, computation_type: 'FIXED', fixed_amount: 0.333 },
        { code: 'D2', name: 'D2', category: 'DEDUCTION', sequence: 30, computation_type: 'FIXED', fixed_amount: 0.333 },
        { code: 'D3', name: 'D3', category: 'DEDUCTION', sequence: 40, computation_type: 'FIXED', fixed_amount: 0.333 },
      ],
      contractInputs
    );
    // 3 × 0.333 → each rounds to 0.33 → deductions 0.99 (raw sum would be 0.999)
    expect(result.deductions).toBe(0.99);
    expect(result.net).toBe(99.01);
  });
});

describe('formula DSL safety', () => {
  const attackRules = (formula) => [
    { code: 'X', name: 'X', category: 'DEDUCTION', sequence: 10, computation_type: 'FORMULA', formula },
  ];

  it.each([
    ['wage.constructor("return process")()'],
    ['wage.__proto__'],
    ['eval("1+1")'],
    ['import("node:fs")'],
    ['wage = 5'],
    ['[1, 2, 3]'],
  ])('rejects %j at validate time', (formula) => {
    expect(validateRules(attackRules(formula)).valid).toBe(false);
  });

  it('rejects attacks at compute time with an employee-level error', () => {
    const result = compute(attackRules('wage.constructor()'), contractInputs);
    expect(result.ok).toBe(false);
    expect(result.lines).toEqual([]);
  });
});

describe('purity and idempotency', () => {
  it('same request twice returns deep-equal results', () => {
    const first = computeBatch({ rules: contractRules, employees: [{ ref: 'emp-1', inputs: contractInputs }] });
    const second = computeBatch({ rules: contractRules, employees: [{ ref: 'emp-1', inputs: contractInputs }] });
    expect(first).toEqual(second);
  });

  it('does not mutate the caller\'s rules array', () => {
    const rules = [
      { code: 'B', name: 'B', category: 'BASIC', sequence: 20, computation_type: 'FIXED', fixed_amount: 1 },
      { code: 'A', name: 'A', category: 'ALLOWANCE', sequence: 10, computation_type: 'FIXED', fixed_amount: 2 },
    ];
    const original = JSON.stringify(rules);
    compute(rules, contractInputs);
    expect(JSON.stringify(rules)).toBe(original);
  });

  it('computes multiple employees independently', () => {
    const { results } = computeBatch({
      rules: contractRules,
      employees: [
        { ref: 'emp-1', inputs: contractInputs },
        { ref: 'emp-2', inputs: { ...contractInputs, wage: 0 } },
      ],
    });
    // wage 0 zeroes BASIC/HRA/PF/TAX, but TRANSPORT is a fixed 3000 allowance.
    expect(results[1].ok).toBe(true);
    expect(results[1].lines.find((l) => l.code === 'NET').amount).toBe(3000.0);
  });
});

describe('validateRules', () => {
  it('accepts the contract rule set', () => {
    expect(validateRules(contractRules)).toEqual({ valid: true, errors: [] });
  });

  it('rejects an empty rule set', () => {
    const result = validateRules([]);
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate rule codes (case-insensitive)', () => {
    const result = validateRules([
      { code: 'BASIC', name: 'One', category: 'BASIC', sequence: 10, computation_type: 'FIXED', fixed_amount: 1 },
      { code: 'basic', name: 'Two', category: 'BASIC', sequence: 20, computation_type: 'FIXED', fixed_amount: 2 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message === "Duplicate rule code 'BASIC'")).toBe(true);
  });

  it('rejects duplicate sequences (D-1)', () => {
    const result = validateRules([
      { code: 'A', name: 'A', category: 'BASIC', sequence: 10, computation_type: 'FIXED', fixed_amount: 1 },
      { code: 'B', name: 'B', category: 'ALLOWANCE', sequence: 10, computation_type: 'FIXED', fixed_amount: 2 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.filter((e) => e.message === 'Duplicate sequence').length).toBe(2);
  });

  it('requires fields per computation type', () => {
    const base = { code: 'A', name: 'A', category: 'BASIC', sequence: 10 };
    expect(validateRules([{ ...base, computation_type: 'FIXED' }]).valid).toBe(false);
    expect(validateRules([{ ...base, computation_type: 'PERCENTAGE', percentage: 10 }]).valid).toBe(false);
    expect(validateRules([{ ...base, computation_type: 'FORMULA' }]).valid).toBe(false);
    expect(validateRules([{ ...base, computation_type: 'FIXED', fixed_amount: 1 }]).valid).toBe(true);
  });

  it('rejects percentage base codes defined later or not at all', () => {
    expect(
      validateRules([
        { code: 'HRA', name: 'HRA', category: 'ALLOWANCE', sequence: 10, computation_type: 'PERCENTAGE', percentage: 20, base_code: 'BASIC' },
        { code: 'BASIC', name: 'Basic', category: 'BASIC', sequence: 20, computation_type: 'FIXED', fixed_amount: 100 },
      ]).valid
    ).toBe(false);
    expect(
      validateRules([
        { code: 'HRA', name: 'HRA', category: 'ALLOWANCE', sequence: 10, computation_type: 'PERCENTAGE', percentage: 20, base_code: 'GHOST' },
      ]).valid
    ).toBe(false);
  });

  it('rejects NET rules that are not last', () => {
    const result = validateRules([
      { code: 'NET', name: 'Net', category: 'NET', sequence: 10, computation_type: 'FORMULA', formula: 'wage' },
      { code: 'B', name: 'B', category: 'BASIC', sequence: 20, computation_type: 'FIXED', fixed_amount: 1 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe('NET rule must have the highest sequence');
  });

  it('rejects GROSS rules that run before the earnings they reference', () => {
    const result = validateRules([
      { code: 'GROSS', name: 'Gross', category: 'GROSS', sequence: 10, computation_type: 'FORMULA', formula: 'BASIC' },
      { code: 'BASIC', name: 'Basic', category: 'BASIC', sequence: 20, computation_type: 'FIXED', fixed_amount: 1 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("must come after earning 'BASIC'");
  });

  it('rejects formula syntax errors with a rule code attached', () => {
    const result = validateRules([
      { code: 'A', name: 'A', category: 'BASIC', sequence: 10, computation_type: 'FORMULA', formula: 'GROSS > (' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule_code).toBe('A');
    expect(result.errors[0].message).toContain('Invalid formula syntax');
  });

  it('rejects unknown variables in formulas and conditions', () => {
    const result = validateRules([
      { code: 'A', name: 'A', category: 'DEDUCTION', sequence: 10, computation_type: 'FORMULA', formula: 'BONOS + 1' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("Unknown variable 'BONOS'");
  });
});
