import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as timeoff from './timeoff.controller.js';

const TIMEOFF_UNIT_ENUM = z.enum(['DAYS', 'HOURS']);
const ALLOCATION_STATUS_ENUM = z.enum(['DRAFT', 'APPROVED', 'REFUSED']);
const TIMEOFF_STATUS_ENUM = z.enum(['TO_APPROVE', 'APPROVED', 'REFUSED']);

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

const createAllocationSchema = z.object({
  employee_id: z.string().uuid(),
  type_id: z.string().uuid(),
  valid_from: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  valid_to: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  allocated_days: z.coerce.number().positive(),
  status: ALLOCATION_STATUS_ENUM.default('APPROVED'),
});

const listRequestsQuerySchema = z.object({
  employee_id: z.string().uuid().optional(),
  type_id: z.string().uuid().optional(),
  status: TIMEOFF_STATUS_ENUM.optional(),
  date_from: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  date_to: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

const createRequestSchema = z.object({
  employee_id: z.string().uuid().optional(),
  type_id: z.string().uuid(),
  date_from: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  date_to: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  days: z.coerce.number().positive(),
  reason: z.string().max(500).optional(),
});

const refuseRequestSchema = z.object({
  refusal_reason: z.string().min(1).max(500),
});

const router = Router();

router.use(requireAuth);

// Types
router.get('/types', timeoff.listTypes);
router.post(
  '/types',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(createTypeSchema),
  timeoff.createType
);

// Allocations
router.get('/allocations', validateQuery(listAllocationsQuerySchema), timeoff.listAllocations);
router.post(
  '/allocations',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(createAllocationSchema),
  timeoff.createAllocation
);

// Requests
router.get('/requests', validateQuery(listRequestsQuerySchema), timeoff.listRequests);
router.post('/requests', validateBody(createRequestSchema), timeoff.createRequest);

router.patch(
  '/requests/:id/approve',
  requireRole('ADMIN', 'HR_MANAGER'),
  timeoff.approveRequest
);
router.post(
  '/requests/:id/approve',
  requireRole('ADMIN', 'HR_MANAGER'),
  timeoff.approveRequest
);

router.patch(
  '/requests/:id/refuse',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(refuseRequestSchema),
  timeoff.refuseRequest
);
router.post(
  '/requests/:id/refuse',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(refuseRequestSchema),
  timeoff.refuseRequest
);

export default router;

