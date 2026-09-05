import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as timeoff from './timeoff.controller.js';
import {
  createTypeSchema,
  listAllocationsQuerySchema,
  createAllocationSchema,
  listRequestsQuerySchema,
  createRequestSchema,
  refuseRequestSchema,
  statusChangeSchema,
} from './timeoff.schemas.js';

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

// Contract route: POST /requests/:id/status-changes { action: APPROVE | REFUSE }
router.post(
  '/requests/:id/status-changes',
  requireRole('ADMIN', 'HR_MANAGER'),
  validateBody(statusChangeSchema),
  timeoff.statusChange
);

// Cancellation (contract DELETE route, soft-cancel while TO_APPROVE)
router.delete('/requests/:id', timeoff.cancelRequest);

// Legacy routes kept for the current frontend; both call the same canonical
// service functions (no duplicated business logic).
router.patch(
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

export default router;
