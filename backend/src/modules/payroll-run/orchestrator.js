import { AppError } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';
import { computeBatch } from '../../engine/index.js';

// Factory for a run-level warning row (payslip_id null until linked to a payslip).
const runWarning = (payrunId, code, severity, message) => ({
  payrunId,
  payslipId: null,
  code,
  severity,
  message,
});

// DB rule row -> the engine's snake_case rule shape.
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

// STEP 1 (per employee): active contracts covering the payrun period.
function findActiveContracts(tx, employeeId, periodStart, periodEnd) {
  return tx.contract.findMany({
    where: {
      employeeId,
      status: 'ACTIVE',
      startDate: { lte: periodEnd },
      OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
    },
    orderBy: { startDate: 'desc' },
    include: { workingSchedule: true },
  });
}

// STEP 2 (per employee): attendance + approved leave aggregates for the period.
async function aggregatePeriodInputs(tx, contract, periodStart, periodEnd) {
  const [attendance, leaveRequests] = await Promise.all([
    tx.attendance.aggregate({
      where: { employeeId: contract.employeeId, attendanceDate: { gte: periodStart, lte: periodEnd } },
      _count: { _all: true },
      _sum: { workedHours: true, overtimeHours: true },
    }),
    tx.timeOffRequest.findMany({
      where: {
        employeeId: contract.employeeId,
        status: 'APPROVED',
        dateFrom: { lte: periodEnd },
        dateTo: { gte: periodStart },
      },
      select: {
        dateFrom: true,
        dateTo: true,
        days: true,
      },
    }),
  ]);

  let totalLeaveDays = 0;
  for (const req of leaveRequests) {
    const from = new Date(req.dateFrom);
    const to = new Date(req.dateTo);
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);

    const overlapStart = new Date(Math.max(from.getTime(), pStart.getTime()));
    const overlapEnd = new Date(Math.min(to.getTime(), pEnd.getTime()));

    if (overlapStart <= overlapEnd) {
      const totalReqDays = Number(req.days);
      const totalCalendarDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const overlapCalendarDays = Math.max(1, Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      if (overlapCalendarDays >= totalCalendarDays) {
        totalLeaveDays += totalReqDays;
      } else {
        const overlapRatio = overlapCalendarDays / totalCalendarDays;
        totalLeaveDays += Number((totalReqDays * overlapRatio).toFixed(2));
      }
    }
  }

  return {
    workedDays: attendance._count._all,
    // Flat variable map for the engine (contract: numbers only, no objects).
    inputs: {
      wage: Number(contract.wage),
      weekly_hours: Number(contract.workingSchedule?.weeklyHours ?? 40),
      worked_days: attendance._count._all,
      worked_hours: Number(attendance._sum.workedHours ?? 0),
      overtime_hours: Number(attendance._sum.overtimeHours ?? 0),
      leave_days: Number(totalLeaveDays.toFixed(2)),
    },
  };
}

// Build one payslip row (+ nested lines) from a plan + its engine result.
function buildPayslip(payrun, plan, result, ruleByCode) {
  return {
    payrunId: payrun.id,
    employeeId: plan.employee.id,
    contractId: plan.contract.id,
    structureId: payrun.structureId,
    periodStart: payrun.periodStart,
    periodEnd: payrun.periodEnd,
    workedDays: plan.workedDays,
    gross: result.gross,
    deductions: result.deductions,
    net: result.net,
    currency: plan.contract.currency,
    status: 'COMPUTED',
    lines: {
      create: result.lines.map((line) => {
        const rule = ruleByCode.get(line.code);
        return {
          ruleId: rule?.id ?? null,
          code: line.code,
          name: line.name,
          category: line.category,
          sequence: line.sequence,
          amount: line.amount,
          rate: rule?.percentage == null ? null : Number(rule.percentage),
          computationType: rule?.computationType ?? 'FIXED',
        };
      }),
    },
  };
}

// Full COMPUTE orchestration. Runs inside ONE transaction so the status
// change and the payslip/warning replacement commit or roll back together.
export async function computePayrun(payrunId, actorId) {
  return prisma.$transaction(async (tx) => {
    // Serialize concurrent COMPUTEs on the payrun row: a second transaction
    // blocks here until the first commits, then re-reads the committed state.
    // This prevents both duplicate payslips and unique-violation 500s.
    await tx.$queryRaw`SELECT id FROM payruns WHERE id = ${payrunId}::uuid FOR UPDATE`;

    const payrun = await tx.payrun.findUnique({
      where: { id: payrunId },
      include: { structure: true },
    });
    if (!payrun) {
      throw new AppError(404, 'NOT_FOUND', 'Payrun not found');
    }
    if (!['DRAFT', 'COMPUTED'].includes(payrun.status)) {
      // Recompute is allowed in DRAFT/COMPUTED; anything else is illegal.
      throw new AppError(409, 'STATE_ERROR', `Cannot COMPUTE a ${payrun.status} payrun`);
    }

    const selections = await tx.payrunEmployee.findMany({
      where: { payrunId },
      include: { employee: true },
    });
    if (selections.length === 0) {
      throw new AppError(422, 'UNPROCESSABLE', 'Payrun has no employees selected');
    }

    const rules = await tx.salaryRule.findMany({
      where: { structureId: payrun.structureId, isActive: true },
      orderBy: [{ sequence: 'asc' }, { code: 'asc' }],
    });
    if (rules.length === 0) {
      throw new AppError(422, 'UNPROCESSABLE', 'Salary structure has no rules configured');
    }
    const ruleByCode = new Map(rules.map((rule) => [rule.code, rule]));

    const warnings = [];

    // ADR-008: overlapping period in another non-cancelled run is allowed, just flagged.
    const overlap = await tx.payrun.findFirst({
      where: {
        id: { not: payrun.id },
        status: { not: 'CANCELLED' },
        periodStart: { lte: payrun.periodEnd },
        periodEnd: { gte: payrun.periodStart },
      },
    });
    if (overlap) {
      warnings.push(runWarning(
        payrunId,
        'DUPLICATE_PAYSLIP',
        'WARNING',
        `Period overlaps payrun '${overlap.name}'`
      ));
    }

    // STEPS 1 + 2: resolve contract and period aggregates per employee.
    // Employees without a contract get an ERROR warning and no payslip.
    const plans = [];
    for (const selection of selections) {
      const employee = selection.employee;
      const contracts = await findActiveContracts(tx, employee.id, payrun.periodStart, payrun.periodEnd);
      if (contracts.length === 0) {
        warnings.push(runWarning(
          payrunId,
          'NO_ACTIVE_CONTRACT',
          'ERROR',
          `${employee.firstName} ${employee.lastName}: no active contract covers the period`
        ));
        continue;
      }
      if (contracts.length > 1) {
        warnings.push(runWarning(
          payrunId,
          'AMBIGUOUS_CONTRACT',
          'ERROR',
          `${employee.firstName} ${employee.lastName}: multiple active contracts cover the period`
        ));
        continue;
      }
      const contract = contracts[0];
      const { workedDays, inputs } = await aggregatePeriodInputs(tx, contract, payrun.periodStart, payrun.periodEnd);
      plans.push({ employee, contract, workedDays, inputs });
    }

    // STEP 3: pure engine call - computeBatch touches no database.
    const { results } = computeBatch({
      rules: rules.map(toEngineRule),
      employees: plans.map((plan) => ({ ref: plan.employee.id, inputs: plan.inputs })),
    });
    const resultByRef = new Map(results.map((result) => [result.ref, result]));

    // STEP 4: fresh replace - recompute wipes previous payslips (lines cascade)
    // and warnings, then inserts the new ones.
    await tx.payrollWarning.deleteMany({ where: { payrunId } });
    await tx.payslip.deleteMany({ where: { payrunId } });

    const payslipResults = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const plan of plans) {
      const result = resultByRef.get(plan.employee.id);
      const employeeName = `${plan.employee.firstName} ${plan.employee.lastName}`;

      if (!result.ok) {
        // Employee-level engine failure: ERROR warning, no payslip for them.
        warnings.push(runWarning(
          payrunId,
          'RULE_ERROR',
          'ERROR',
          `${employeeName}: ${result.warnings.map((w) => w.message).join('; ')}`
        ));
        continue;
      }

      const payslip = await tx.payslip.create({ data: buildPayslip(payrun, plan, result, ruleByCode) });
      totalGross += result.gross;
      totalDeductions += result.deductions;
      totalNet += result.net;

      // Payslip-level warnings: missing bank details
      if (!plan.employee.bankAccountName || !plan.employee.bankAccountNumber || !plan.employee.bankIfsc) {
        warnings.push({
          payrunId,
          payslipId: payslip.id,
          code: 'MISSING_BANK_DETAILS',
          severity: 'WARNING',
          message: `${employeeName}: missing bank account details`,
        });
      }

      // Payslip-level warnings: zero worked days
      if (plan.workedDays === 0) {
        warnings.push({
          payrunId,
          payslipId: payslip.id,
          code: 'ZERO_WORKED_DAYS',
          severity: 'WARNING',
          message: `${employeeName}: 0 worked days in period`,
        });
      }

      payslipResults.push({
        id: payslip.id,
        employee_id: plan.employee.id,
        employee_name: employeeName,
        gross: result.gross,
        deductions: result.deductions,
        net: result.net,
        status: 'COMPUTED',
        worked_days: plan.workedDays,
        lines: result.lines,
      });
    }

    // Whole-run failure (contract §7): nothing persisted, payrun stays in its current status.
    if (payslipResults.length === 0) {
      throw new AppError(422, 'ENGINE_RULE_ERROR', 'No payslips could be computed', warnings);
    }

    await tx.payrollWarning.createMany({ data: warnings });

    const updated = await tx.payrun.update({
      where: { id: payrunId },
      data: {
        status: 'COMPUTED',
        totalGross,
        totalDeductions,
        totalNet,
        computedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'PAYRUN_COMPUTED',
        entity: 'payrun',
        entityId: payrunId,
        payload: { payslips: payslipResults.length, warnings: warnings.length },
      },
    });

    return {
      payrun: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        period_start: updated.periodStart,
        period_end: updated.periodEnd,
        total_gross: Number(updated.totalGross),
        total_deductions: Number(updated.totalDeductions),
        total_net: Number(updated.totalNet),
      },
      payslips: payslipResults,
      warnings: warnings.map((w) => ({ payslip_id: w.payslipId, code: w.code, severity: w.severity, message: w.message })),
    };
  });
}

// Wizard step 2: ACTIVE employees with simple eligibility flags.
export async function getEligibility({ structure_id: structureId, period_start: periodStart, period_end: periodEnd }) {
  if (new Date(periodEnd) < new Date(periodStart)) {
    throw new AppError(422, 'UNPROCESSABLE', 'period_end must be on or after period_start');
  }

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { employeeCode: 'asc' },
    include: {
      contracts: {
        where: {
          status: 'ACTIVE',
          startDate: { lte: new Date(periodEnd) },
          OR: [{ endDate: null }, { endDate: { gte: new Date(periodStart) } }],
        },
        take: 1,
      },
    },
  });

  return employees.map((employee) => {
    const contract = employee.contracts[0];
    return {
      employee_id: employee.id,
      employee_code: employee.employeeCode,
      employee_name: `${employee.firstName} ${employee.lastName}`,
      has_active_contract: Boolean(contract),
      structure_match: contract ? contract.structureId === structureId : false,
      eligible: Boolean(contract),
    };
  });
}
