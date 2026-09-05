import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireUuidParam } from './payslips.routes.js';
import * as controller from './payslip.controller.js';

// Self-service payslip endpoints under /api/v1/me (scoped to the session's employee).
const router = Router();

router.use(requireAuth);

router.get('/payslips', controller.listMine);
router.get('/payslips/:id', requireUuidParam('id'), controller.getMine);
router.get('/payslips/:id/pdf', requireUuidParam('id'), controller.myPdf);

export default router;

