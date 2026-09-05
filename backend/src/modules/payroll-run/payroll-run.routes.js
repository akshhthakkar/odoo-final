import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as controller from './payroll-run.controller.js';
import {
  createPayrunSchema,
  statusChangeSchema,
  eligibilitySchema,
} from './schemas.js';

// COMPUTE is a payroll-user action; VALIDATE/MARK_PAID/CANCEL need the manager.
const COMPUTE_ROLES = ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
const MANAGE_ROLES = ['HR_PAYROLL_MANAGER', 'ADMIN'];

const router = Router();

router.use(requireAuth);

router.get(
  '/eligibility-checks',
  requireRole(...COMPUTE_ROLES),
  validateQuery(eligibilitySchema),
  controller.eligibility
);
router.post('/', requireRole(...COMPUTE_ROLES), validateBody(createPayrunSchema), controller.create);
router.get('/', requireRole(...COMPUTE_ROLES), controller.list);
router.get('/:id', requireRole(...COMPUTE_ROLES), controller.get);
router.post(
  '/:id/status-changes',
  // Role depends on the action in the body, so pick the middleware dynamically.
  (req, res, next) => {
    const roles = req.body?.action === 'COMPUTE' ? COMPUTE_ROLES : MANAGE_ROLES;
    requireRole(...roles)(req, res, next);
  },
  validateBody(statusChangeSchema),
  controller.statusChange
);

export default router;
