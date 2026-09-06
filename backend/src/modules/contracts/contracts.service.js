import { prisma } from '../../shared/prisma.js';
import { AppError } from '../../shared/errors.js';
import { writeAudit } from '../../shared/audit.js';

// A-14: reject impossible date ranges at the service level; the DB CHECK
// constraint (chk_contracts_dates) remains the final backstop.
function assertDateRange(startDate, endDate) {
  if (endDate && new Date(endDate) < new Date(startDate)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'end_date must be on or after start_date');
  }
}

function getEffectiveDateStatus(c) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(c.startDate);
  start.setHours(0, 0, 0, 0);
  const end = c.endDate ? new Date(c.endDate) : null;
  if (end) end.setHours(23, 59, 59, 999);

  if (start > today) return 'FUTURE_SCHEDULED';
  if (end && end < today) return 'EXPIRED_BY_DATE';
  return 'CURRENT_EFFECTIVE';
}

const formatContract = (c) => ({
  id: c.id,
  reference: c.reference,
  employee_id: c.employeeId,
  employee: c.employee
    ? {
        id: c.employee.id,
        employee_code: c.employee.employeeCode,
        first_name: c.employee.firstName,
        last_name: c.employee.lastName,
      }
    : null,
  start_date: c.startDate,
  end_date: c.endDate,
  wage: Number(c.wage),
  currency: c.currency,
  contract_type: c.contractType,
  status: c.status,
  effective_date_status: getEffectiveDateStatus(c),
  is_currently_effective: c.status === 'ACTIVE' && getEffectiveDateStatus(c) === 'CURRENT_EFFECTIVE',
  department_id: c.departmentId,
  department: c.department
    ? {
        id: c.department.id,
        name: c.department.name,
      }
    : null,
  job_id: c.jobId,
  job: c.job
    ? {
        id: c.job.id,
        name: c.job.name,
      }
    : null,
  working_schedule_id: c.workingScheduleId,
  working_schedule: c.workingSchedule
    ? {
        id: c.workingSchedule.id,
        name: c.workingSchedule.name,
      }
    : null,
  salary_structure_id: c.salaryStructureId,
  salary_structure: c.salaryStructure
    ? {
        id: c.salaryStructure.id,
        name: c.salaryStructure.name,
      }
    : null,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
});

async function archivePreviousActiveContracts(
  tx,
  employeeId,
  newStartDate,
  excludeContractId = null,
  actorId = null,
  newRef = ''
) {
  const existingActive = await tx.contract.findMany({
    where: {
      employeeId,
      status: 'ACTIVE',
      ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
    },
  });

  const newStart = new Date(newStartDate);

  for (const prev of existingActive) {
    const prevStart = new Date(prev.startDate);
    const dayBefore = new Date(newStart.getTime() - 86400000);
    const calculatedEnd = dayBefore >= prevStart ? dayBefore : newStart;

    await tx.contract.update({
      where: { id: prev.id },
      data: {
        status: 'EXPIRED',
        endDate: prev.endDate && prev.endDate < calculatedEnd ? prev.endDate : calculatedEnd,
      },
    });

    if (actorId) {
      await writeAudit(tx, {
        actorId,
        action: 'CONTRACT_SUPERSEDED',
        entity: 'contract',
        entityId: prev.id,
        payload: {
          employee_id: employeeId,
          reference: prev.reference,
          superseded_by: newRef || excludeContractId,
          from_status: 'ACTIVE',
          to_status: 'EXPIRED',
        },
      });
    }
  }
}

export async function listContracts({
  employee_id,
  status,
  department_id,
  contract_type,
  search,
  page = 1,
  limit = 20,
} = {}) {
  const where = {};

  if (employee_id && employee_id !== 'ALL' && employee_id !== 'all') {
    where.employeeId = employee_id;
  }
  if (status && status !== 'ALL' && status !== 'all') {
    where.status = status;
  }
  if (department_id && department_id !== 'ALL' && department_id !== 'all') {
    where.departmentId = department_id;
  }
  if (contract_type && contract_type !== 'ALL' && contract_type !== 'all') {
    where.contractType = contract_type;
  }

  if (search && search.trim()) {
    const q = search.trim();
    const parts = q.split(/\s+/);
    where.OR = [
      { reference: { contains: q, mode: 'insensitive' } },
      { employee: { firstName: { contains: q, mode: 'insensitive' } } },
      { employee: { lastName: { contains: q, mode: 'insensitive' } } },
      { employee: { employeeCode: { contains: q, mode: 'insensitive' } } },
      { department: { name: { contains: q, mode: 'insensitive' } } },
      ...(parts.length > 1
        ? [
            {
              AND: [
                { employee: { firstName: { contains: parts[0], mode: 'insensitive' } } },
                { employee: { lastName: { contains: parts.slice(1).join(' '), mode: 'insensitive' } } },
              ],
            },
          ]
        : []),
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, items, statusGroups, totalAll, activeContracts] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
        job: { select: { id: true, name: true } },
        workingSchedule: { select: { id: true, name: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
    }),
    prisma.contract.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.contract.count(),
    prisma.contract.findMany({
      where: { status: 'ACTIVE' },
      select: { wage: true },
    }),
  ]);

  const statusCounts = {
    ALL: totalAll,
    ACTIVE: 0,
    DRAFT: 0,
    EXPIRED: 0,
    CANCELLED: 0,
  };
  statusGroups.forEach((g) => {
    if (g.status && statusCounts[g.status] !== undefined) {
      statusCounts[g.status] = g._count.status;
    }
  });

  const totalMonthlyWage = activeContracts.reduce((sum, c) => sum + (Number(c.wage) || 0), 0);

  return {
    items: items.map(formatContract),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
    meta: {
      statusCounts,
      totalAll,
      totalMonthlyWage,
    },
  };
}

export async function getContractById(id) {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      department: { select: { id: true, name: true } },
      job: { select: { id: true, name: true } },
      workingSchedule: { select: { id: true, name: true } },
      salaryStructure: { select: { id: true, name: true } },
    },
  });

  if (!contract) {
    throw new AppError(404, 'NOT_FOUND', 'Contract not found');
  }

  return formatContract(contract);
}

export async function createContract(data, actorId) {
  const employee = await prisma.employee.findUnique({ where: { id: data.employee_id } });
  if (!employee) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found');
  }

  assertDateRange(data.start_date, data.end_date);

  const status = data.status || 'DRAFT';
  if (status === 'ACTIVE') {
    // A contract that is already fully in the past cannot be "active".
    if (data.end_date && new Date(data.end_date) < new Date()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Cannot create an ACTIVE contract whose period already ended');
    }
    await archivePreviousActiveContracts(prisma, data.employee_id, data.start_date, null, actorId, data.reference);
  }

  const contract = await prisma.contract.create({
    data: {
      employeeId: data.employee_id,
      reference: data.reference,
      startDate: new Date(data.start_date),
      endDate: data.end_date ? new Date(data.end_date) : null,
      wage: data.wage,
      currency: data.currency || 'INR',
      contractType: data.contract_type,
      departmentId: data.department_id || null,
      jobId: data.job_id || null,
      workingScheduleId: data.working_schedule_id || null,
      salaryStructureId: data.salary_structure_id || null,
      status,
    },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      department: { select: { id: true, name: true } },
      job: { select: { id: true, name: true } },
      workingSchedule: { select: { id: true, name: true } },
      salaryStructure: { select: { id: true, name: true } },
    },
  });

  await writeAudit(prisma, {
    actorId,
    action: 'CONTRACT_CREATED',
    entity: 'contract',
    entityId: contract.id,
    payload: { employee_id: data.employee_id, reference: contract.reference, status },
  });

  return formatContract(contract);
}

const ALLOWED_CONTRACT_TRANSITIONS = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['EXPIRED', 'CANCELLED'],
  EXPIRED: [],
  CANCELLED: [],
};

function assertAllowedContractTransition(currentStatus, targetStatus) {
  if (!targetStatus || currentStatus === targetStatus) return;
  const allowed = ALLOWED_CONTRACT_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new AppError(
      409,
      'STATE_ERROR',
      `Cannot transition contract status from ${currentStatus} to ${targetStatus}`
    );
  }
}

export async function updateContract(id, data, actorId) {
  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Contract not found');
  }

  const newStartDate = data.start_date ? new Date(data.start_date) : existing.startDate;
  const newEndDate = data.end_date !== undefined ? (data.end_date ? new Date(data.end_date) : null) : existing.endDate;
  const targetStatus = data.status || existing.status;

  assertDateRange(newStartDate, newEndDate);

  if (data.status !== undefined && data.status !== existing.status) {
    assertAllowedContractTransition(existing.status, data.status);
  }

  if (targetStatus === 'ACTIVE') {
    await archivePreviousActiveContracts(prisma, existing.employeeId, newStartDate, id, actorId, data.reference || existing.reference);
  }

  const updateData = {};
  if (data.reference !== undefined) updateData.reference = data.reference;
  if (data.start_date !== undefined) updateData.startDate = new Date(data.start_date);
  if (data.end_date !== undefined) updateData.endDate = data.end_date ? new Date(data.end_date) : null;
  if (data.wage !== undefined) updateData.wage = data.wage;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.contract_type !== undefined) updateData.contractType = data.contract_type;
  if (data.department_id !== undefined) updateData.departmentId = data.department_id;
  if (data.job_id !== undefined) updateData.jobId = data.job_id;
  if (data.working_schedule_id !== undefined) updateData.workingScheduleId = data.working_schedule_id;
  if (data.salary_structure_id !== undefined) updateData.salaryStructureId = data.salary_structure_id;
  if (data.status !== undefined) updateData.status = data.status;

  const updated = await prisma.contract.update({
    where: { id },
    data: updateData,
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      department: { select: { id: true, name: true } },
      job: { select: { id: true, name: true } },
      workingSchedule: { select: { id: true, name: true } },
      salaryStructure: { select: { id: true, name: true } },
    },
  });

  await writeAudit(prisma, {
    actorId,
    action: 'CONTRACT_UPDATED',
    entity: 'contract',
    entityId: id,
    payload: { employee_id: existing.employeeId, fields: Object.keys(updateData) },
  });

  return formatContract(updated);
}

export async function updateContractStatus(id, { status }, actorId) {
  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Contract not found');
  }

  assertAllowedContractTransition(existing.status, status);

  if (status === 'ACTIVE') {
    await archivePreviousActiveContracts(prisma, existing.employeeId, existing.startDate, id, actorId, existing.reference);
  }

  const updated = await prisma.contract.update({
    where: { id },
    data: { status },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      department: { select: { id: true, name: true } },
      job: { select: { id: true, name: true } },
      workingSchedule: { select: { id: true, name: true } },
      salaryStructure: { select: { id: true, name: true } },
    },
  });

  await writeAudit(prisma, {
    actorId,
    action: 'CONTRACT_STATUS_CHANGED',
    entity: 'contract',
    entityId: id,
    payload: { employee_id: existing.employeeId, from: existing.status, to: status },
  });

  return formatContract(updated);
}

export async function deleteContract(id, actorId) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.contract.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        payslips: { select: { id: true, status: true } },
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Contract not found');
    }

    const paidOrValidated = existing.payslips.some((p) => p.status === 'VALIDATED' || p.status === 'PAID');
    if (paidOrValidated) {
      throw new AppError(400, 'CANNOT_DELETE_CONTRACT', 'Cannot delete contract associated with validated or paid payslips');
    }

    // Delete any draft/computed payslips linked to this contract
    const payslipIds = existing.payslips.map((p) => p.id);
    if (payslipIds.length > 0) {
      await tx.payrollWarning.deleteMany({ where: { payslipId: { in: payslipIds } } });
      await tx.payslipLine.deleteMany({ where: { payslipId: { in: payslipIds } } });
      await tx.payslip.deleteMany({ where: { id: { in: payslipIds } } });
    }

    await tx.contract.delete({
      where: { id },
    });

    await writeAudit(tx, {
      actorId,
      action: 'CONTRACT_DELETED',
      entity: 'contract',
      entityId: id,
      payload: {
        reference: existing.reference,
        employee_id: existing.employeeId,
        employee_name: existing.employee
          ? `${existing.employee.firstName} ${existing.employee.lastName}`
          : null,
      },
    });

    return {
      id: existing.id,
      reference: existing.reference,
      employee_id: existing.employeeId,
    };
  });
}

export async function activateContractNow(id, actorId) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.contract.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Contract not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If start_date was scheduled in the future, bring it to today so it starts immediately
    const newStartDate = existing.startDate > today ? today : existing.startDate;
    // If end_date was already in the past, clear it to ongoing
    const newEndDate = existing.endDate && existing.endDate < today ? null : existing.endDate;

    // Archive any other active contract for this employee so exactly 1 active contract remains
    await archivePreviousActiveContracts(tx, existing.employeeId, newStartDate, id, actorId, existing.reference);

    const updated = await tx.contract.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        startDate: newStartDate,
        endDate: newEndDate,
      },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
        job: { select: { id: true, name: true } },
        workingSchedule: { select: { id: true, name: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
    });

    await writeAudit(tx, {
      actorId,
      action: 'CONTRACT_ACTIVATED_NOW',
      entity: 'contract',
      entityId: id,
      payload: {
        employee_id: existing.employeeId,
        reference: existing.reference,
        effective_from: newStartDate.toISOString().slice(0, 10),
        status: 'ACTIVE',
      },
    });

    return formatContract(updated);
  });
}


