import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z
    .string()
    .default('postgresql://pay365:pay365@localhost:5433/pay365'),
  SESSION_SECRET: z.string().min(32).default('dev-only-session-secret-change-me-in-prod'),
  SESSION_MAX_AGE_DAYS: z.coerce.number().default(7),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
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
