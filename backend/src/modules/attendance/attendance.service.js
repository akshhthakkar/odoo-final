import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to compute worked hours and overtime from checkIn and checkOut
export function computeHours(checkIn, checkOut, standardDailyHours = 8.0) {
  if (!checkIn) {
    return { workedHours: null, overtimeHours: 0 };
  }

  if (!checkOut) {
    return { workedHours: null, overtimeHours: 0 };
  }

  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();

  if (end <= start) {
    return { workedHours: 0, overtimeHours: 0 };
  }

  const diffHours = (end - start) / (1000 * 60 * 60);
  const workedHours = Number(diffHours.toFixed(2));
  const overtimeHours = workedHours > standardDailyHours ? Number((workedHours - standardDailyHours).toFixed(2)) : 0;

  return { workedHours, overtimeHours };
}

export async function listAttendance({
  employee_id,
  status,
  department_id,
  date,
  from_date,
  to_date,
  search,
  page = 1,
  limit = 50,
}) {
  const where = {};

  if (employee_id) {
    where.employeeId = employee_id;
  }

  if (status) {
    where.status = status;
  }

  if (date) {
    const targetDate = new Date(date);
    where.attendanceDate = targetDate;
  } else if (from_date || to_date) {
    where.attendanceDate = {};
    if (from_date) where.attendanceDate.gte = new Date(from_date);
    if (to_date) where.attendanceDate.lte = new Date(to_date);
  }

  if (department_id) {
    where.employee = {
      ...(where.employee || {}),
      departmentId: department_id,
    };
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.employee = {
      ...(where.employee || {}),
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { employeeCode: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    };
  }

  const offset = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip: offset,
      take,
      orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: { id: true, name: true },
            },
            job: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    prisma.attendance.count({ where }),
  ]);

  return {
    items: items.map((att) => ({
      id: att.id,
      employee_id: att.employeeId,
      employee_name: `${att.employee.firstName} ${att.employee.lastName}`.trim(),
      employee_code: att.employee.employeeCode,
      employee_email: att.employee.email,
      department_name: att.employee.department?.name || '—',
      job_title: att.employee.job?.name || '—',
      attendance_date: att.attendanceDate.toISOString().slice(0, 10),
      check_in: att.checkIn ? att.checkIn.toISOString() : null,
      check_out: att.checkOut ? att.checkOut.toISOString() : null,
      worked_hours: att.workedHours ? Number(att.workedHours) : null,
      overtime_hours: att.overtimeHours ? Number(att.overtimeHours) : 0,
      status: att.status,
      source: att.source,
      note: att.note,
      created_at: att.createdAt.toISOString(),
      updated_at: att.updatedAt.toISOString(),
    })),
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take) || 1,
    },
  };
}

export async function getAttendanceById(id) {
  const att = await prisma.attendance.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          department: { select: { id: true, name: true } },
          job: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!att) {
    const error = new Error(`Attendance record not found: ${id}`);
    error.status = 404;
    throw error;
  }

  return {
    id: att.id,
    employee_id: att.employeeId,
    employee_name: `${att.employee.firstName} ${att.employee.lastName}`.trim(),
    employee_code: att.employee.employeeCode,
    employee_email: att.employee.email,
    department_name: att.employee.department?.name || '—',
    job_title: att.employee.job?.name || '—',
    attendance_date: att.attendanceDate.toISOString().slice(0, 10),
    check_in: att.checkIn ? att.checkIn.toISOString() : null,
    check_out: att.checkOut ? att.checkOut.toISOString() : null,
    worked_hours: att.workedHours ? Number(att.workedHours) : null,
    overtime_hours: att.overtimeHours ? Number(att.overtimeHours) : 0,
    status: att.status,
    source: att.source,
    note: att.note,
    created_at: att.createdAt.toISOString(),
    updated_at: att.updatedAt.toISOString(),
  };
}

export async function createAttendance(data, userSource = 'HR') {
  const {
    employee_id,
    attendance_date,
    check_in,
    check_out,
    status,
    note,
  } = data;

  const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
  if (!employee) {
    const error = new Error(`Employee not found: ${employee_id}`);
    error.status = 404;
    throw error;
  }

  const attDate = new Date(attendance_date);

  // Check for duplicate record on same date
  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: employee_id,
        attendanceDate: attDate,
      },
    },
  });

  if (existing) {
    const error = new Error(`An attendance record already exists for ${employee.firstName} ${employee.lastName} on ${attendance_date}. Please edit the existing record.`);
    error.status = 409;
    throw error;
  }

  const checkInDate = new Date(check_in);
  const checkOutDate = check_out ? new Date(check_out) : null;

  if (checkOutDate && checkOutDate <= checkInDate) {
    const error = new Error('Check-out time must be after check-in time.');
    error.status = 400;
    throw error;
  }

  const { workedHours, overtimeHours } = computeHours(checkInDate, checkOutDate);

  // Determine status if not explicitly given
  let calculatedStatus = status || 'PRESENT';
  if (!status) {
    if (!checkOutDate) {
      calculatedStatus = 'MISSING_CHECKOUT';
    } else {
      const checkInHour = checkInDate.getHours();
      const checkInMin = checkInDate.getMinutes();
      if (checkInHour > 9 || (checkInHour === 9 && checkInMin > 15)) {
        calculatedStatus = 'LATE';
      }
    }
  }

  const created = await prisma.attendance.create({
    data: {
      employeeId: employee_id,
      attendanceDate: attDate,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      workedHours,
      overtimeHours,
      status: calculatedStatus,
      source: userSource,
      note: note || null,
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          department: { select: { name: true } },
          job: { select: { name: true } },
        },
      },
    },
  });

  return {
    id: created.id,
    employee_id: created.employeeId,
    employee_name: `${created.employee.firstName} ${created.employee.lastName}`.trim(),
    employee_code: created.employee.employeeCode,
    employee_email: created.employee.email,
    department_name: created.employee.department?.name || '—',
    job_title: created.employee.job?.name || '—',
    attendance_date: created.attendanceDate.toISOString().slice(0, 10),
    check_in: created.checkIn.toISOString(),
    check_out: created.checkOut ? created.checkOut.toISOString() : null,
    worked_hours: created.workedHours ? Number(created.workedHours) : null,
    overtime_hours: created.overtimeHours ? Number(created.overtimeHours) : 0,
    status: created.status,
    source: created.source,
    note: created.note,
  };
}

export async function updateAttendance(id, data, userSource = 'HR') {
  const existing = await prisma.attendance.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!existing) {
    const error = new Error(`Attendance record not found: ${id}`);
    error.status = 404;
    throw error;
  }

  const updateData = {};

  if (data.attendance_date) {
    updateData.attendanceDate = new Date(data.attendance_date);
  }

  const checkInDate = data.check_in !== undefined ? (data.check_in ? new Date(data.check_in) : null) : existing.checkIn;
  const checkOutDate = data.check_out !== undefined ? (data.check_out ? new Date(data.check_out) : null) : existing.checkOut;

  if (data.check_in !== undefined) updateData.checkIn = checkInDate;
  if (data.check_out !== undefined) updateData.checkOut = checkOutDate;

  if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
    const error = new Error('Check-out time must be after check-in time.');
    error.status = 400;
    throw error;
  }

  const { workedHours, overtimeHours } = computeHours(checkInDate, checkOutDate);
  updateData.workedHours = workedHours;
  updateData.overtimeHours = overtimeHours;

  if (data.status) {
    updateData.status = data.status;
  } else if (!data.status && !checkOutDate) {
    updateData.status = 'MISSING_CHECKOUT';
  }

  if (data.note !== undefined) {
    updateData.note = data.note;
  }

  updateData.source = userSource;

  const updated = await prisma.attendance.update({
    where: { id },
    data: updateData,
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          department: { select: { name: true } },
          job: { select: { name: true } },
        },
      },
    },
  });

  return {
    id: updated.id,
    employee_id: updated.employeeId,
    employee_name: `${updated.employee.firstName} ${updated.employee.lastName}`.trim(),
    employee_code: updated.employee.employeeCode,
    employee_email: updated.employee.email,
    department_name: updated.employee.department?.name || '—',
    job_title: updated.employee.job?.name || '—',
    attendance_date: updated.attendanceDate.toISOString().slice(0, 10),
    check_in: updated.checkIn ? updated.checkIn.toISOString() : null,
    check_out: updated.checkOut ? updated.checkOut.toISOString() : null,
    worked_hours: updated.workedHours ? Number(updated.workedHours) : null,
    overtime_hours: updated.overtimeHours ? Number(updated.overtimeHours) : 0,
    status: updated.status,
    source: updated.source,
    note: updated.note,
  };
}

export async function deleteAttendance(id) {
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error(`Attendance record not found: ${id}`);
    error.status = 404;
    throw error;
  }

  await prisma.attendance.delete({ where: { id } });
  return { id, deleted: true };
}

export async function getAttendanceSummary(date) {
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const [totalEmployees, records] = await Promise.all([
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.attendance.findMany({
      where: { attendanceDate: targetDate },
      select: { status: true, workedHours: true, overtimeHours: true },
    }),
  ]);

  const summary = {
    totalEmployees,
    recorded: records.length,
    present: records.filter((r) => r.status === 'PRESENT' || r.status === 'MANUAL_EDIT').length,
    late: records.filter((r) => r.status === 'LATE').length,
    missingCheckout: records.filter((r) => r.status === 'MISSING_CHECKOUT').length,
    totalWorkedHours: records.reduce((acc, r) => acc + (Number(r.workedHours) || 0), 0),
    totalOvertimeHours: records.reduce((acc, r) => acc + (Number(r.overtimeHours) || 0), 0),
  };

  return summary;
}
