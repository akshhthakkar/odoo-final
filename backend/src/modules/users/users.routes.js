import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import * as users from './users.controller.js';

const ROLE_ENUM = z.enum([
  'EMPLOYEE',
  'HR_MANAGER',
  'HR_PAYROLL_USER',
  'HR_PAYROLL_MANAGER',
  'ADMIN',
]);

const listUsersQuerySchema = z.object({
  role: ROLE_ENUM.optional(),
  is_active: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  role: ROLE_ENUM,
  employee_id: z.string().uuid().nullable().optional(),
});

const updateUserSchema = z.object({
  full_name: z.string().min(1).optional(),
  role: ROLE_ENUM.optional(),
  is_active: z.boolean().optional(),
  employee_id: z.string().uuid().nullable().optional(),
});

const resetPasswordSchema = z.object({
  new_password: z.string().min(8),
});

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validateQuery(listUsersQuerySchema), users.listUsers);
router.post('/', validateBody(createUserSchema), users.createUser);
router.patch('/:id', validateBody(updateUserSchema), users.updateUser);
router.post('/:id/reset-password', validateBody(resetPasswordSchema), users.resetPassword);

export default router;
