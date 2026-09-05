import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as payruns from './payruns.controller.js';

const listPayrunsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createPayrunSchema = z.object({
  name: z.string().min(1).max(140),
  structure_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employee_ids: z.array(z.string().uuid()).optional(),
});

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireRole('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'),
  validateQuery(listPayrunsQuerySchema),
  payruns.listPayruns
);

router.get(
  '/:id',
  requireRole('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'),
  payruns.getPayrun
);

router.post(
  '/',
  requireRole('ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'),
  validateBody(createPayrunSchema),
  payruns.createPayrun
);

router.post(
  '/:id/dispatches',
  requireRole('ADMIN', 'HR_PAYROLL_MANAGER'),
  payruns.dispatchPayslips
);

export default router;
