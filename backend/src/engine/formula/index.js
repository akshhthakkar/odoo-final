import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class RuleError extends Error {
  constructor(message, severity = 'ERROR') {
    super(message);
    this.name = 'RuleError';
    this.severity = severity;
  }
}

const KEYWORDS = new Set(['AND', 'OR', 'NOT']);

function tokenize(input) {
  const tokens = [];
  let i = 0;
  const isDigit = (c) => c >= '0' && c <= '9';
  const isIdentStart = (c) => /[A-Za-z_]/.test(c);
  const isIdentPart = (c) => /[A-Za-z0-9_]/.test(c);

  while (i < input.length) {
    const c = input[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i += 1;
      continue;
    }
    if (isDigit(c)) {
      let j = i;
      while (j < input.length && isDigit(input[j])) j += 1;
      if (input[j] === '.' && isDigit(input[j + 1])) {
        j += 1;
        while (j < input.length && isDigit(input[j])) j += 1;
      }
      tokens.push({ type: 'NUMBER', value: input.slice(i, j) });
      i = j;
      continue;
    }
    if (isIdentStart(c)) {
      let j = i;
      while (j < input.length && isIdentPart(input[j])) j += 1;
      const word = input.slice(i, j);
      const upper = word.toUpperCase();
      if (KEYWORDS.has(upper)) {
        tokens.push({ type: upper });
      } else {
        tokens.push({ type: 'IDENT', name: word });
      }
      i = j;
      continue;
    }
    const two = input.slice(i, i + 2);
    if (two === '>=' || two === '<=' || two === '==' || two === '!=' || two === '&&' || two === '||') {
      tokens.push({ type: two });
      i += 2;
      continue;
    }
    if ('+-*/()<>?!:'.includes(c)) {
      tokens.push({ type: c });
      i += 1;
      continue;
    }
    throw new RuleError(`Unexpected character '${c}' in expression`);
  }
  tokens.push({ type: 'EOF' });
  return tokens;
}

function makeParser(tokens) {
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (type) => {
    const t = next();
    if (t.type !== type) {
      throw new RuleError(`Expected '${type}' but found '${t.type === 'EOF' ? 'end of expression' : t.type}'`);
    }
    return t;
  };

  function parseTernary() {
    const cond = parseOr();
    if (peek().type === '?') {
      next();
      const ifTrue = parseTernary();
      expect(':');
      const ifFalse = parseTernary();
      return { kind: 'ternary', cond, ifTrue, ifFalse };
    }
    return cond;
  }

  function parseOr() {
    let left = parseAnd();
    while (peek().type === 'OR' || peek().type === '||') {
      next();
      left = { kind: 'or', left, right: parseAnd() };
    }
    return left;
  }

  function parseAnd() {
    let left = parseNot();
    while (peek().type === 'AND' || peek().type === '&&') {
      next();
      left = { kind: 'and', left, right: parseNot() };
    }
    return left;
  }

  function parseNot() {
    if (peek().type === 'NOT' || peek().type === '!') {
      next();
      return { kind: 'not', value: parseNot() };
    }
    return parseComparison();
  }

  function parseComparison() {
    let left = parseAdditive();
    while (['>', '>=', '<', '<=', '==', '!='].includes(peek().type)) {
      const op = next().type;
      left = { kind: 'compare', op, left, right: parseAdditive() };
    }
    return left;
  }

  function parseAdditive() {
    let left = parseMultiplicative();
    while (peek().type === '+' || peek().type === '-') {
      const op = next().type;
      left = { kind: 'binary', op, left, right: parseMultiplicative() };
    }
    return left;
  }

  function parseMultiplicative() {
    let left = parseUnary();
    while (peek().type === '*' || peek().type === '/') {
      const op = next().type;
      left = { kind: 'binary', op, left, right: parseUnary() };
    }
    return left;
  }

  function parseUnary() {
    if (peek().type === '-') {
      next();
      return { kind: 'neg', value: parseUnary() };
    }
    if (peek().type === '+') {
      next();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = next();
    if (t.type === 'NUMBER') {
      return { kind: 'number', value: new Decimal(t.value) };
    }
    if (t.type === 'IDENT') {
      return { kind: 'ident', name: t.name };
    }
    if (t.type === '(') {
      const inner = parseTernary();
      expect(')');
      return inner;
    }
    const shown = t.type === 'EOF' ? 'end of expression' : `'${t.type}'`;
    throw new RuleError(`Unexpected token ${shown} in expression`);
  }

  return { parse: () => {
    const ast = parseTernary();
    if (peek().type !== 'EOF') {
      throw new RuleError(`Unexpected token '${peek().type}' after end of expression`);
    }
    return ast;
  } };
}

export function parseExpression(expression) {
  if (typeof expression !== 'string' || expression.trim() === '') {
    throw new RuleError('Expression is empty');
  }
  return makeParser(tokenize(expression)).parse();
}

function collectIdentifiers(node, acc) {
  if (!node || typeof node !== 'object') return acc;
  if (node.kind === 'ident') acc.push(node.name);
  for (const key of ['left', 'right', 'value', 'cond', 'ifTrue', 'ifFalse']) {
    if (node[key]) collectIdentifiers(node[key], acc);
  }
  return acc;
}

export function expressionIdentifiers(expression) {
  return collectIdentifiers(parseExpression(expression), []);
}

function truthy(value) {
  if (typeof value === 'boolean') return value;
  if (value instanceof Decimal) return !value.isZero();
  throw new RuleError('Expression did not evaluate to a boolean or number');
}

function evaluate(node, variables, warnings) {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'ident': {
      if (!Object.prototype.hasOwnProperty.call(variables, node.name)) {
        throw new RuleError(`Unknown variable '${node.name}'`);
      }
      return new Decimal(variables[node.name]);
    }
    case 'neg':
      return evaluate(node.value, variables, warnings).negated();
    case 'ternary': {
      const cond = evaluate(node.cond, variables, warnings);
      return truthy(cond)
        ? evaluate(node.ifTrue, variables, warnings)
        : evaluate(node.ifFalse, variables, warnings);
    }
    case 'or': {
      const left = truthy(evaluate(node.left, variables, warnings));
      if (left) return true;
      return truthy(evaluate(node.right, variables, warnings));
    }
    case 'and': {
      const left = truthy(evaluate(node.left, variables, warnings));
      if (!left) return false;
      return truthy(evaluate(node.right, variables, warnings));
    }
    case 'not':
      return !truthy(evaluate(node.value, variables, warnings));
    case 'compare': {
      const left = evaluate(node.left, variables, warnings);
      const right = evaluate(node.right, variables, warnings);
      if (typeof left === 'boolean' || typeof right === 'boolean') {
        if (node.op === '==') return left === right;
        if (node.op === '!=') return left !== right;
        throw new RuleError(`Comparison '${node.op}' is not valid for boolean operands`);
      }
      switch (node.op) {
        case '>': return left.greaterThan(right);
        case '>=': return left.greaterThanOrEqualTo(right);
        case '<': return left.lessThan(right);
        case '<=': return left.lessThanOrEqualTo(right);
        case '==': return left.equals(right);
        case '!=': return !left.equals(right);
        default: throw new RuleError(`Unknown comparison operator '${node.op}'`);
      }
    }
    case 'binary': {
      const left = evaluate(node.left, variables, warnings);
      const right = evaluate(node.right, variables, warnings);
      const result = node.op === '+'
        ? left.plus(right)
        : node.op === '-'
          ? left.minus(right)
          : node.op === '*'
            ? left.times(right)
            : right.isZero()
              ? null
              : left.dividedBy(right);
      if (result === null) {
        warnings.push({ severity: 'WARNING', message: 'Division by zero treated as 0' });
        return new Decimal(0);
      }
      return result.toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
    }
    default:
      throw new RuleError(`Unknown AST node '${node.kind}'`);
  }
}

export function evaluateFormula(expression, variables) {
  const warnings = [];
  const value = evaluate(parseExpression(expression), variables, warnings);
  return { value, warnings };
}
