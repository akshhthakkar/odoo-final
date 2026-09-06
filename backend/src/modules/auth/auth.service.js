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

async function ensureEmployeeLink(user) {
  if (user.role === 'EMPLOYEE' && !user.employeeId) {
    let emp = await prisma.employee.findUnique({ where: { email: user.email } });
    if (!emp) {
      const nameParts = (user.fullName || 'Employee').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Employee';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      const count = await prisma.employee.count();
      let code = `EMP-${String(count + 1).padStart(3, '0')}`;
      const existsCode = await prisma.employee.findUnique({ where: { employeeCode: code } });
      if (existsCode) {
        code = `EMP-${Date.now().toString().slice(-4)}`;
      }
      emp = await prisma.employee.create({
        data: {
          employeeCode: code,
          firstName,
          lastName,
          email: user.email,
          hireDate: user.createdAt || new Date(),
          status: 'ACTIVE',
        },
      });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { employeeId: emp.id },
    });
    user.employeeId = emp.id;
    user.employee = {
      id: emp.id,
      employeeCode: emp.employeeCode,
      departmentId: emp.departmentId,
      jobId: emp.jobId,
    };
  }
}

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

  await ensureEmployeeLink(user);

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

  await ensureEmployeeLink(user);

  return formatAuthResponse(user);
}

