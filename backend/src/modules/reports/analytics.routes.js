import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateQuery } from '../../middleware/validate.js';
import {
  summaryKpisSchema,
  payrollByDepartmentSchema,
  payrollByJobSchema,
  payrollMonthlyTrendSchema,
  statutoryComplianceSchema,
  employeePayslipSummarySchema,
  leaveUtilizationSchema,
  attendanceExceptionsSchema,
} from './analytics.schema.js';
import * as controller from './analytics.controller.js';

const REPORT_ROLES = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN', 'EMPLOYEE'];

const router = Router();

router.use(requireAuth);
router.use(requireRole(...REPORT_ROLES));

router.get(
  '/summary-kpis',
  validateQuery(summaryKpisSchema),
  controller.summaryKpis
);

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
  '/payroll-monthly-trend',
  validateQuery(payrollMonthlyTrendSchema),
  controller.payrollMonthlyTrend
);

router.get(
  '/statutory-compliance',
  validateQuery(statutoryComplianceSchema),
  controller.statutoryCompliance
);

router.get(
  '/employee-payslip-summary',
  validateQuery(employeePayslipSummarySchema),
  controller.employeePayslipSummary
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
