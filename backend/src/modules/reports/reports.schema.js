import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const dashboardQuerySchema = z.object({
  period_start: z.string().regex(DATE_REGEX, 'Must be YYYY-MM-DD').optional(),
  period_end: z.string().regex(DATE_REGEX, 'Must be YYYY-MM-DD').optional(),
  department_id: z.string().uuid('Invalid department UUID').optional(),
  employee_type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
});
