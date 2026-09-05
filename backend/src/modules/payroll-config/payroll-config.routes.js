import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import * as controller from './payroll-config.controller.js';
import {
  createStructureSchema,
  patchStructureSchema,
  replaceRulesSchema,
} from './schemas.js';

const READ_ROLES = ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
const WRITE_ROLES = ['HR_PAYROLL_MANAGER', 'ADMIN'];

const router = Router();

router.use(requireAuth);

router.get('/', requireRole(...READ_ROLES), controller.list);
router.post('/', requireRole(...WRITE_ROLES), validateBody(createStructureSchema), controller.create);
router.get('/:id', requireRole(...READ_ROLES), controller.get);
router.patch('/:id', requireRole(...WRITE_ROLES), validateBody(patchStructureSchema), controller.patch);
router.delete('/:id', requireRole(...WRITE_ROLES), controller.remove);
router.put('/:id/rules', requireRole(...WRITE_ROLES), validateBody(replaceRulesSchema), controller.replaceRules);

export default router;
