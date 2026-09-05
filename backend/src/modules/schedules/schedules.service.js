import { PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors.js';

const prisma = new PrismaClient();

function calculateWeeklyHours(lines = []) {
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

export async function listSchedules({ search, page = 1, limit = 20 } = {}) {
  const where = {};
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, items] = await Promise.all([
    prisma.workingSchedule.count({ where }),
    prisma.workingSchedule.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { name: 'asc' },
      include: {
        lines: { orderBy: { dayOfWeek: 'asc' } },
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
      scheduleType: data.schedule_type,
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

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.schedule_type !== undefined) updateData.scheduleType = data.schedule_type;

  const updated = await prisma.workingSchedule.update({
    where: { id },
    data: updateData,
    include: {
      lines: { orderBy: { dayOfWeek: 'asc' } },
    },
  });

  return formatSchedule(updated);
}

export async function replaceScheduleLines(id, lines) {
  const schedule = await prisma.workingSchedule.findUnique({ where: { id } });
  if (!schedule) {
    throw new AppError(404, 'NOT_FOUND', 'Working schedule not found');
  }

  const weeklyHours = calculateWeeklyHours(lines);

  // Atomic replacement using interactive transaction
  const updated = await prisma.$transaction(async (tx) => {
    // Delete existing lines
    await tx.scheduleLine.deleteMany({ where: { scheduleId: id } });

    // Insert new lines
    if (lines.length > 0) {
      await tx.scheduleLine.createMany({
        data: lines.map((l) => ({
          scheduleId: id,
          dayOfWeek: l.day_of_week,
          startMinutes: l.start_minutes,
          endMinutes: l.end_minutes,
          breakMinutes: l.break_minutes || 0,
        })),
      });
    }

    // Update weeklyHours total
    return tx.workingSchedule.update({
      where: { id },
      data: { weeklyHours },
      include: {
        lines: { orderBy: { dayOfWeek: 'asc' } },
      },
    });
  });

  return formatSchedule(updated);
}
