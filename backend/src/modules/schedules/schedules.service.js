import { PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors.js';

const prisma = new PrismaClient();

export function calculateWeeklyHours(lines = []) {
  let totalMinutes = 0;
  for (const line of lines) {
    const duration = line.end_minutes - line.start_minutes - (line.break_minutes || 0);
    if (duration > 0) {
      totalMinutes += duration;
    }
  }
  return Number((totalMinutes / 60).toFixed(2));
}

const formatSchedule = (s) => ({
  id: s.id,
  name: s.name,
  schedule_type: s.scheduleType,
  weekly_hours: Number(s.weeklyHours),
  employees_count: s._count ? s._count.employees : (s.employees ? s.employees.length : 0),
  employees: (s.employees || []).map((e) => ({
    id: e.id,
    first_name: e.firstName,
    last_name: e.lastName,
    name: `${e.firstName} ${e.lastName}`.trim(),
    employee_code: e.employeeCode,
    email: e.email,
    department: e.department ? e.department.name : null,
  })),
  lines: (s.lines || []).map((l) => ({
    id: l.id,
    day_of_week: l.dayOfWeek,
    start_minutes: l.startMinutes,
    end_minutes: l.endMinutes,
    break_minutes: l.breakMinutes,
  })),
  created_at: s.createdAt,
  updated_at: s.updatedAt,
});

export async function listSchedules({ search, page = 1, limit = 50 } = {}) {
  const where = {};
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [total, items] = await Promise.all([
    prisma.workingSchedule.count({ where }),
    prisma.workingSchedule.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'asc' },
      include: {
        lines: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { employees: true } },
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: items.map(formatSchedule),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
}

export async function getScheduleById(id) {
  const schedule = await prisma.workingSchedule.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { dayOfWeek: 'asc' } },
      _count: { select: { employees: true } },
      employees: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          email: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  if (!schedule) {
    throw new AppError(404, 'NOT_FOUND', 'Working schedule not found');
  }

  return formatSchedule(schedule);
}

export async function createSchedule(data) {
  const existing = await prisma.workingSchedule.findUnique({
    where: { name: data.name },
  });
  if (existing) {
    throw new AppError(409, 'DUPLICATE', 'Working schedule with this name already exists');
  }

  const lines = data.lines || [];
  const weeklyHours = calculateWeeklyHours(lines);

  const schedule = await prisma.workingSchedule.create({
    data: {
      name: data.name,
      scheduleType: data.schedule_type || 'FULL_TIME',
      weeklyHours,
      lines: {
        create: lines.map((l) => ({
          dayOfWeek: l.day_of_week,
          startMinutes: l.start_minutes,
          endMinutes: l.end_minutes,
          breakMinutes: l.break_minutes || 0,
        })),
      },
    },
    include: {
      lines: { orderBy: { dayOfWeek: 'asc' } },
      _count: { select: { employees: true } },
      employees: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          email: true,
        },
      },
    },
  });

  return formatSchedule(schedule);
}

export async function updateSchedule(id, data) {
  const schedule = await prisma.workingSchedule.findUnique({ where: { id } });
  if (!schedule) {
    throw new AppError(404, 'NOT_FOUND', 'Working schedule not found');
  }

  if (data.name && data.name !== schedule.name) {
    const existing = await prisma.workingSchedule.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError(409, 'DUPLICATE', 'Working schedule name already exists');
  }

  return await prisma.$transaction(async (tx) => {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.schedule_type !== undefined) updateData.scheduleType = data.schedule_type;

    if (data.lines) {
      updateData.weeklyHours = calculateWeeklyHours(data.lines);
      await tx.scheduleLine.deleteMany({ where: { scheduleId: id } });
      if (data.lines.length > 0) {
        await tx.scheduleLine.createMany({
          data: data.lines.map((l) => ({
            scheduleId: id,
            dayOfWeek: l.day_of_week,
            startMinutes: l.start_minutes,
            endMinutes: l.end_minutes,
            breakMinutes: l.break_minutes || 0,
          })),
        });
      }
    }

    const updated = await tx.workingSchedule.update({
      where: { id },
      data: updateData,
      include: {
        lines: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { employees: true } },
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    return formatSchedule(updated);
  });
}

export async function assignEmployeesToSchedule(scheduleId, employeeIds = []) {
  const schedule = await prisma.workingSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) {
    throw new AppError(404, 'NOT_FOUND', 'Working schedule not found');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Remove schedule assignment for employees currently assigned to this schedule but not in employeeIds
    await tx.employee.updateMany({
      where: {
        workingScheduleId: scheduleId,
        id: { notIn: employeeIds },
      },
      data: {
        workingScheduleId: null,
      },
    });

    // 2. Assign selected employees to this schedule
    if (employeeIds.length > 0) {
      await tx.employee.updateMany({
        where: {
          id: { in: employeeIds },
        },
        data: {
          workingScheduleId: scheduleId,
        },
      });
    }
  });

  return getScheduleById(scheduleId);
}

export async function deleteSchedule(id) {
  const schedule = await prisma.workingSchedule.findUnique({
    where: { id },
    include: { _count: { select: { employees: true, contracts: true } } },
  });

  if (!schedule) {
    throw new AppError(404, 'NOT_FOUND', 'Working schedule not found');
  }

  if (schedule._count.employees > 0 || schedule._count.contracts > 0) {
    throw new AppError(409, 'RESOURCE_HAS_DEPENDENCIES', 'Cannot delete schedule with assigned employees or contracts. Reassign them first.');
  }

  await prisma.scheduleLine.deleteMany({ where: { scheduleId: id } });
  await prisma.workingSchedule.delete({ where: { id } });

  return { id, deleted: true };
}
