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

const createScheduleSchema = z.object({
  name: z.string().min(1).max(120),
  schedule_type: SCHEDULE_TYPE_ENUM.default('FULL_TIME'),
  lines: z.array(scheduleLineSchema).optional(),
});

const updateScheduleSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  schedule_type: SCHEDULE_TYPE_ENUM.optional(),
  lines: z.array(scheduleLineSchema).optional(),
});

const assignEmployeesSchema = z.object({
  employee_ids: z.array(z.string().uuid()),
});

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'),
  validateQuery(listSchedulesQuerySchema),
  schedules.listSchedules
);

router.get(
  '/:id',
  requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'),
  schedules.getSchedule
);

router.post(
  '/',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(createScheduleSchema),
  schedules.createSchedule
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(updateScheduleSchema),
  schedules.updateSchedule
);

router.post(
  '/:id/assign-employees',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(assignEmployeesSchema),
  schedules.assignEmployees
);

router.delete(
  '/:id',
  requireRole('ADMIN', 'HR_MANAGER'),
  schedules.deleteSchedule
);

export default router;
