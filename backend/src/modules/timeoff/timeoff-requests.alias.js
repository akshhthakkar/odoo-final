import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import * as timeoff from './timeoff.controller.js';
import { statusChangeSchema } from './timeoff.schemas.js';

// Contract-path alias: POST /api/v1/time-off-requests/:id/status-changes
// Delegates to the same canonical service implementation as /api/v1/time-off.
const router = Router();

router.use(requireAuth);

const HR_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];

router.post(
  '/:id/status-changes',
  requireRole(...HR_ROLES),
  validateBody(statusChangeSchema),
  timeoff.statusChange
);

router.delete('/:id', requireAuth, timeoff.cancelRequest);

export default router;
