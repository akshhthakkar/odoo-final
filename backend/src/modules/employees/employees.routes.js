import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as employees from './employees.controller.js';

const EMPLOYEE_STATUS_ENUM = z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']);

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
  phone: z.string().max(20).nullable().optional(),
  date_of_birth: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
  gender: z.string().max(10).nullable().optional(),
  address: z.string().nullable().optional(),
  hire_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  department_id: z.string().uuid().nullable().optional(),
  job_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  working_schedule_id: z.string().uuid().nullable().optional(),
  bank_account_name: z.string().max(120).nullable().optional(),
  bank_account_number: z.string().max(34).nullable().optional(),
  bank_ifsc: z.string().max(20).nullable().optional(),
});

const updateEmployeeSchema = z.object({
  first_name: z.string().min(1).max(80).optional(),
  last_name: z.string().min(1).max(80).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).nullable().optional(),
  date_of_birth: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
  gender: z.string().max(10).nullable().optional(),
  address: z.string().nullable().optional(),
  hire_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  department_id: z.string().uuid().nullable().optional(),
  job_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  working_schedule_id: z.string().uuid().nullable().optional(),
  bank_account_name: z.string().max(120).nullable().optional(),
  bank_account_number: z.string().max(34).nullable().optional(),
  bank_ifsc: z.string().max(20).nullable().optional(),
});

const updateStatusSchema = z.object({
  status: EMPLOYEE_STATUS_ENUM,
  termination_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

const router = Router();

router.use(requireAuth);

router.get('/departments', employees.listDepartments);
router.get('/jobs', employees.listJobs);

router.get('/', validateQuery(listEmployeesQuerySchema), employees.listEmployees);
router.get('/:id', employees.getEmployee);

router.post(
  '/',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(createEmployeeSchema),
  employees.createEmployee
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(updateEmployeeSchema),
  employees.updateEmployee
);

router.patch(
  '/:id/status',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(updateStatusSchema),
  employees.updateEmployeeStatus
);

export default router;
