import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as schedules from './schedules.controller.js';

const SCHEDULE_TYPE_ENUM = z.enum(['FULL_TIME', 'PART_TIME', 'FLEXIBLE']);

const listSchedulesQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const scheduleLineSchema = z.object({
  day_of_week: z.number().int().min(0).max(6), // 0: Sun, 1: Mon, ..., 6: Sat
  start_minutes: z.number().int().min(0).max(1440),
  end_minutes: z.number().int().min(0).max(1440),
  break_minutes: z.number().int().min(0).max(1440).default(0),
});

// A schedule line must span a positive duration (guide TEST 6: end before
// start is rejected, not clamped).
const withValidLines = (schema) =>
  schema.refine(
    (lines) => lines.every((l) => l.end_minutes > l.start_minutes),
    { message: 'end_minutes must be greater than start_minutes' }
  );

const createScheduleSchema = z.object({
  name: z.string().min(1).max(120),
  schedule_type: SCHEDULE_TYPE_ENUM.default('FULL_TIME'),
  lines: withValidLines(z.array(scheduleLineSchema)).optional(),
});

const updateScheduleSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  schedule_type: SCHEDULE_TYPE_ENUM.optional(),
  lines: withValidLines(z.array(scheduleLineSchema)).optional(),
});

const assignEmployeesSchema = z.object({
  employee_ids: z.array(z.string().uuid()),
});

const router = Router();

router.use(requireAuth);

const HR_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];

router.get(
  '/',
  requireRole(...HR_ROLES),
  validateQuery(listSchedulesQuerySchema),
  schedules.listSchedules
);

router.get(
  '/:id',
  requireRole(...HR_ROLES),
  schedules.getSchedule
);

router.post(
  '/',
  requireRole(...HR_ROLES),
  validateBody(createScheduleSchema),
  schedules.createSchedule
);

router.patch(
  '/:id',
  requireRole(...HR_ROLES),
  validateBody(updateScheduleSchema),
  schedules.updateSchedule
);

router.post(
  '/:id/assign-employees',
  requireRole(...HR_ROLES),
  validateBody(assignEmployeesSchema),
  schedules.assignEmployees
);

router.delete(
  '/:id',
  requireRole(...HR_ROLES),
  schedules.deleteSchedule
);

export default router;
