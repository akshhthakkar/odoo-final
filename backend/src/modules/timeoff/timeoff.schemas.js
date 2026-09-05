import { z } from 'zod';

const TIMEOFF_UNIT_ENUM = z.enum(['DAYS', 'HOURS']);
const ALLOCATION_STATUS_ENUM = z.enum(['DRAFT', 'APPROVED', 'REFUSED']);
const TIMEOFF_STATUS_ENUM = z.enum(['TO_APPROVE', 'APPROVED', 'REFUSED']);

const DATE = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

const createTypeSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(20),
  unit: TIMEOFF_UNIT_ENUM,
  requires_allocation: z.boolean().default(true),
  allows_request: z.boolean().default(true),
  color: z.string().max(9).optional(),
});

const listAllocationsQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  type_id: z.string().uuid().optional(),
  status: ALLOCATION_STATUS_ENUM.optional(),
});

// A-05: reject inverted validity ranges at the API boundary (400) before the
// DB CHECK constraint has to reject them (which previously surfaced as 500).
const createAllocationSchema = z
  .object({
    employee_id: z.string().uuid(),
    type_id: z.string().uuid(),
    valid_from: DATE,
    valid_to: DATE,
    allocated_days: z.coerce.number().positive(),
    status: ALLOCATION_STATUS_ENUM.default('APPROVED'),
  })
  .refine((d) => new Date(d.valid_to) >= new Date(d.valid_from), {
    message: 'valid_to must be on or after valid_from',
    path: ['valid_to'],
  });

const listRequestsQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  type_id: z.string().uuid().optional(),
  status: TIMEOFF_STATUS_ENUM.optional(),
  date_from: DATE.optional(),
  date_to: DATE.optional(),
});

// A-02: `days` is intentionally NOT part of the schema - the server computes
// the authoritative amount from the date range, so any client-supplied value
// is stripped here.
const createRequestSchema = z
  .object({
    employee_id: z.string().uuid().optional(),
    type_id: z.string().uuid(),
    date_from: DATE,
    date_to: DATE,
    reason: z.string().max(500).optional(),
  })
  .refine((d) => new Date(d.date_to) >= new Date(d.date_from), {
    message: 'date_to must be on or after date_from',
    path: ['date_to'],
  });

const refuseRequestSchema = z.object({
  refusal_reason: z.string().min(1).max(500),
});

// Contract route: POST /time-off/requests/:id/status-changes
const statusChangeSchema = z.object({
  action: z.enum(['APPROVE', 'REFUSE']),
});

export {
  TIMEOFF_UNIT_ENUM,
  ALLOCATION_STATUS_ENUM,
  TIMEOFF_STATUS_ENUM,
  createTypeSchema,
  listAllocationsQuerySchema,
  createAllocationSchema,
  listRequestsQuerySchema,
  createRequestSchema,
  refuseRequestSchema,
  statusChangeSchema,
};
