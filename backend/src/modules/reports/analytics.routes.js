import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateQuery } from '../../middleware/validate.js';
import {
  payrollByDepartmentSchema,
  payrollByJobSchema,
  leaveUtilizationSchema,
  attendanceExceptionsSchema,
} from './analytics.schema.js';
import * as controller from './analytics.controller.js';

const REPORT_ROLES = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];

const router = Router();

router.use(requireAuth);
router.use(requireRole(...REPORT_ROLES));

router.get(
  '/payroll-by-department',
  validateQuery(payrollByDepartmentSchema),
  controller.payrollByDepartment
);

router.get(
  '/payroll-by-job',
  validateQuery(payrollByJobSchema),
  controller.payrollByJob
);

router.get(
  '/leave-utilization',
  validateQuery(leaveUtilizationSchema),
  controller.leaveUtilization
);

router.get(
  '/attendance-exceptions',
  validateQuery(attendanceExceptionsSchema),
  controller.attendanceExceptions
);

export default router;
