import { PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors.js';

const prisma = new PrismaClient();

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

async function checkContractOverlap(employeeId, startDate, endDate, excludeContractId = null) {
  const existingActive = await prisma.contract.findMany({
    where: {
      employeeId,
      status: 'ACTIVE',
      ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
    },
  });

  const newStart = new Date(startDate);
  const newEnd = endDate ? new Date(endDate) : new Date('9999-12-31');

  for (const c of existingActive) {
    const activeStart = new Date(c.startDate);
    const activeEnd = c.endDate ? new Date(c.endDate) : new Date('9999-12-31');

    // Overlap exists if (newStart <= activeEnd && newEnd >= activeStart)
    if (newStart <= activeEnd && newEnd >= activeStart) {
      throw new AppError(
        409,
        'CONTRACT_OVERLAP',
        `Contract overlaps with existing active contract "${c.reference}" (${c.startDate.toISOString().slice(0, 10)} to ${c.endDate ? c.endDate.toISOString().slice(0, 10) : 'indefinite'})`
      );
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

  if (employee_id) where.employeeId = employee_id;
  if (status) where.status = status;
  if (department_id) where.departmentId = department_id;
  if (contract_type) where.contractType = contract_type;

  if (search) {
    where.OR = [
      { reference: { contains: search, mode: 'insensitive' } },
      { employee: { firstName: { contains: search, mode: 'insensitive' } } },
      { employee: { lastName: { contains: search, mode: 'insensitive' } } },
      { employee: { employeeCode: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, items] = await Promise.all([
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
  ]);

  return {
    items: items.map(formatContract),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
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

export async function createContract(data) {
  const employee = await prisma.employee.findUnique({ where: { id: data.employee_id } });
  if (!employee) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found');
  }

  const status = data.status || 'DRAFT';
  if (status === 'ACTIVE') {
    await checkContractOverlap(data.employee_id, data.start_date, data.end_date);
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

  return formatContract(contract);
}

export async function updateContract(id, data) {
  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Contract not found');
  }

  const newStartDate = data.start_date ? new Date(data.start_date) : existing.startDate;
  const newEndDate = data.end_date !== undefined ? (data.end_date ? new Date(data.end_date) : null) : existing.endDate;
  const targetStatus = data.status || existing.status;

  if (targetStatus === 'ACTIVE') {
    await checkContractOverlap(existing.employeeId, newStartDate, newEndDate, id);
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

  return formatContract(updated);
}

export async function updateContractStatus(id, { status }) {
  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Contract not found');
  }

  if (status === 'ACTIVE') {
    await checkContractOverlap(existing.employeeId, existing.startDate, existing.endDate, id);
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

  return formatContract(updated);
}
