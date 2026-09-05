import 'dotenv/config';
import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z
      .string()
      .default('postgresql://pay365:pay365@localhost:5433/pay365'),
    SESSION_SECRET: z.string().min(32).default('dev-only-session-secret-change-me-in-prod'),
    SESSION_MAX_AGE_DAYS: z.coerce.number().default(7),
    WEB_ORIGIN: z.string().url().default('http://localhost:5173'),

    // Email / SMTP Settings (TASK-018)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z
      .preprocess((val) => {
        if (typeof val === 'string') return val === 'true' || val === '1';
        return val;
      }, z.boolean())
      .default(false),
    SMTP_FROM: z.string().default('Pay365 <payslips@pay365.dev>'),
  })
  .superRefine((config, ctx) => {
    // SEC-07: refuse to boot production with a publicly-known default secret.
    if (config.NODE_ENV === 'production' && config.SESSION_SECRET.startsWith('dev-only')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SESSION_SECRET'],
        message: 'SESSION_SECRET must be set to a strong random value in production',
      });
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;
