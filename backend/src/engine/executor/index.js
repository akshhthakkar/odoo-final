import Decimal from 'decimal.js';
import { z } from 'zod';
import { evaluateFormula, RuleError } from '../formula/index.js';

const EARNING_CATEGORIES = new Set(['BASIC', 'ALLOWANCE']);
const DEDUCTION_CATEGORIES = new Set(['DEDUCTION', 'EMPLOYER_CONTRIB']);

const inputSchema = z.object({
  wage: z.number().nonnegative(),
  weekly_hours: z.number().nonnegative(),
  worked_days: z.number().nonnegative(),
  worked_hours: z.number().nonnegative(),
  overtime_hours: z.number().nonnegative(),
  leave_days: z.number().nonnegative(),
});

export class EngineInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EngineInputError';
  }
}

export function buildVariables(inputs) {
  const wage = Number(inputs.wage ?? 0);
  const workedDays = Number(inputs.worked_days ?? 0);
  const workedHours = Number(inputs.worked_hours ?? 0);
  const overtimeHours = Number(inputs.overtime_hours ?? 0);
  const leaveDays = Number(inputs.leave_days ?? 0);
  return {
    wage,
    CONTRACT_WAGE: wage,
    weekly_hours: Number(inputs.weekly_hours ?? 0),
    worked_days: workedDays,
    WORKED_DAYS: workedDays,
    worked_hours: workedHours,
    overtime_hours: overtimeHours,
    OVERTIME_HOURS: overtimeHours,
    leave_days: leaveDays,
    LEAVE_DAYS: leaveDays,
  };
}

const round2 = (value) => value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const isDeduction = (category) => category === 'DEDUCTION' || category === 'EMPLOYER_CONTRIB';

// Compute one rule: returns the raw value plus any non-fatal formula warnings
// (e.g. division by zero). Throws RuleError for fatal problems (unknown variable).
function computeRule(rule, variables) {
  if (rule.computation_type === 'FIXED') {
    return { value: new Decimal(rule.fixed_amount ?? 0), warnings: [] };
  }
  if (rule.computation_type === 'PERCENTAGE') {
    const base = variables[rule.base_code];
    if (base === undefined) {
      throw new RuleError(`Base code '${rule.base_code}' is not defined for this employee`);
    }
    const baseValue = base instanceof Decimal ? base : new Decimal(base);
    return {
      value: baseValue.times(new Decimal(rule.percentage ?? 0)).dividedBy(100),
      warnings: [],
    };
  }
  return evaluateFormula(rule.formula, variables);
}

export function runRuleSequence({ rules, variables: rawVariables }) {
  const variables = { ...rawVariables };
  const warnings = [];
  const lines = [];
  let notOk = false;

  const sorted = [...rules].sort((a, b) => a.sequence - b.sequence || String(a.code).localeCompare(String(b.code)));

  for (const rule of sorted) {
    if (rule.condition) {
      let conditionResult;
      try {
        conditionResult = evaluateFormula(rule.condition, variables).value;
      } catch (err) {
        warnings.push({ code: 'RULE_ERROR', severity: 'ERROR', message: `${rule.code}: ${err.message}` });
        notOk = true;
        continue;
      }
      const truthy = conditionResult instanceof Decimal ? !conditionResult.isZero() : Boolean(conditionResult);
      if (!truthy) continue;
    }

    try {
      const { value: raw, warnings: formulaWarnings } = computeRule(rule, variables);
      warnings.push(
        ...formulaWarnings.map((w) => ({ severity: w.severity, message: `${rule.code}: ${w.message}` }))
      );

      // Deductions are negative on the payslip line; zero stays +0 (avoid -0).
      const amount = isDeduction(rule.category)
        ? raw.isZero()
          ? raw
          : raw.abs().negated()
        : raw;
      const rounded = round2(amount);
      variables[rule.code] = rounded.abs();
      lines.push({
        code: rule.code,
        name: rule.name,
        category: rule.category,
        sequence: rule.sequence,
        amount: rounded.toNumber(),
      });
    } catch (err) {
      warnings.push({ code: 'RULE_ERROR', severity: 'ERROR', message: `${rule.code}: ${err.message}` });
      notOk = true;
    }
  }

  const gross = lines
    .filter((l) => EARNING_CATEGORIES.has(l.category) && l.amount > 0)
    .reduce((sum, l) => sum.plus(new Decimal(l.amount)), new Decimal(0));
  const deductions = lines
    .filter((l) => DEDUCTION_CATEGORIES.has(l.category))
    .reduce((sum, l) => sum.plus(new Decimal(l.amount).abs()), new Decimal(0));
  const net = gross.minus(deductions);

  return {
    ok: !notOk,
    gross: gross.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    deductions: deductions.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    net: net.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    lines,
    warnings,
  };
}

const batchSchema = z.object({
  period: z.object({ start: z.string(), end: z.string() }).optional(),
  rules: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        category: z.string(),
        sequence: z.number().int(),
        computation_type: z.string(),
        fixed_amount: z.number().nullable().optional(),
        percentage: z.number().nullable().optional(),
        base_code: z.string().nullable().optional(),
        formula: z.string().nullable().optional(),
        condition: z.string().nullable().optional(),
        appears_on_payslip: z.boolean().optional(),
      })
    )
    .min(1),
  employees: z
    .array(
      z.object({
        ref: z.union([z.string(), z.number()]),
        inputs: inputSchema,
      })
    )
    .min(1),
});

export function computeBatch(request) {
  let parsed;
  try {
    parsed = batchSchema.parse(request);
  } catch (err) {
    throw new EngineInputError(`Invalid computeBatch input: ${err.message}`);
  }

  const results = parsed.employees.map((employee) => {
    let inputs;
    try {
      inputs = inputSchema.parse(employee.inputs);
    } catch (err) {
      return {
        ref: employee.ref,
        ok: false,
        gross: 0,
        deductions: 0,
        net: 0,
        lines: [],
        warnings: [{ code: 'RULE_ERROR', severity: 'ERROR', message: `Invalid employee inputs: ${err.message}` }],
      };
    }
    const variables = buildVariables(inputs);
    return { ref: employee.ref, ...runRuleSequence({ rules: parsed.rules, variables }) };
  });

  return { results };
}
