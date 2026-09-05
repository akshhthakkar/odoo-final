import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import pgSimple from 'connect-pg-simple';
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
import payrollConfigRoutes from './modules/payroll-config/payroll-config.routes.js';
import payrollRunRoutes from './modules/payroll-run/payroll-run.routes.js';
import payslipsRoutes from './modules/payroll-run/payslips.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';

const app = express();
const PgSession = pgSimple(session);

app.use(requestId);
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
app.use('/api/v1/salary-structures', payrollConfigRoutes);
app.use('/api/v1/payruns', payrollRunRoutes);
app.use('/api/v1/payslips', payslipsRoutes);
app.use('/api/v1/dashboard', reportsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
