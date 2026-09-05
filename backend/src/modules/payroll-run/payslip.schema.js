import { z } from 'zod';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// GET /payslips filters - all optional, plus simple pagination.
export const payslipFilterSchema = z.object({
  payrun_id: z.string().uuid().optional(),
  employee_id: z.string().uuid().optional(),
  period_start: z.string().regex(DATE, 'Must be YYYY-MM-DD').optional(),
  period_end: z.string().regex(DATE, 'Must be YYYY-MM-DD').optional(),
  status: z.enum(['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
