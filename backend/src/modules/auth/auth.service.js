import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors.js';

const prisma = new PrismaClient();

const formatAuthResponse = (user) => ({
  user: {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    employee_id: user.employeeId || null,
  },
  employee: user.employee
    ? {
        id: user.employee.id,
        employee_code: user.employee.employeeCode,
        department_id: user.employee.departmentId,
        job_id: user.employee.jobId,
      }
    : null,
});

export async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          departmentId: true,
          jobId: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return formatAuthResponse(user);
}

export async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          departmentId: true,
          jobId: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  return formatAuthResponse(user);
}

