import { COMPUTATION_TYPES, RULE_CATEGORIES } from '../types/index.js';
import { buildVariables } from '../executor/index.js';
import { expressionIdentifiers } from '../formula/index.js';

const INPUT_VARIABLES = new Set(Object.keys(buildVariables({})));
const DEDUCTION_CATEGORIES = new Set(['DEDUCTION', 'EMPLOYER_CONTRIB']);
const EARNING_CATEGORIES = new Set(['BASIC', 'ALLOWANCE']);

function check(rule, message, errors, codeOverride = null) {
  errors.push({ rule_code: codeOverride ?? rule.code ?? null, message });
}

function referencedCodes(rule, category) {
  const expression = category === 'condition' ? rule.condition : rule.formula;
  if (!expression) return [];
  try {
    return expressionIdentifiers(expression).map((id) => id.toUpperCase());
  } catch {
    return [];
  }
}

export function validateRules(rules) {
  const errors = [];
  const safeRules = Array.isArray(rules) ? rules : [];

  if (safeRules.length === 0) {
    return { valid: false, errors: [{ rule_code: null, message: 'Rule set cannot be empty' }] };
  }

  const codeCounts = new Map();
  const sequenceCounts = new Map();
  for (const rule of safeRules) {
    const codeKey = String(rule.code ?? '').toUpperCase();
    codeCounts.set(codeKey, (codeCounts.get(codeKey) || 0) + 1);
    const seqKey = String(rule.sequence ?? '');
    sequenceCounts.set(seqKey, (sequenceCounts.get(seqKey) || 0) + 1);
  }
  for (const rule of safeRules) {
    if (codeCounts.get(String(rule.code ?? '').toUpperCase()) > 1) {
      check(rule, `Duplicate rule code '${rule.code}'`, errors);
    }
    if (sequenceCounts.get(String(rule.sequence ?? '')) > 1) {
      check(rule, 'Duplicate sequence', errors);
    }
  }

  for (const rule of safeRules) {
    if (!rule.code) check(rule, 'Missing rule code', errors);
    else if (!/^[A-Z][A-Z0-9_]*$/.test(rule.code)) {
      check(rule, `Invalid code format '${rule.code}'`, errors);
    }
    if (!rule.name) check(rule, 'Missing rule name', errors);
    if (!RULE_CATEGORIES.includes(rule.category)) {
      check(rule, `Invalid category '${rule.category}'`, errors);
    }
    if (!Number.isInteger(rule.sequence) || rule.sequence < 1) {
      check(rule, 'Sequence must be a positive integer', errors);
    }
    if (!COMPUTATION_TYPES.includes(rule.computation_type)) {
      check(rule, `Invalid computation type '${rule.computation_type}'`, errors);
      continue;
    }
    if (rule.computation_type === 'FIXED') {
      if (rule.fixed_amount == null) check(rule, 'FIXED rules require fixed_amount', errors);
      else if (Number(rule.fixed_amount) < 0) check(rule, 'fixed_amount must be non-negative', errors);
    }
    if (rule.computation_type === 'PERCENTAGE') {
      if (rule.percentage == null) check(rule, 'PERCENTAGE rules require percentage', errors);
      else if (Number(rule.percentage) < 0 || Number(rule.percentage) > 100) {
        check(rule, 'percentage must be between 0 and 100', errors);
      }
      if (!rule.base_code) check(rule, 'PERCENTAGE rules require base_code', errors);
    }
    if (rule.computation_type === 'FORMULA') {
      if (!rule.formula || String(rule.formula).trim() === '') {
        check(rule, 'FORMULA rules require formula', errors);
      }
    }
    if (rule.base_code && rule.computation_type === 'PERCENTAGE') {
      const baseKey = String(rule.base_code).toUpperCase();
      if (!INPUT_VARIABLES.has(baseKey)) {
        const base = safeRules.find((r) => String(r.code).toUpperCase() === baseKey);
        if (!base) check(rule, `Base code '${rule.base_code}' does not match any rule or input variable`, errors);
        else if (Number(base.sequence) >= Number(rule.sequence)) {
          check(rule, `Base code '${rule.base_code}' must appear at an earlier sequence`, errors);
        }
      }
    }
  }

  const codeIndex = new Map(
    safeRules.map((r) => [String(r.code ?? '').toUpperCase(), r])
  );

  for (const rule of safeRules) {
    for (const expression of ['formula', 'condition']) {
      if (!rule[expression]) continue;
      try {
        const identifiers = expressionIdentifiers(rule[expression]);
        for (const identifier of identifiers) {
          const key = identifier.toUpperCase();
          if (INPUT_VARIABLES.has(identifier) || INPUT_VARIABLES.has(key) || codeIndex.has(key)) continue;
          check(rule, `Unknown variable '${identifier}' in ${expression}`, errors);
        }
      } catch (err) {
        check(rule, `Invalid ${expression} syntax: ${err.message}`, errors);
      }
    }
    if (rule.category === 'GROSS') {
      const codes = referencedCodes(rule, 'formula');
      for (const key of codes) {
        const target = codeIndex.get(key);
        if (target && EARNING_CATEGORIES.has(target.category) && Number(target.sequence) >= Number(rule.sequence)) {
          check(rule, `GROSS rule '${rule.code}' must come after earning '${target.code}'`, errors);
        }
      }
    }
  }

  const netRules = safeRules.filter((r) => r.category === 'NET');
  const maxSequence = Math.max(...safeRules.map((r) => Number(r.sequence)));
  for (const rule of netRules) {
    if (Number(rule.sequence) !== maxSequence) {
      check(rule, 'NET rule must have the highest sequence', errors);
    }
  }

  const seenErrorCodes = new Set();
  const deduped = errors.filter((e) => {
    const key = `${e.rule_code}::${e.message}`;
    if (seenErrorCodes.has(key)) return false;
    seenErrorCodes.add(key);
    return true;
  });

  return { valid: deduped.length === 0, errors: deduped };
}
