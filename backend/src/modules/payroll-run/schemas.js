import { z } from 'zod';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Wizard finalize: create a DRAFT payrun with its employee selections.
export const createPayrunSchema = z.object({
  name: z.string().min(1).max(140),
  structure_id: z.string().uuid(),
  period_start: z.string().regex(DATE, 'Must be YYYY-MM-DD'),
  period_end: z.string().regex(DATE, 'Must be YYYY-MM-DD'),
  employee_ids: z.array(z.string().uuid()).min(1),
});

// POST /payruns/:id/status-changes body.
export const statusChangeSchema = z.object({
  action: z.enum(['COMPUTE', 'VALIDATE', 'MARK_PAID', 'CANCEL']),
});

// GET /payruns/eligibility-checks?structure_id=&period_start=&period_end= query.
export const eligibilitySchema = z.object({
  structure_id: z.string().uuid(),
  period_start: z.string().regex(DATE, 'Must be YYYY-MM-DD'),
  period_end: z.string().regex(DATE, 'Must be YYYY-MM-DD'),
});
