import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validateBody } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import * as auth from './auth.controller.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.body?.email || 'anonymous'}:${req.ip}`,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts', details: [] },
  },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const router = Router();

router.post('/login', loginLimiter, validateBody(loginSchema), auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);

export default router;
