import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as schedules from './schedules.controller.js';

const SCHEDULE_TYPE_ENUM = z.enum(['FULL_TIME', 'PART_TIME', 'FLEXIBLE']);

const scheduleLineSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_minutes: z.number().int().min(0).max(1440),
  end_minutes: z.number().int().min(0).max(1440),
  break_minutes: z.number().int().min(0).max(1440).default(0),
});

const listSchedulesQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createScheduleSchema = z.object({
  name: z.string().min(1).max(120),
  schedule_type: SCHEDULE_TYPE_ENUM,
  lines: z.array(scheduleLineSchema).optional(),
});

const updateScheduleSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  schedule_type: SCHEDULE_TYPE_ENUM.optional(),
});

const replaceScheduleLinesSchema = z.object({
  lines: z.array(scheduleLineSchema),
});

const router = Router();

router.use(requireAuth);

router.get('/', validateQuery(listSchedulesQuerySchema), schedules.listSchedules);
router.get('/:id', schedules.getSchedule);

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

// Atomic full replacement of schedule lines - MUST remain PUT as per contract
router.put(
  '/:id/lines',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(replaceScheduleLinesSchema),
  schedules.replaceScheduleLines
);

export default router;
