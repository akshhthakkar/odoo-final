import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateQuery } from '../../middleware/validate.js';
import * as auditController from './audit.controller.js';

const listAuditLogsQuerySchema = z.object({
  action: z.string().optional(),
  entity: z.string().optional(),
  actor_id: z.string().uuid().optional(),
  search: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const router = Router();

router.use(requireAuth);

// Full audit logs accessible to system Administrators and HR Managers
router.get(
  '/',
  requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'),
  validateQuery(listAuditLogsQuerySchema),
  auditController.listAuditLogs
);

export default router;
