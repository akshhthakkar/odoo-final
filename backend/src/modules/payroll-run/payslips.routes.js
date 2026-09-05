import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { previewSchema } from './preview.schema.js';
import { previewPayslip } from './preview.service.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/previews',
  requireRole('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
  validateBody(previewSchema),
  async (req, res, next) => {
    try {
      const preview = await previewPayslip(req.body);
      res.json({ success: true, data: preview });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
