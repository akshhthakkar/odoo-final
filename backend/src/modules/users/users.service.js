import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors.js';
import { writeAudit } from '../../shared/audit.js';

const prisma = new PrismaClient();

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  full_name: user.fullName,
  role: user.role,
  is_active: user.isActive,
  employee_id: user.employeeId || null,
  created_at: user.createdAt,
  updated_at: user.updatedAt,
});

export async function listUsers({ role, is_active, search, page = 1, limit = 20 } = {}) {
  const where = {};

  if (role) {
    where.role = role;
  }

  if (typeof is_active === 'boolean') {
    where.isActive = is_active;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
          },
        },
      },
    }),
  ]);

  const items = users.map((u) => ({
    ...toPublicUser(u),
    employee_code: u.employee?.employeeCode || null,
  }));

  return {
    items,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
}

export async function createUser({ email, password, full_name, role, employee_id }, actorId) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'DUPLICATE', 'Email already in use');
  }

  if (employee_id) {
    const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
    if (!employee) {
      throw new AppError(404, 'NOT_FOUND', 'Employee not found');
    }
    const alreadyLinked = await prisma.user.findUnique({ where: { employeeId: employee_id } });
    if (alreadyLinked) {
      throw new AppError(409, 'DUPLICATE', 'Employee is already linked to another user');
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: full_name,
      role,
      employeeId: employee_id || null,
    },
  });

  // Never log credentials - role/email context only.
  await writeAudit(prisma, {
    actorId,
    action: 'USER_CREATED',
    entity: 'user',
    entityId: user.id,
    payload: { email: user.email, role: user.role, employee_id: employee_id || null },
  });

  return toPublicUser(user);
}

export async function updateUser(id, { full_name, role, is_active, employee_id }, actorId) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  const data = {};
  if (full_name !== undefined) data.fullName = full_name;
  if (role !== undefined) data.role = role;
  if (is_active !== undefined) data.isActive = is_active;

  if (employee_id !== undefined) {
    if (employee_id !== null) {
      const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
      if (!employee) {
        throw new AppError(404, 'NOT_FOUND', 'Employee not found');
      }
      const alreadyLinked = await prisma.user.findFirst({
        where: { employeeId: employee_id, id: { not: id } },
      });
      if (alreadyLinked) {
        throw new AppError(409, 'DUPLICATE', 'Employee is already linked to another user');
      }
    }
    data.employeeId = employee_id;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
  });

  await writeAudit(prisma, {
    actorId,
    action: data.role !== undefined && data.role !== user.role ? 'USER_ROLE_CHANGED' : 'USER_UPDATED',
    entity: 'user',
    entityId: id,
    payload: {
      email: updated.email,
      fields: Object.keys(data),
      ...(data.role !== undefined && data.role !== user.role ? { from: user.role, to: data.role } : {}),
    },
  });

  return toPublicUser(updated);
}

export async function resetPassword(id, newPassword, actorId) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  // Never log the new password.
  await writeAudit(prisma, {
    actorId,
    action: 'USER_PASSWORD_RESET',
    entity: 'user',
    entityId: id,
    payload: { email: user.email },
  });

  return { success: true };
}
