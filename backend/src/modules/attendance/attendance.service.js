import { PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors.js';

const prisma = new PrismaClient();

function computeWorkedHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
}

const formatAttendance = (a) => ({
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
  attendance_date: a.attendanceDate,
  check_in: a.checkIn,
  check_out: a.checkOut,
  worked_hours: a.workedHours !== null ? Number(a.workedHours) : null,
  overtime_hours: Number(a.overtimeHours || 0),
  status: a.status,
  source: a.source,
  note: a.note,
  created_at: a.createdAt,
  updated_at: a.updatedAt,
});

export async function listAttendance({
  employee_id,
  start_date,
  end_date,
  status,
  source,
  page = 1,
  limit = 20,
} = {}) {
  const where = {};

  if (employee_id) where.employeeId = employee_id;
  if (status) where.status = status;
  if (source) where.source = source;

  if (start_date || end_date) {
    where.attendanceDate = {};
    if (start_date) where.attendanceDate.gte = new Date(start_date);
    if (end_date) where.attendanceDate.lte = new Date(end_date);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, items] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { attendanceDate: 'desc' },
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
      },
    }),
  ]);

  return {
    items: items.map(formatAttendance),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
}

export async function getAttendanceById(id) {
  const record = await prisma.attendance.findUnique({
    where: { id },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true },
      },
    },
  });

  if (!record) {
    throw new AppError(404, 'NOT_FOUND', 'Attendance record not found');
  }

  return formatAttendance(record);
}

export async function checkIn({ employee_id, check_in_time, source = 'SELF' }) {
  const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
  if (!employee) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found');
  }

  const now = check_in_time ? new Date(check_in_time) : new Date();
  const attendanceDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: employee_id,
        attendanceDate,
      },
    },
  });

  if (existing) {
    throw new AppError(409, 'DUPLICATE', 'Attendance already recorded for today');
  }

  const record = await prisma.attendance.create({
    data: {
      employeeId: employee_id,
      attendanceDate,
      checkIn: now,
      status: 'PRESENT',
      source,
    },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true },
      },
    },
  });

  return formatAttendance(record);
}

export async function checkOut({ employee_id, check_out_time }) {
  const now = check_out_time ? new Date(check_out_time) : new Date();
  const attendanceDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const record = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: employee_id,
        attendanceDate,
      },
    },
    include: {
      employee: {
        include: { workingSchedule: true },
      },
    },
  });

  if (!record) {
    throw new AppError(404, 'NOT_FOUND', 'No check-in record found for today');
  }

  if (record.checkOut) {
    throw new AppError(409, 'STATE_ERROR', 'Employee has already checked out today');
  }

  const workedHours = computeWorkedHours(record.checkIn, now);

  const updated = await prisma.attendance.update({
    where: { id: record.id },
    data: {
      checkOut: now,
      workedHours,
      status: 'PRESENT',
    },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true },
      },
    },
  });

  return formatAttendance(updated);
}

export async function createManualAttendance(data) {
  const employee = await prisma.employee.findUnique({ where: { id: data.employee_id } });
  if (!employee) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found');
  }

  const attendanceDate = new Date(data.attendance_date);
  const existing = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: data.employee_id,
        attendanceDate,
      },
    },
  });

  if (existing) {
    throw new AppError(409, 'DUPLICATE', 'Attendance already exists for this date');
  }

  const workedHours = computeWorkedHours(data.check_in, data.check_out);

  const record = await prisma.attendance.create({
    data: {
      employeeId: data.employee_id,
      attendanceDate,
      checkIn: new Date(data.check_in),
      checkOut: data.check_out ? new Date(data.check_out) : null,
      workedHours,
      status: data.status || 'MANUAL_EDIT',
      source: 'HR',
      note: data.note || null,
    },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true },
      },
    },
  });

  return formatAttendance(record);
}

export async function updateAttendance(id, data) {
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Attendance record not found');
  }

  const checkIn = data.check_in !== undefined ? new Date(data.check_in) : existing.checkIn;
  const checkOut =
    data.check_out !== undefined
      ? data.check_out
        ? new Date(data.check_out)
        : null
      : existing.checkOut;

  const workedHours = computeWorkedHours(checkIn, checkOut);

  const updateData = {
    checkIn,
    checkOut,
    workedHours,
    status: 'MANUAL_EDIT',
  };

  if (data.note !== undefined) updateData.note = data.note;

  const updated = await prisma.attendance.update({
    where: { id },
    data: updateData,
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true },
      },
    },
  });

  return formatAttendance(updated);
}
