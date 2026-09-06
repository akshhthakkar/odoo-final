import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole, requireSelfOrRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as employees from './employees.controller.js';

const EMPLOYEE_STATUS_ENUM = z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']);

const dateStringSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

const dateOfBirthSchema = dateStringSchema
  .refine((val) => {
    const d = new Date(val);
    const now = new Date();
    return !isNaN(d.getTime()) && d < now;
  }, { message: 'Date of birth cannot be in the future' })
  .refine((val) => {
    const d = new Date(val);
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 120);
    return d > minDate;
  }, { message: 'Date of birth must represent a plausible past date' });

const hireDateSchema = dateStringSchema.refine((val) => {
  const d = new Date(val);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return !isNaN(d.getTime()) && d <= tomorrow;
}, { message: 'Hire date cannot be in the future' });

const ifscSchema = z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, {
  message: 'Invalid IFSC code format (e.g., HDFC0001245)',
});

const bankAccountSchema = z.string().regex(/^[A-Za-z0-9]{8,34}$/, {
  message: 'Bank account number must be 8 to 34 alphanumeric characters',
});

const listEmployeesQuerySchema = z.object({
  department_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
  status: EMPLOYEE_STATUS_ENUM.optional(),
  manager_id: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createEmployeeSchema = z.object({
  employee_code: z.string().min(1).max(20),
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  email: z.string().email().max(255),
  password: z.string().min(6).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  date_of_birth: dateOfBirthSchema.nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  address: z.string().nullable().optional(),
  hire_date: hireDateSchema,
  department_id: z.string().uuid().nullable().optional(),
  job_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  working_schedule_id: z.string().uuid().nullable().optional(),
  bank_account_name: z.string().max(120).nullable().optional(),
  bank_account_number: bankAccountSchema.nullable().optional(),
  bank_ifsc: ifscSchema.nullable().optional(),
  initial_leaves: z.record(z.any()).optional(),
  allocations: z.record(z.any()).optional(),
});

const updateEmployeeSchema = z.object({
  first_name: z.string().min(1).max(80).optional(),
  last_name: z.string().min(1).max(80).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).nullable().optional(),
  date_of_birth: dateOfBirthSchema.nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  address: z.string().nullable().optional(),
  hire_date: hireDateSchema.optional(),
  department_id: z.string().uuid().nullable().optional(),
  job_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  working_schedule_id: z.string().uuid().nullable().optional(),
  bank_account_name: z.string().max(120).nullable().optional(),
  bank_account_number: bankAccountSchema.nullable().optional(),
  bank_ifsc: ifscSchema.nullable().optional(),
});

const updateStatusSchema = z.object({
  status: EMPLOYEE_STATUS_ENUM,
  termination_date: dateStringSchema.optional(),
});

const router = Router();

router.use(requireAuth);

router.get('/departments', employees.listDepartments);
router.get('/jobs', employees.listJobs);

router.get(
  '/',
  requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'),
  validateQuery(listEmployeesQuerySchema),
  employees.listEmployees
);

// getEmployee handles both HR roles and self-service scoping for EMPLOYEE role
router.get(
  '/:id',
  employees.getEmployee
);

const HR_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];

router.post(
  '/',
  requireRole(...HR_ROLES),
  validateBody(createEmployeeSchema),
  employees.createEmployee
);

// updateEmployee handles both HR roles and self-service personal details updates for EMPLOYEE role
router.patch(
  '/:id',
  validateBody(updateEmployeeSchema),
  employees.updateEmployee
);

router.patch(
  '/:id/status',
  requireRole(...HR_ROLES),
  validateBody(updateStatusSchema),
  employees.updateEmployeeStatus
);

export default router;
