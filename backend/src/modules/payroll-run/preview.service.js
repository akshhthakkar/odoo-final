import { AppError } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';
import { computeBatch } from '../../engine/index.js';

function toDate(value) {
  return new Date(value);
}

export async function previewPayslip({ employee_id: employeeId, period_start: periodStart, period_end: periodEnd, structure_id: structureId }) {
  const start = toDate(periodStart);
  const end = toDate(periodEnd);
  if (start > end) {
    throw new AppError(422, 'UNPROCESSABLE', 'period_start must be before or equal to period_end');
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      contracts: {
        where: {
          status: 'ACTIVE',
          startDate: { lte: end },
          OR: [{ endDate: null }, { endDate: { gte: start } }],
        },
        orderBy: { startDate: 'desc' },
        take: 1,
        include: { workingSchedule: true },
      },
    },
  });
  if (!employee) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found');
  }

  const contract = employee.contracts[0];
  if (!contract) {
    throw new AppError(
      422,
      'UNPROCESSABLE',
      'No active contract covers the selected period for this employee'
    );
  }

  const structure = await resolveStructure(structureId, contract.structureId);

  const [attendance, timeOff] = await Promise.all([
    prisma.attendance.aggregate({
      where: { employeeId, attendanceDate: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { workedHours: true, overtimeHours: true },
    }),
    prisma.timeOffRequest.aggregate({
      where: { employeeId, status: 'APPROVED', dateFrom: { gte: start }, dateTo: { lte: end } },
      _sum: { days: true },
    }),
  ]);

  const inputs = {
    wage: Number(contract.wage),
    weekly_hours: Number(contract.workingSchedule?.weeklyHours ?? 40),
    worked_days: attendance._count._all,
    worked_hours: Number(attendance._sum.workedHours ?? 0),
    overtime_hours: Number(attendance._sum.overtimeHours ?? 0),
    leave_days: Number(timeOff._sum.days ?? 0),
  };

  const engineRules = (await loadRules(structure.id)).map(toEngineRule);
  const { results } = computeBatch({
    rules: engineRules,
    employees: [{ ref: employeeId, inputs }],
  });

  const result = results[0];
  if (!result.ok) {
    throw new AppError(
      422,
      'ENGINE_RULE_ERROR',
      'Rule set failed during preview compute',
      result.warnings.map((w) => ({ rule_code: null, message: w.message }))
    );
  }

  return {
    employee_id: employeeId,
    structure_id: structure.id,
    structure_code: structure.code,
    period: { start: periodStart, end: periodEnd },
    inputs,
    gross: result.gross,
    deductions: result.deductions,
    net: result.net,
    lines: result.lines,
    warnings: result.warnings,
  };
}

async function resolveStructure(structureId, contractStructureId) {
  if (structureId) {
    const structure = await prisma.salaryStructure.findUnique({ where: { id: structureId } });
    if (!structure) throw new AppError(404, 'NOT_FOUND', 'Salary structure not found');
    return structure;
  }
  if (contractStructureId) {
    const structure = await prisma.salaryStructure.findUnique({ where: { id: contractStructureId } });
    if (structure) return structure;
  }
  const fallback = await prisma.salaryStructure.findFirst({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  if (!fallback) {
    throw new AppError(422, 'UNPROCESSABLE', 'No salary structure available for preview');
  }
  return fallback;
}

async function loadRules(structureId) {
  return prisma.salaryRule.findMany({
    where: { structureId, isActive: true },
    orderBy: [{ sequence: 'asc' }, { code: 'asc' }],
  });
}

function toEngineRule(rule) {
  return {
    code: rule.code,
    name: rule.name,
    category: rule.category,
    sequence: rule.sequence,
    computation_type: rule.computationType,
    fixed_amount: rule.fixedAmount == null ? null : Number(rule.fixedAmount),
    percentage: rule.percentage == null ? null : Number(rule.percentage),
    base_code: rule.baseCode,
    formula: rule.formula,
    condition: rule.condition,
    appears_on_payslip: rule.appearsOnPayslip,
  };
}
