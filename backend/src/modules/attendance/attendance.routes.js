import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as attendance from './attendance.controller.js';

const ATTENDANCE_STATUS_ENUM = z.enum(['PRESENT', 'LATE', 'MISSING_CHECKOUT', 'MANUAL_EDIT']);
const ATTENDANCE_SOURCE_ENUM = z.enum(['SELF', 'HR']);

const listAttendanceQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  start_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  end_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  status: ATTENDANCE_STATUS_ENUM.optional(),
  source: ATTENDANCE_SOURCE_ENUM.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const checkInSchema = z.object({
  employee_id: z.string().uuid().optional(),
  check_in: z.string().datetime({ offset: true }).optional(),
  source: ATTENDANCE_SOURCE_ENUM.optional(),
});

const checkOutSchema = z.object({
  employee_id: z.string().uuid().optional(),
  check_out: z.string().datetime({ offset: true }).optional(),
});

const createManualAttendanceSchema = z.object({
  employee_id: z.string().uuid(),
  attendance_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  check_in: z.string().datetime({ offset: true }),
  check_out: z.string().datetime({ offset: true }).nullable().optional(),
  status: ATTENDANCE_STATUS_ENUM.default('MANUAL_EDIT'),
  note: z.string().max(255).nullable().optional(),
});

const updateAttendanceSchema = z.object({
  check_in: z.string().datetime({ offset: true }).optional(),
  check_out: z.string().datetime({ offset: true }).nullable().optional(),
  note: z.string().max(255).nullable().optional(),
});

const router = Router();

router.use(requireAuth);

// Self-service check-in / check-out. EMPLOYEE is allowed; the controller
// object-level-authorizes employees to their own attendance only.
router.post(
  '/check-in',
  requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'),
  attendance.checkIn
);

router.post(
  '/check-out',
  requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'),
  attendance.checkOut
);

router.get('/', validateQuery(listAttendanceQuerySchema), attendance.listAttendance);
router.get('/:id', attendance.getAttendance);

router.post(
  '/',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(createManualAttendanceSchema),
  attendance.createManualAttendance
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(updateAttendanceSchema),
  attendance.updateAttendance
);

export default router;
