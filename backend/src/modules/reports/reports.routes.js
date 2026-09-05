import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateQuery } from '../../middleware/validate.js';
import { dashboardQuerySchema } from './reports.schema.js';
import * as controller from './reports.controller.js';

const REPORT_ROLES = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];

const router = Router();

router.use(requireAuth);

router.get(
  '/metrics',
  requireRole(...REPORT_ROLES),
  validateQuery(dashboardQuerySchema),
  controller.metrics
);

export default router;
