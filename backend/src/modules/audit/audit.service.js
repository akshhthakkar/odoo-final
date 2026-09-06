import { prisma } from '../../shared/prisma.js';

export async function listAuditLogs({
  action,
  entity,
  actor_id,
  search,
  start_date,
  end_date,
  page = 1,
  limit = 20,
}) {
  const where = {};

  if (action && action !== 'ALL') {
    where.action = action;
  }

  if (entity && entity !== 'ALL') {
    where.entity = entity;
  }

  if (actor_id) {
    where.actorId = actor_id;
  }

  if (start_date || end_date) {
    where.createdAt = {};
    if (start_date) {
      where.createdAt.gte = new Date(start_date);
    }
    if (end_date) {
      const end = new Date(end_date);
      // If date string only (YYYY-MM-DD), set to end of day
      if (typeof end_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        end.setHours(23, 59, 59, 999);
      }
      where.createdAt.lte = end;
    }
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { action: { contains: term, mode: 'insensitive' } },
      { entity: { contains: term, mode: 'insensitive' } },
      { actor: { fullName: { contains: term, mode: 'insensitive' } } },
      { actor: { email: { contains: term, mode: 'insensitive' } } },
      { payload: { path: ['employee_code'], string_contains: term } },
      { payload: { path: ['email'], string_contains: term } },
      { payload: { path: ['name'], string_contains: term } },
      { payload: { path: ['full_name'], string_contains: term } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  // Compute metrics for the admin header
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [total, items, total24h, employeeCreatedCount, userCreatedCount, actionGroups] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({
      where: {
        createdAt: { gte: oneDayAgo },
      },
    }),
    prisma.auditLog.count({
      where: { action: 'EMPLOYEE_CREATED' },
    }),
    prisma.auditLog.count({
      where: { action: 'USER_CREATED' },
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
    }),
  ]);

  const formattedItems = items.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    entity_id: log.entityId,
    payload: log.payload,
    ip: log.ip,
    created_at: log.createdAt.toISOString(),
    actor: log.actor
      ? {
          id: log.actor.id,
          email: log.actor.email,
          full_name: log.actor.fullName,
          role: log.actor.role,
        }
      : {
          id: null,
          email: 'system@pay365.internal',
          full_name: 'System Engine',
          role: 'SYSTEM',
        },
  }));

  const actionCounts = {};
  actionGroups.forEach((g) => {
    actionCounts[g.action] = g._count.action;
  });

  return {
    items: formattedItems,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
    meta: {
      totalAll: total,
      total24h,
      employeeCreatedCount,
      userCreatedCount,
      actionCounts,
    },
  };
}
