import { PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors.js';

const prisma = new PrismaClient();

const formatType = (t) => ({
  id: t.id,
  name: t.name,
  code: t.code,
  unit: t.unit,
  requires_allocation: t.requiresAllocation,
  allows_request: t.allowsRequest,
  color: t.color,
  is_active: t.isActive,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
});

const formatAllocation = (a) => ({
  id: a.id,
  employee_id: a.employeeId,
  employee: a.employee
    ? {
        id: a.employee.id,
        employee_code: a.employee.employeeCode,
        first_name: a.employee.firstName,
        last_name: a.employee.lastName,
      }
    : null,
  type_id: a.typeId,
  type: a.type ? { id: a.type.id, name: a.type.name, code: a.type.code } : null,
  valid_from: a.validFrom,
  valid_to: a.validTo,
  allocated_days: Number(a.allocatedDays),
  taken_days: Number(a.takenDays),
  remaining_days: Number(a.allocatedDays) - Number(a.takenDays),
  status: a.status,
  created_at: a.createdAt,
  updated_at: a.updatedAt,
});

const formatRequest = (r) => ({
  id: r.id,
  employee_id: r.employeeId,
  employee: r.employee
    ? {
        id: r.employee.id,
        employee_code: r.employee.employeeCode,
        first_name: r.employee.firstName,
        last_name: r.employee.lastName,
      }
    : null,
  type_id: r.typeId,
  type: r.type ? { id: r.type.id, name: r.type.name, code: r.type.code } : null,
  date_from: r.dateFrom,
  date_to: r.dateTo,
  days: Number(r.days),
  status: r.status,
  reason: r.reason,
  approver_id: r.approverId,
  decided_at: r.decidedAt,
  refusal_reason: r.refusalReason,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
});

// --- Leave Types ---
export async function listTypes() {
  const types = await prisma.timeOffType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return types.map(formatType);
}

export async function createType(data) {
  const existing = await prisma.timeOffType.findFirst({
    where: { OR: [{ code: data.code }, { name: data.name }] },
  });
  if (existing) {
    throw new AppError(409, 'DUPLICATE', 'Time off type name or code already exists');
  }

  const type = await prisma.timeOffType.create({
    data: {
      name: data.name,
      code: data.code,
      unit: data.unit,
      requiresAllocation: data.requires_allocation ?? true,
      allowsRequest: data.allows_request ?? true,
      color: data.color || null,
      isActive: true,
    },
  });

  return formatType(type);
}

// --- Allocations ---
export async function listAllocations({ employee_id, type_id, status } = {}) {
  const where = {};
  if (employee_id) where.employeeId = employee_id;
  if (type_id) where.typeId = type_id;
  if (status) where.status = status;

  const allocations = await prisma.timeOffAllocation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      type: { select: { id: true, name: true, code: true } },
    },
  });

  return allocations.map(formatAllocation);
}

export async function createAllocation(data) {
  const employee = await prisma.employee.findUnique({ where: { id: data.employee_id } });
  if (!employee) throw new AppError(404, 'NOT_FOUND', 'Employee not found');

  const type = await prisma.timeOffType.findUnique({ where: { id: data.type_id } });
  if (!type) throw new AppError(404, 'NOT_FOUND', 'Time off type not found');

  const allocation = await prisma.timeOffAllocation.create({
    data: {
      employeeId: data.employee_id,
      typeId: data.type_id,
      validFrom: new Date(data.valid_from),
      validTo: new Date(data.valid_to),
      allocatedDays: data.allocated_days,
      takenDays: 0,
      status: data.status || 'APPROVED',
    },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      type: { select: { id: true, name: true, code: true } },
    },
  });

  return formatAllocation(allocation);
}

// --- Requests ---
export async function listRequests({ employee_id, type_id, status, date_from, date_to } = {}) {
  const where = {};
  if (employee_id) where.employeeId = employee_id;
  if (type_id) where.typeId = type_id;
  if (status) where.status = status;

  if (date_from || date_to) {
    if (date_from) where.dateFrom = { gte: new Date(date_from) };
    if (date_to) where.dateTo = { lte: new Date(date_to) };
  }

  const requests = await prisma.timeOffRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      type: { select: { id: true, name: true, code: true } },
    },
  });

  return requests.map(formatRequest);
}

export async function createRequest(data) {
  const employee = await prisma.employee.findUnique({ where: { id: data.employee_id } });
  if (!employee) throw new AppError(404, 'NOT_FOUND', 'Employee not found');

  const type = await prisma.timeOffType.findUnique({ where: { id: data.type_id } });
  if (!type) throw new AppError(404, 'NOT_FOUND', 'Time off type not found');
  if (!type.allowsRequest) {
    throw new AppError(400, 'VALIDATION_ERROR', 'This time off type does not accept employee requests');
  }

  const dateFrom = new Date(data.date_from);
  const dateTo = new Date(data.date_to);
  const days = Number(data.days);

  // Balance verification if allocation is required
  if (type.requiresAllocation) {
    const activeAllocations = await prisma.timeOffAllocation.findMany({
      where: {
        employeeId: data.employee_id,
        typeId: data.type_id,
        status: 'APPROVED',
        validFrom: { lte: dateTo },
        validTo: { gte: dateFrom },
      },
    });

    const totalAllocated = activeAllocations.reduce((acc, a) => acc + Number(a.allocatedDays), 0);
    const totalTaken = activeAllocations.reduce((acc, a) => acc + Number(a.takenDays), 0);
    const availableBalance = totalAllocated - totalTaken;

    if (days > availableBalance) {
      throw new AppError(
        409,
        'INSUFFICIENT_BALANCE',
        `Insufficient leave balance. Requested: ${days} days, Available: ${availableBalance} days`
      );
    }
  }

  const request = await prisma.timeOffRequest.create({
    data: {
      employeeId: data.employee_id,
      typeId: data.type_id,
      dateFrom,
      dateTo,
      days,
      status: 'TO_APPROVE',
      reason: data.reason || null,
    },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      type: { select: { id: true, name: true, code: true } },
    },
  });

  return formatRequest(request);
}

export async function approveRequest(id, approverUserId) {
  const request = await prisma.timeOffRequest.findUnique({
    where: { id },
    include: { type: true },
  });

  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Time off request not found');
  }

  if (request.status !== 'TO_APPROVE') {
    throw new AppError(409, 'STATE_ERROR', `Request is already ${request.status.toLowerCase()}`);
  }

  // Update allocation takenDays if allocation required
  if (request.type.requiresAllocation) {
    const allocation = await prisma.timeOffAllocation.findFirst({
      where: {
        employeeId: request.employeeId,
        typeId: request.typeId,
        status: 'APPROVED',
        validFrom: { lte: request.dateTo },
        validTo: { gte: request.dateFrom },
      },
    });

    if (allocation) {
      await prisma.timeOffAllocation.update({
        where: { id: allocation.id },
        data: { takenDays: { increment: request.days } },
      });
    }
  }

  const updated = await prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approverId: approverUserId || null,
      decidedAt: new Date(),
    },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      type: { select: { id: true, name: true, code: true } },
    },
  });

  return formatRequest(updated);
}

export async function refuseRequest(id, approverUserId, refusalReason) {
  const request = await prisma.timeOffRequest.findUnique({ where: { id } });
  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Time off request not found');
  }

  if (request.status !== 'TO_APPROVE') {
    throw new AppError(409, 'STATE_ERROR', `Request is already ${request.status.toLowerCase()}`);
  }

  const updated = await prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: 'REFUSED',
      approverId: approverUserId || null,
      decidedAt: new Date(),
      refusalReason: refusalReason || null,
    },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      type: { select: { id: true, name: true, code: true } },
    },
  });

  return formatRequest(updated);
}
