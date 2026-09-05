import { prisma } from '../../shared/prisma.js';
import { AppError } from '../../shared/errors.js';
import { writeAudit } from '../../shared/audit.js';

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

export async function createType(data, actorId) {
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

  await writeAudit(prisma, {
    actorId,
    action: 'TIMEOFF_TYPE_CREATED',
    entity: 'time_off_type',
    entityId: type.id,
    payload: { code: type.code, name: type.name },
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

export async function createAllocation(data, actorId) {
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

  await writeAudit(prisma, {
    actorId,
    action: 'TIMEOFF_ALLOCATION_CREATED',
    entity: 'time_off_allocation',
    entityId: allocation.id,
    payload: { employee_id: data.employee_id, type_code: type.code, allocated_days: Number(data.allocated_days) },
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

// A-02: the authoritative leave amount is computed server-side.
// DAYS unit: inclusive calendar days in the range, counted only on weekdays the
// employee's working schedule covers (all days when no schedule/lines exist).
function computeRequestedDays(rangeStart, rangeEnd, scheduleDays) {
  let count = 0;
  const cursor = new Date(
    Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate())
  );
  const last = new Date(
    Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate())
  );
  while (cursor <= last) {
    if (scheduleDays.size === 0 || scheduleDays.has(cursor.getUTCDay())) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export async function createRequest(data, actor) {
  const employee = await prisma.employee.findUnique({
    where: { id: data.employee_id },
    include: { workingSchedule: { include: { lines: true } } },
  });
  if (!employee) throw new AppError(404, 'NOT_FOUND', 'Employee not found');

  const type = await prisma.timeOffType.findUnique({ where: { id: data.type_id } });
  if (!type) throw new AppError(404, 'NOT_FOUND', 'Time off type not found');
  if (!type.allowsRequest) {
    throw new AppError(400, 'VALIDATION_ERROR', 'This time off type does not accept employee requests');
  }

  const dateFrom = new Date(data.date_from);
  const dateTo = new Date(data.date_to);

  if (type.unit === 'HOURS') {
    // No hour-based request rules exist yet (no duration field in the schema);
    // reject honestly rather than inventing semantics.
    throw new AppError(422, 'UNPROCESSABLE', 'Hour-based time off requests are not supported yet');
  }

  const scheduleDays = new Set(
    (employee.workingSchedule?.lines ?? []).map((line) => line.dayOfWeek)
  );
  // A-02: the authoritative value comes from the server, never the client.
  const days = computeRequestedDays(dateFrom, dateTo, scheduleDays);
  if (days <= 0) {
    throw new AppError(422, 'UNPROCESSABLE', 'Date range contains no working days');
  }

  const overlap = await assertOverlapExists(employee.id, type.id, dateFrom, dateTo);
  if (overlap) {
    throw new AppError(
      422,
      'UNPROCESSABLE',
      `Request overlaps an existing ${overlap.status.toLowerCase()} leave request`
    );
  }

  // Balance verification if allocation is required (using server-computed days).
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

  await writeAudit(prisma, {
    actorId: actor.id,
    action: 'TIMEOFF_REQUEST_CREATED',
    entity: 'time_off_request',
    entityId: request.id,
    payload: { employee_id: data.employee_id, days, date_from: data.date_from, date_to: data.date_to },
  });

  return formatRequest(request);
}

async function assertOverlapExists(employeeId, typeId, dateFrom, dateTo) {
  return prisma.timeOffRequest.findFirst({
    where: {
      employeeId,
      typeId,
      status: { in: ['TO_APPROVE', 'APPROVED'] },
      dateFrom: { lte: dateTo },
      dateTo: { gte: dateFrom },
    },
  });
}

// A-03/A-04: approve is one transaction with a conditional status claim and an
// atomic, balance-guarded allocation increment. Self-approval is rejected.
export async function approveRequest(id, approverUser) {
  const request = await prisma.timeOffRequest.findUnique({
    where: { id },
    include: { type: true },
  });

  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Time off request not found');
  }

  if (approverUser.employee_id && request.employeeId === approverUser.employee_id) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot approve your own leave request');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Claim the request atomically: only one concurrent caller wins.
    const claim = await tx.timeOffRequest.updateMany({
      where: { id, status: 'TO_APPROVE' },
      data: {
        status: 'APPROVED',
        approverId: approverUser.id || null,
        decidedAt: new Date(),
      },
    });
    if (claim.count === 0) {
      const current = await tx.timeOffRequest.findUnique({ where: { id } });
      throw new AppError(
        409,
        'STATE_ERROR',
        current ? `Request is already ${current.status.toLowerCase()}` : 'Request not found'
      );
    }

    // 2. Deduct balance with a single atomic, balance-guarded update
    //    (column-to-column guard via SQL; a plain read-then-increment is racy).
    let allocationSummary = null;
    if (request.type.requiresAllocation) {
      const allocations = await tx.timeOffAllocation.findMany({
        where: {
          employeeId: request.employeeId,
          typeId: request.typeId,
          status: 'APPROVED',
          validFrom: { lte: request.dateTo },
          validTo: { gte: request.dateFrom },
        },
        orderBy: [
          { validFrom: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      // Prefer the earliest allocation that actually has enough remaining
      // balance (an exhausted earlier allocation must not block approval).
      const allocation =
        allocations.find(
          (a) => Number(a.allocatedDays) - Number(a.takenDays) >= Number(request.days)
        ) || null;

      if (!allocation) {
        // No covering allocation with remaining balance: refusing to approve
        // here (rolling back the claim) is safer than silently skipping
        // deduction.
        throw new AppError(
          409,
          'INSUFFICIENT_BALANCE',
          `Insufficient leave balance. Requested: ${Number(request.days)} days`
        );
      }

      const deducted = await tx.$executeRaw`
        UPDATE time_off_allocations
        SET taken_days = taken_days + ${request.days}::numeric,
            updated_at = now()
        WHERE id = ${allocation.id}::uuid
          AND taken_days + ${request.days}::numeric <= allocated_days
      `;
      if (deducted === 0) {
        throw new AppError(
          409,
          'INSUFFICIENT_BALANCE',
          `Insufficient leave balance. Requested: ${Number(request.days)} days`
        );
      }

      const fresh = await tx.timeOffAllocation.findUnique({ where: { id: allocation.id } });
      allocationSummary = {
        id: fresh.id,
        allocated_days: Number(fresh.allocatedDays),
        taken_days: Number(fresh.takenDays),
        remaining: Number(fresh.allocatedDays) - Number(fresh.takenDays),
      };
    }

    // 3. Audit inside the same transaction.
    await writeAudit(tx, {
      actorId: approverUser.id,
      action: 'TIMEOFF_REQUEST_APPROVED',
      entity: 'time_off_request',
      entityId: id,
      payload: { employee_id: request.employeeId, days: Number(request.days) },
    });

    const approved = await tx.timeOffRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        type: { select: { id: true, name: true, code: true } },
      },
    });

    // 4. Contract-mandated response: request + allocation summary.
    return { request: formatRequest(approved), allocation: allocationSummary };
  });
}

export async function refuseRequest(id, approverUser, refusalReason) {
  const request = await prisma.timeOffRequest.findUnique({ where: { id } });
  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Time off request not found');
  }

  if (approverUser.employee_id && request.employeeId === approverUser.employee_id) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot refuse your own leave request');
  }

  return prisma.$transaction(async (tx) => {
    const claim = await tx.timeOffRequest.updateMany({
      where: { id, status: 'TO_APPROVE' },
      data: {
        status: 'REFUSED',
        approverId: approverUser.id || null,
        decidedAt: new Date(),
        refusalReason: refusalReason || null,
      },
    });
    if (claim.count === 0) {
      const current = await tx.timeOffRequest.findUnique({ where: { id } });
      throw new AppError(
        409,
        'STATE_ERROR',
        current ? `Request is already ${current.status.toLowerCase()}` : 'Request not found'
      );
    }

    await writeAudit(tx, {
      actorId: approverUser.id,
      action: 'TIMEOFF_REQUEST_REFUSED',
      entity: 'time_off_request',
      entityId: id,
      payload: { employee_id: request.employeeId, reason: refusalReason || null },
    });

    const refused = await tx.timeOffRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        type: { select: { id: true, name: true, code: true } },
      },
    });
    return { request: formatRequest(refused), allocation: null };
  });
}

// Contract DELETE route: soft-cancel while TO_APPROVE only; owner may cancel
// their own request, HR/ADMIN may cancel any.
export async function cancelRequest(id, actorUser) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.timeOffRequest.findUnique({ where: { id } });
    if (!request) {
      throw new AppError(404, 'NOT_FOUND', 'Time off request not found');
    }
    if (actorUser.role === 'EMPLOYEE' && request.employeeId !== actorUser.employee_id) {
      throw new AppError(403, 'FORBIDDEN', 'You can only cancel your own leave request');
    }

    const claim = await tx.timeOffRequest.updateMany({
      where: { id, status: 'TO_APPROVE' },
      data: { status: 'CANCELLED' },
    });
    if (claim.count === 0) {
      const current = await tx.timeOffRequest.findUnique({ where: { id } });
      throw new AppError(
        409,
        'STATE_ERROR',
        current ? `Cannot cancel a ${current.status.toLowerCase()} request` : 'Request not found'
      );
    }

    await writeAudit(tx, {
      actorId: actorUser.id,
      action: 'TIMEOFF_REQUEST_CANCELLED',
      entity: 'time_off_request',
      entityId: id,
      payload: { employee_id: request.employeeId },
    });

    const cancelled = await tx.timeOffRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        type: { select: { id: true, name: true, code: true } },
      },
    });
    return { request: formatRequest(cancelled), allocation: null };
  });
}
