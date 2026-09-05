import { AppError } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';
import { computePayrun, getEligibility } from './orchestrator.js';

// The whole payrun lifecycle lives in this table.
// COMPUTE is special (it orchestrates payslips) and handled by the orchestrator.
const TRANSITIONS = {
  COMPUTE: { from: ['DRAFT', 'COMPUTED'], to: 'COMPUTED' },
  VALIDATE: { from: ['COMPUTED'], to: 'VALIDATED', timestamp: 'validatedAt' },
  MARK_PAID: { from: ['VALIDATED'], to: 'PAID', timestamp: 'paidAt' },
  CANCEL: { from: ['DRAFT', 'COMPUTED', 'VALIDATED'], to: 'CANCELLED' },
};

// DB payrun row -> API shape (Decimals become numbers).
function toPublicPayrun(payrun) {
  return {
    id: payrun.id,
    name: payrun.name,
    status: payrun.status,
    period_start: payrun.periodStart,
    period_end: payrun.periodEnd,
    structure_id: payrun.structureId,
    total_gross: payrun.totalGross == null ? null : Number(payrun.totalGross),
    total_deductions: payrun.totalDeductions == null ? null : Number(payrun.totalDeductions),
    total_net: payrun.totalNet == null ? null : Number(payrun.totalNet),
    employees_count: payrun._count ? payrun._count.employees : undefined,
    computed_at: payrun.computedAt,
    validated_at: payrun.validatedAt,
    paid_at: payrun.paidAt,
  };
}

export async function listPayruns() {
  const payruns = await prisma.payrun.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { employees: true } } },
  });
  return payruns.map(toPublicPayrun);
}

export async function getPayrun(payrunId) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: { _count: { select: { employees: true } } },
  });
  if (!payrun) {
    throw new AppError(404, 'NOT_FOUND', 'Payrun not found');
  }
  return toPublicPayrun(payrun);
}

// Wizard finalize: validate inputs, then create DRAFT payrun + selections atomically.
export async function createPayrun(data, actorId) {
  if (new Date(data.period_end) < new Date(data.period_start)) {
    throw new AppError(422, 'UNPROCESSABLE', 'period_end must be on or after period_start');
  }
  if (new Set(data.employee_ids).size !== data.employee_ids.length) {
    throw new AppError(422, 'UNPROCESSABLE', 'employee_ids must not contain duplicates');
  }

  const [structure, employees] = await Promise.all([
    prisma.salaryStructure.findUnique({ where: { id: data.structure_id } }),
    prisma.employee.findMany({ where: { id: { in: data.employee_ids } } }),
  ]);
  if (!structure) {
    throw new AppError(404, 'NOT_FOUND', 'Salary structure not found');
  }
  if (employees.length !== data.employee_ids.length) {
    throw new AppError(422, 'UNPROCESSABLE', 'One or more employees do not exist');
  }
  const inactive = employees.filter((employee) => employee.status !== 'ACTIVE');
  if (inactive.length > 0) {
    throw new AppError(
      422,
      'UNPROCESSABLE',
      `Employees must be ACTIVE: ${inactive.map((e) => e.employeeCode).join(', ')}`
    );
  }

  return prisma.$transaction(async (tx) => {
    const payrun = await tx.payrun.create({
      data: {
        name: data.name,
        structureId: data.structure_id,
        periodStart: new Date(data.period_start),
        periodEnd: new Date(data.period_end),
        createdBy: actorId,
        status: 'DRAFT',
        employees: {
          create: data.employee_ids.map((employeeId) => ({ employeeId })),
        },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'PAYRUN_CREATED',
        entity: 'payrun',
        entityId: payrun.id,
        payload: { name: payrun.name, employees: data.employee_ids.length },
      },
    });
    return {
      ...toPublicPayrun(payrun),
      structure: { id: structure.id, code: structure.code, name: structure.name },
      employees_count: data.employee_ids.length,
    };
  });
}

// COMPUTE / VALIDATE / MARK_PAID / CANCEL — one endpoint, table-driven.
export async function statusChange(payrunId, action, actorId) {
  const transition = TRANSITIONS[action];
  if (!transition) {
    throw new AppError(422, 'UNPROCESSABLE', `Unknown action '${action}'`);
  }

  // COMPUTE orchestrates payslip generation inside the orchestrator's transaction.
  if (action === 'COMPUTE') {
    return computePayrun(payrunId, actorId);
  }

  // The other actions are a single conditional status update:
  // `updateMany WHERE status IN (...)` is atomic, so two concurrent calls
  // cannot both pass - the loser sees count 0 and gets 409.
  return prisma.$transaction(async (tx) => {
    const result = await tx.payrun.updateMany({
      where: { id: payrunId, status: { in: transition.from } },
      data: {
        status: transition.to,
        ...(transition.timestamp ? { [transition.timestamp]: new Date() } : {}),
      },
    });
    if (result.count === 0) {
      const payrun = await tx.payrun.findUnique({ where: { id: payrunId } });
      if (!payrun) {
        throw new AppError(404, 'NOT_FOUND', 'Payrun not found');
      }
      throw new AppError(409, 'STATE_ERROR', `Cannot ${action} a ${payrun.status} payrun`);
    }

    const payrun = await tx.payrun.findUnique({ where: { id: payrunId } });
    await tx.auditLog.create({
      data: {
        actorId,
        action: `PAYRUN_${action}`,
        entity: 'payrun',
        entityId: payrunId,
        payload: { from: transition.from, to: transition.to },
      },
    });
    return toPublicPayrun(payrun);
  });
}

export { getEligibility };
