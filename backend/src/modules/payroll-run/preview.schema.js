import { z } from 'zod';

export const previewSchema = z.object({
  employee_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  structure_id: z.string().uuid().optional(),
});
