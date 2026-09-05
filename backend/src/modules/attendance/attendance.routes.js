import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as attendance from './attendance.controller.js';

const ATTENDANCE_STATUS_ENUM = z.enum(['PRESENT', 'LATE', 'MISSING_CHECKOUT', 'MANUAL_EDIT']);

const listAttendanceQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  status: ATTENDANCE_STATUS_ENUM.optional(),
  department_id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

const createAttendanceSchema = z.object({
  employee_id: z.string().uuid(),
  attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_in: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)),
  check_out: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)).nullable().optional(),
  status: ATTENDANCE_STATUS_ENUM.optional(),
  note: z.string().max(500).optional(),
});

const updateAttendanceSchema = z.object({
  attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  check_in: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)).optional(),
  check_out: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)).nullable().optional(),
  status: ATTENDANCE_STATUS_ENUM.optional(),
  note: z.string().max(500).nullable().optional(),
});

const router = Router();

router.use(requireAuth);

router.get('/summary', attendance.getSummary);
router.get('/', validateQuery(listAttendanceQuerySchema), attendance.listAttendance);
router.get('/:id', attendance.getAttendance);

router.post(
  '/',
  requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER'),
  validateBody(createAttendanceSchema),
  attendance.createAttendance
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER'),
  validateBody(updateAttendanceSchema),
  attendance.updateAttendance
);

router.delete(
  '/:id',
  requireRole('ADMIN', 'HR_MANAGER'),
  attendance.deleteAttendance
);

export default router;
