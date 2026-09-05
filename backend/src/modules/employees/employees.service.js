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
  bank_account_number: emp.bankAccountNumber,
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

  if (department_id) where.departmentId = department_id;
  if (job_id) where.jobId = job_id;
  if (status) where.status = status;
  if (manager_id) where.managerId = manager_id;

  if (search) {
    where.OR = [
      { employeeCode: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, items] = await Promise.all([
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
  ]);

  return {
    items: items.map(formatEmployee),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
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

  await writeAudit(prisma, {
    actorId,
    action: 'EMPLOYEE_CREATED',
    entity: 'employee',
    entityId: employee.id,
    payload: { employee_code: employee.employeeCode, email: employee.email },
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

  await writeAudit(prisma, {
    actorId,
    action: 'EMPLOYEE_UPDATED',
    entity: 'employee',
    entityId: id,
    payload: { employee_code: employee.employeeCode, fields: Object.keys(updateData) },
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
    payload: { employee_code: employee.employeeCode, from: employee.status, to: status },
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
