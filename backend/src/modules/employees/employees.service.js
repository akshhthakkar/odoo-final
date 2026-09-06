import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors.js';
import { writeAudit } from '../../shared/audit.js';

const prisma = new PrismaClient();

// FK-reference validation for update paths (create validates via dedicated
// checks; update previously wrote unvalidated FKs -> raw 500s).
async function assertReferencesExist(data) {
  if (data.department_id) {
    const dept = await prisma.department.findUnique({ where: { id: data.department_id } });
    if (!dept) throw new AppError(404, 'NOT_FOUND', 'Department not found');
  }
  if (data.job_id) {
    const job = await prisma.job.findUnique({ where: { id: data.job_id } });
    if (!job) throw new AppError(404, 'NOT_FOUND', 'Job position not found');
  }
  if (data.manager_id) {
    const mgr = await prisma.employee.findUnique({ where: { id: data.manager_id } });
    if (!mgr) throw new AppError(404, 'NOT_FOUND', 'Manager employee not found');
    if (data.self_id && data.manager_id === data.self_id) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Employee cannot be their own manager');
    }
  }
  if (data.working_schedule_id) {
    const schedule = await prisma.workingSchedule.findUnique({ where: { id: data.working_schedule_id } });
    if (!schedule) throw new AppError(404, 'NOT_FOUND', 'Working schedule not found');
  }
}

const formatEmployee = (emp) => ({
  id: emp.id,
  employee_code: emp.employeeCode,
  first_name: emp.firstName,
  last_name: emp.lastName,
  email: emp.email,
  phone: emp.phone,
  date_of_birth: emp.dateOfBirth,
  gender: emp.gender,
  address: emp.address,
  hire_date: emp.hireDate,
  termination_date: emp.terminationDate,
  status: emp.status,
  department_id: emp.departmentId,
  department: emp.department
    ? {
        id: emp.department.id,
        name: emp.department.name,
        code: emp.department.code,
      }
    : null,
  job_id: emp.jobId,
  job: emp.job
    ? {
        id: emp.job.id,
        name: emp.job.name,
      }
    : null,
  manager_id: emp.managerId,
  manager: emp.manager
    ? {
        id: emp.manager.id,
        employee_code: emp.manager.employeeCode,
        first_name: emp.manager.firstName,
        last_name: emp.manager.lastName,
      }
    : null,
  working_schedule_id: emp.workingScheduleId,
  working_schedule: emp.workingSchedule
    ? {
        id: emp.workingSchedule.id,
        name: emp.workingSchedule.name,
      }
    : null,
  bank_account_name: emp.bankAccountName,
  // SEC-02: bank numbers are masked to the last 4 in all API responses.
  bank_account_number: emp.bankAccountNumber
    ? `XXXXXXX${emp.bankAccountNumber.slice(-4)}`
    : null,
  bank_ifsc: emp.bankIfsc,
  created_at: emp.createdAt,
  updated_at: emp.updatedAt,
});

export async function listEmployees({
  department_id,
  job_id,
  status,
  manager_id,
  search,
  page = 1,
  limit = 20,
} = {}) {
  const where = {};

  if (department_id && department_id !== 'ALL' && department_id !== 'all') {
    where.departmentId = department_id;
  }
  if (job_id && job_id !== 'ALL' && job_id !== 'all') {
    where.jobId = job_id;
  }
  if (status && status !== 'ALL' && status !== 'all') {
    where.status = status;
  }
  if (manager_id && manager_id !== 'ALL' && manager_id !== 'all') {
    where.managerId = manager_id;
  }

  if (search && search.trim()) {
    const q = search.trim();
    const parts = q.split(/\s+/);
    where.OR = [
      { employeeCode: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { department: { name: { contains: q, mode: 'insensitive' } } },
      { job: { name: { contains: q, mode: 'insensitive' } } },
      ...(parts.length > 1
        ? [
            {
              AND: [
                { firstName: { contains: parts[0], mode: 'insensitive' } },
                { lastName: { contains: parts.slice(1).join(' '), mode: 'insensitive' } },
              ],
            },
          ]
        : []),
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, items, statusGroups, totalAll] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
        job: { select: { id: true, name: true } },
        manager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      },
    }),
    prisma.employee.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.employee.count(),
  ]);

  const statusCounts = {
    ALL: totalAll,
    ACTIVE: 0,
    ON_LEAVE: 0,
    SUSPENDED: 0,
    TERMINATED: 0,
  };
  statusGroups.forEach((g) => {
    if (g.status && statusCounts[g.status] !== undefined) {
      statusCounts[g.status] = g._count.status;
    }
  });

  return {
    items: items.map(formatEmployee),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
    meta: {
      statusCounts,
      totalAll,
    },
  };
}

export async function getEmployeeById(id) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, code: true } },
      job: { select: { id: true, name: true } },
      manager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      workingSchedule: { select: { id: true, name: true } },
      contracts: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
    },
  });

  if (!employee) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found');
  }

  const formatted = formatEmployee(employee);
  formatted.active_contract = employee.contracts?.[0] || null;
  return formatted;
}

export async function createEmployee(data, actorId) {
  const existingCode = await prisma.employee.findUnique({
    where: { employeeCode: data.employee_code },
  });
  if (existingCode) {
    throw new AppError(409, 'DUPLICATE', 'Employee code already exists');
  }

  const existingEmail = await prisma.employee.findUnique({
    where: { email: data.email },
  });
  if (existingEmail) {
    throw new AppError(409, 'DUPLICATE', 'Email already in use');
  }

  if (data.department_id) {
    const dept = await prisma.department.findUnique({ where: { id: data.department_id } });
    if (!dept) throw new AppError(404, 'NOT_FOUND', 'Department not found');
  }

  if (data.job_id) {
    const job = await prisma.job.findUnique({ where: { id: data.job_id } });
    if (!job) throw new AppError(404, 'NOT_FOUND', 'Job position not found');
  }

  if (data.manager_id) {
    const mgr = await prisma.employee.findUnique({ where: { id: data.manager_id } });
    if (!mgr) throw new AppError(404, 'NOT_FOUND', 'Manager employee not found');
  }

  const employee = await prisma.employee.create({
    data: {
      employeeCode: data.employee_code,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone || null,
      dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth) : null,
      gender: data.gender || null,
      address: data.address || null,
      hireDate: new Date(data.hire_date),
      departmentId: data.department_id || null,
      jobId: data.job_id || null,
      managerId: data.manager_id || null,
      workingScheduleId: data.working_schedule_id || null,
      bankAccountName: data.bank_account_name || null,
      bankAccountNumber: data.bank_account_number || null,
      bankIfsc: data.bank_ifsc || null,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      job: { select: { id: true, name: true } },
      manager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
    },
  });

  // Auto-provision or link User account for seamless employee login workflow
  if (employee.email) {
    const existingUser = await prisma.user.findUnique({ where: { email: employee.email } });
    const rawPassword =
      typeof data.password === 'string' && data.password.trim().length >= 6
        ? data.password.trim()
        : 'Password@123';
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    if (!existingUser) {
      await prisma.user.create({
        data: {
          email: employee.email,
          fullName: `${employee.firstName} ${employee.lastName}`.trim(),
          role: 'EMPLOYEE',
          passwordHash,
          employeeId: employee.id,
          isActive: true,
        },
      });
    } else {
      const userUpdate = {};
      if (!existingUser.employeeId) {
        userUpdate.employeeId = employee.id;
      }
      if (typeof data.password === 'string' && data.password.trim().length >= 6) {
        userUpdate.passwordHash = passwordHash;
      }
      if (Object.keys(userUpdate).length > 0) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: userUpdate,
        });
      }
    }
  }

  // Auto-allocate annual leave balances for the newly created employee
  try {
    const currentYear = new Date().getFullYear();
    const validFrom = new Date(Date.UTC(currentYear, 0, 1));
    const validTo = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59));

    const activeTypes = await prisma.timeOffType.findMany({
      where: { isActive: true, requiresAllocation: true },
    });

    const customAllocations = data.initial_leaves || data.allocations || {};

    for (const type of activeTypes) {
      let days = 12; // default 12 days
      const codeUpper = (type.code || '').toUpperCase();
      const nameUpper = (type.name || '').toUpperCase();

      if (codeUpper === 'PL' || nameUpper.includes('PRIVILEGE') || nameUpper.includes('EARNED')) {
        days = customAllocations.privilege_leave ?? customAllocations.PL ?? 15;
      } else if (codeUpper === 'SL' || nameUpper.includes('SICK')) {
        days = customAllocations.sick_leave ?? customAllocations.SL ?? 12;
      } else if (codeUpper === 'CL' || nameUpper.includes('CASUAL')) {
        days = customAllocations.casual_leave ?? customAllocations.CL ?? 12;
      } else if (customAllocations[type.code] !== undefined) {
        days = Number(customAllocations[type.code]) || 12;
      } else if (customAllocations[type.id] !== undefined) {
        days = Number(customAllocations[type.id]) || 12;
      }

      if (days > 0) {
        await prisma.timeOffAllocation.create({
          data: {
            employeeId: employee.id,
            typeId: type.id,
            validFrom,
            validTo,
            allocatedDays: days,
            takenDays: 0,
            status: 'APPROVED',
          },
        });
      }
    }
  } catch {
    // Non-blocking fallback for leave allocation
  }

  await writeAudit(prisma, {
    actorId,
    action: 'EMPLOYEE_CREATED',
    entity: 'employee',
    entityId: employee.id,
    payload: {
      employee_code: employee.employeeCode,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.email,
      department: employee.department?.name || null,
      job: employee.job?.name || null,
    },
  });

  return formatEmployee(employee);
}

export async function updateEmployee(id, data, actorId) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found');
  }

  if (data.email && data.email !== employee.email) {
    const existingEmail = await prisma.employee.findUnique({ where: { email: data.email } });
    if (existingEmail) throw new AppError(409, 'DUPLICATE', 'Email already in use');
  }

  await assertReferencesExist({ ...data, self_id: id });

  const updateData = {};
  if (data.first_name !== undefined) updateData.firstName = data.first_name;
  if (data.last_name !== undefined) updateData.lastName = data.last_name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.date_of_birth !== undefined) {
    updateData.dateOfBirth = data.date_of_birth ? new Date(data.date_of_birth) : null;
  }
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.hire_date !== undefined) updateData.hireDate = new Date(data.hire_date);
  if (data.department_id !== undefined) updateData.departmentId = data.department_id;
  if (data.job_id !== undefined) updateData.jobId = data.job_id;
  if (data.manager_id !== undefined) updateData.managerId = data.manager_id;
  if (data.working_schedule_id !== undefined) updateData.workingScheduleId = data.working_schedule_id;
  if (data.bank_account_name !== undefined) updateData.bankAccountName = data.bank_account_name;
  if (data.bank_account_number !== undefined) updateData.bankAccountNumber = data.bank_account_number;
  if (data.bank_ifsc !== undefined) updateData.bankIfsc = data.bank_ifsc;

  const updated = await prisma.employee.update({
    where: { id },
    data: updateData,
    include: {
      department: { select: { id: true, name: true, code: true } },
      job: { select: { id: true, name: true } },
      manager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
    },
  });

  // Sync with linked User account if name or email changed
  if (data.first_name !== undefined || data.last_name !== undefined || data.email !== undefined) {
    const userUpdates = {};
    if (data.first_name !== undefined || data.last_name !== undefined) {
      userUpdates.fullName = `${updated.firstName} ${updated.lastName}`.trim();
    }
    if (data.email !== undefined) {
      userUpdates.email = data.email;
    }
    await prisma.user.updateMany({
      where: { employeeId: id },
      data: userUpdates,
    });
  }

  await writeAudit(prisma, {
    actorId,
    action: 'EMPLOYEE_UPDATED',
    entity: 'employee',
    entityId: id,
    payload: {
      employee_code: employee.employeeCode,
      name: `${updated.firstName} ${updated.lastName}`.trim(),
      email: updated.email,
      fields: Object.keys(updateData),
    },
  });

  return formatEmployee(updated);
}

export async function updateEmployeeStatus(id, { status, termination_date }, actorId) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found');
  }

  if (status === 'TERMINATED' && !termination_date) {
    throw new AppError(400, 'VALIDATION_ERROR', 'termination_date is required when status is TERMINATED');
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      status,
      terminationDate: status === 'TERMINATED' ? new Date(termination_date) : null,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      job: { select: { id: true, name: true } },
      manager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
    },
  });

  await writeAudit(prisma, {
    actorId,
    action: 'EMPLOYEE_STATUS_CHANGED',
    entity: 'employee',
    entityId: id,
    payload: {
      employee_code: employee.employeeCode,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      from: employee.status,
      to: status,
    },
  });

  return formatEmployee(updated);
}

export async function listDepartments() {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      managerEmployee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true },
      },
    },
  });

  return departments.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    parent_id: d.parentId,
    manager: d.managerEmployee
      ? {
          id: d.managerEmployee.id,
          employee_code: d.managerEmployee.employeeCode,
          name: `${d.managerEmployee.firstName} ${d.managerEmployee.lastName}`,
        }
      : null,
  }));
}

export async function listJobs() {
  const jobs = await prisma.job.findMany({
    orderBy: { name: 'asc' },
  });

  return jobs.map((j) => ({
    id: j.id,
    name: j.name,
  }));
}

export async function deleteEmployee(id, actorId) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      user: true,
      department: { select: { id: true, name: true } },
    },
  });

  if (!employee) {
    throw new AppError(404, 'NOT_FOUND', 'Employee not found');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Unlink managed departments
    await tx.department.updateMany({
      where: { managerEmployeeId: id },
      data: { managerEmployeeId: null },
    });

    // 2. Unlink direct reports
    await tx.employee.updateMany({
      where: { managerId: id },
      data: { managerId: null },
    });

    // 3. Delete payslips (and associated warnings and lines)
    const payslips = await tx.payslip.findMany({
      where: { employeeId: id },
      select: { id: true },
    });
    const payslipIds = payslips.map((p) => p.id);
    if (payslipIds.length > 0) {
      await tx.payrollWarning.deleteMany({
        where: { payslipId: { in: payslipIds } },
      });
      await tx.payslipLine.deleteMany({
        where: { payslipId: { in: payslipIds } },
      });
      await tx.payslip.deleteMany({
        where: { id: { in: payslipIds } },
      });
    }

    // 4. Delete payrun employee links
    await tx.payrunEmployee.deleteMany({
      where: { employeeId: id },
    });

    // 5. Delete contracts
    await tx.contract.deleteMany({
      where: { employeeId: id },
    });

    // 6. Delete attendance records
    await tx.attendance.deleteMany({
      where: { employeeId: id },
    });

    // 7. Delete time off requests
    await tx.timeOffRequest.deleteMany({
      where: { employeeId: id },
    });

    // 8. Delete time off allocations
    await tx.timeOffAllocation.deleteMany({
      where: { employeeId: id },
    });

    // 9. If there is a linked user account, clean up tokens & user
    if (employee.user) {
      await tx.refreshToken.deleteMany({
        where: { userId: employee.user.id },
      });
      if (employee.user.role === 'EMPLOYEE') {
        await tx.user.delete({
          where: { id: employee.user.id },
        });
      } else {
        await tx.user.update({
          where: { id: employee.user.id },
          data: { employeeId: null },
        });
      }
    }

    // 10. Delete the employee record
    await tx.employee.delete({
      where: { id },
    });

    // 11. Write audit log
    await writeAudit(tx, {
      actorId,
      action: 'EMPLOYEE_DELETED',
      entity: 'employee',
      entityId: id,
      payload: {
        employee_code: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        email: employee.email,
        department: employee.department?.name || null,
      },
    });

    return {
      id: employee.id,
      employee_code: employee.employeeCode,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
    };
  });
}

