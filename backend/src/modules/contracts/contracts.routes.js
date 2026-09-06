import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as contracts from './contracts.controller.js';

const CONTRACT_TYPE_ENUM = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']);
const CONTRACT_STATUS_ENUM = z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED']);

const listContractsQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  status: CONTRACT_STATUS_ENUM.optional(),
  department_id: z.string().uuid().optional(),
  contract_type: CONTRACT_TYPE_ENUM.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createContractSchema = z
  .object({
    employee_id: z.string().uuid(),
    reference: z.string().min(1).max(40),
    start_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    end_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
    wage: z.coerce.number().positive(),
    currency: z.string().length(3).default('INR'),
    contract_type: CONTRACT_TYPE_ENUM,
    department_id: z.string().uuid().nullable().optional(),
    job_id: z.string().uuid().nullable().optional(),
    working_schedule_id: z.string().uuid().nullable().optional(),
    salary_structure_id: z.string().uuid().nullable().optional(),
    status: CONTRACT_STATUS_ENUM.default('DRAFT'),
  })
  .refine(
    (d) => !d.end_date || new Date(d.end_date) >= new Date(d.start_date),
    { message: 'end_date must be on or after start_date', path: ['end_date'] }
  );

const updateContractSchema = z
  .object({
    reference: z.string().min(1).max(40).optional(),
    start_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    end_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
    wage: z.coerce.number().positive().optional(),
    currency: z.string().length(3).optional(),
    contract_type: CONTRACT_TYPE_ENUM.optional(),
    department_id: z.string().uuid().nullable().optional(),
    job_id: z.string().uuid().nullable().optional(),
    working_schedule_id: z.string().uuid().nullable().optional(),
    salary_structure_id: z.string().uuid().nullable().optional(),
    status: CONTRACT_STATUS_ENUM.optional(),
  })
  .refine(
    (d) => !d.end_date || !d.start_date || new Date(d.end_date) >= new Date(d.start_date),
    { message: 'end_date must be on or after start_date', path: ['end_date'] }
  );

const updateContractStatusSchema = z.object({
  status: CONTRACT_STATUS_ENUM,
});

const router = Router();

router.use(requireAuth);

const HR_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];

router.get(
  '/',
  requireRole(...HR_ROLES),
  validateQuery(listContractsQuerySchema),
  contracts.listContracts
);
router.get(
  '/:id',
  requireRole(...HR_ROLES),
  contracts.getContract
);

router.post(
  '/',
  requireRole(...HR_ROLES),
  validateBody(createContractSchema),
  contracts.createContract
);

router.patch(
  '/:id',
  requireRole(...HR_ROLES),
  validateBody(updateContractSchema),
  contracts.updateContract
);

router.patch(
  '/:id/status',
  requireRole(...HR_ROLES),
  validateBody(updateContractStatusSchema),
  contracts.updateContractStatus
);

export default router;
