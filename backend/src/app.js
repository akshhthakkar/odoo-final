import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import pgSimple from 'connect-pg-simple';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import requestId from './middleware/request-id.js';
import { notFound, errorHandler } from './middleware/errors.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import employeesRoutes from './modules/employees/employees.routes.js';
import contractsRoutes from './modules/contracts/contracts.routes.js';
import schedulesRoutes from './modules/schedules/schedules.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import timeoffRoutes from './modules/timeoff/timeoff.routes.js';
import timeoffAliasRoutes from './modules/timeoff/timeoff-requests.alias.js';
import payrollConfigRoutes from './modules/payroll-config/payroll-config.routes.js';
import payrollRunRoutes from './modules/payroll-run/payroll-run.routes.js';
import payslipsRoutes from './modules/payroll-run/payslips.routes.js';
import meRoutes from './modules/payroll-run/me.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import analyticsRoutes from './modules/reports/analytics.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';

import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './docs/swagger.js';
import { requireAuth } from './middleware/auth.js';
import { requireRole } from './middleware/rbac.js';

const app = express();
const PgSession = pgSimple(session);

// SEC-05: global abuse-resistance layer (contract §5: 300 req/min/IP) on top
// of the stricter login limiter.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests', details: [] },
  },
});

app.use(requestId);
app.use(globalLimiter);
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json());

app.use(
  session({
    store: new PgSession({
      conString: env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    name: 'sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: env.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    },
  })
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'pay365-api', uptime: process.uptime() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/employees', employeesRoutes);
app.use('/api/v1/contracts', contractsRoutes);
app.use('/api/v1/schedules', schedulesRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/time-off', timeoffRoutes);
app.use('/api/v1/time-off-requests', timeoffAliasRoutes);
app.use('/api/v1/salary-structures', payrollConfigRoutes);
app.use('/api/v1/payruns', payrollRunRoutes);
app.use('/api/v1/payslips', payslipsRoutes);
app.use('/api/v1/me', meRoutes);
app.use('/api/v1/dashboard', reportsRoutes);
app.use('/api/v1/reports', analyticsRoutes);
app.use('/api/v1/audit-logs', auditRoutes);


// Swagger API Documentation - open in development, ADMIN-only in production (A-12).
const swaggerHandler = env.NODE_ENV === 'production'
  ? [requireAuth, requireRole('ADMIN'), swaggerUi.serve, swaggerUi.setup(swaggerDocument)]
  : [swaggerUi.serve, swaggerUi.setup(swaggerDocument)];

app.use('/api-docs', ...swaggerHandler);
app.use('/api/docs', ...swaggerHandler);
app.get('/api/docs.json', (req, res) => res.json(swaggerDocument));
app.get('/api-docs.json', (req, res) => res.json(swaggerDocument));

app.use(notFound);
app.use(errorHandler);

export default app;
