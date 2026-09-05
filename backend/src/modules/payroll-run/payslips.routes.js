import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as controller from './payslip.controller.js';
import * as previewService from './preview.service.js';
import { previewSchema } from './preview.schema.js';
import { payslipFilterSchema } from './payslip.schema.js';

const READ_ROLES = ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];

// Reject malformed uuid path params early (Prisma would otherwise throw P2023).
export const requireUuidParam = (name) => (req, res, next) => {
  const parsed = z.string().uuid().safeParse(req.params[name]);
  if (!parsed.success) {
    return next(new AppError(404, 'NOT_FOUND', 'Invalid id'));
  }
  return next();
};

const router = Router();

router.use(requireAuth);

router.post(
  '/previews',
  requireRole(...READ_ROLES),
  validateBody(previewSchema),
  async (req, res, next) => {
    try {
      const preview = await previewService.previewPayslip(req.body);
      res.json({ success: true, data: preview });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/', requireRole(...READ_ROLES), validateQuery(payslipFilterSchema), controller.list);
router.get('/:id', requireRole(...READ_ROLES), requireUuidParam('id'), controller.get);
router.get('/:id/pdf', requireRole(...READ_ROLES), requireUuidParam('id'), controller.pdf);

export default router;

