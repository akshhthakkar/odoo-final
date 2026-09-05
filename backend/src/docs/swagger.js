export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Pay365 API Documentation',
    version: '1.0.0',
    description: `### Pay365 — Modern Odoo-Inspired Payroll & HRMS API
Comprehensive API documentation for Pay365 HRMS and Payroll engine.

#### Authentication
Pay365 uses stateful session cookies (\`sid\`).
- Authenticate via \`POST /api/v1/auth/login\`
- All authenticated requests automatically forward session credentials.
- In Swagger UI, use the **Login** endpoint first to establish your cookie session.`,
    contact: {
      name: 'Pay365 Engineering Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local Development Server',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication & Session Management' },
    { name: 'Employees', description: 'Employee Directory, Profiles, Departments & Jobs' },
    { name: 'Attendance', description: 'Clock In/Out, Logs, Summaries & Validations' },
    { name: 'Contracts', description: 'Employment Contracts & Wage Structures' },
    { name: 'Schedules', description: 'Working Schedules & Shifts' },
    { name: 'Salary Structures', description: 'Salary Rules, Computation Formulas & CTC Configurations' },
    { name: 'Payruns', description: 'Payroll Batches, Computation Engine, Validations & Payslips' },
    { name: 'Payslips', description: 'Individual Payslips & Line Items' },
    { name: 'Time Off', description: 'Leave Requests, Allocations & Approvals' },
    { name: 'Users', description: 'User Management & Role-Based Access Control' },
    { name: 'Dashboard', description: 'Executive KPIs, Metrics & Financial Reports' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Auth'],
        summary: 'System health check',
        responses: {
          200: {
            description: 'Service status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'pay365-api' },
                    uptime: { type: 'number', example: 12.34 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'User Login',
        description: 'Authenticates credentials and establishes a session with cookie `sid`.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@pay365.dev' },
                  password: { type: 'string', example: 'Password@123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful. Returns user metadata and sets `sid` cookie.',
            headers: {
              'Set-Cookie': {
                schema: { type: 'string', example: 'sid=s%3A...; Path=/; HttpOnly; SameSite=Lax' },
              },
            },
          },
          401: { description: 'Invalid email or password' },
          429: { description: 'Too many login attempts' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get Current Authenticated User',
        responses: {
          200: { description: 'User profile with role & linked employee info' },
          401: { description: 'Session missing or invalid' },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'User Logout',
        responses: {
          200: { description: 'Session destroyed and cookie cleared' },
        },
      },
    },
    '/api/v1/employees': {
      get: {
        tags: ['Employees'],
        summary: 'List all employees',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'department_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'List of employee records with pagination metadata' },
        },
      },
      post: {
        tags: ['Employees'],
        summary: 'Create an employee (Admin/HR Manager)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employee_code', 'first_name', 'last_name', 'email', 'hire_date'],
                properties: {
                  employee_code: { type: 'string', example: 'EMP-011' },
                  first_name: { type: 'string', example: 'Kabir' },
                  last_name: { type: 'string', example: 'Singhania' },
                  email: { type: 'string', format: 'email', example: 'kabir.singh@peoplepay360.io' },
                  phone: { type: 'string', example: '+91 98765 00000' },
                  hire_date: { type: 'string', format: 'date', example: '2026-09-01' },
                  department_id: { type: 'string', format: 'uuid' },
                  job_id: { type: 'string', format: 'uuid' },
                  wage: { type: 'number', example: 75000 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Employee created' },
          400: { description: 'Validation error' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/v1/employees/{id}': {
      get: {
        tags: ['Employees'],
        summary: 'Get employee details by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Employee profile, department, job, schedule & active contract' },
          404: { description: 'Employee not found' },
        },
      },
      patch: {
        tags: ['Employees'],
        summary: 'Update employee details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Employee updated successfully' },
        },
      },
    },
    '/api/v1/employees/departments': {
      get: {
        tags: ['Employees'],
        summary: 'List all departments',
        responses: { 200: { description: 'Departments list' } },
      },
    },
    '/api/v1/employees/jobs': {
      get: {
        tags: ['Employees'],
        summary: 'List all job roles',
        responses: { 200: { description: 'Job roles list' } },
      },
    },
    '/api/v1/attendance': {
      get: {
        tags: ['Attendance'],
        summary: 'List attendance records',
        parameters: [
          { name: 'employee_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PRESENT', 'LATE', 'MISSING_CHECKOUT', 'MANUAL_EDIT'] } },
        ],
        responses: { 200: { description: 'Attendance logs list' } },
      },
    },
    '/api/v1/attendance/check-in': {
      post: {
        tags: ['Attendance'],
        summary: 'Self Clock In',
        description: 'Records check-in timestamp for current authenticated employee',
        responses: {
          200: { description: 'Clocked in successfully' },
          409: { description: 'Already clocked in for today' },
        },
      },
    },
    '/api/v1/attendance/check-out': {
      post: {
        tags: ['Attendance'],
        summary: 'Self Clock Out',
        description: 'Records check-out timestamp and calculates worked hours',
        responses: {
          200: { description: 'Clocked out successfully' },
          400: { description: 'No active check-in found to clock out' },
        },
      },
    },
    '/api/v1/contracts': {
      get: {
        tags: ['Contracts'],
        summary: 'List employment contracts',
        responses: { 200: { description: 'Contracts list' } },
      },
      post: {
        tags: ['Contracts'],
        summary: 'Create employment contract',
        responses: { 201: { description: 'Contract created' } },
      },
    },
    '/api/v1/schedules': {
      get: {
        tags: ['Schedules'],
        summary: 'List working schedules',
        responses: { 200: { description: 'Schedules list' } },
      },
    },
    '/api/v1/salary-structures': {
      get: {
        tags: ['Salary Structures'],
        summary: 'List all salary structures with rule counts',
        responses: { 200: { description: 'Salary structures list' } },
      },
      post: {
        tags: ['Salary Structures'],
        summary: 'Create a new salary structure',
        responses: { 201: { description: 'Salary structure created' } },
      },
    },
    '/api/v1/salary-structures/{id}': {
      get: {
        tags: ['Salary Structures'],
        summary: 'Get salary structure with all ordered computation rules',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Structure details with nested rule lines' } },
      },
    },
    '/api/v1/payruns': {
      get: {
        tags: ['Payruns'],
        summary: 'List all payroll runs',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID', 'CANCELLED'] } },
        ],
        responses: { 200: { description: 'Payruns list' } },
      },
      post: {
        tags: ['Payruns'],
        summary: 'Create a new draft payrun batch',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'structure_id', 'period_start', 'period_end', 'employee_ids'],
                properties: {
                  name: { type: 'string', example: 'September 2026 Regular Payrun' },
                  structure_id: { type: 'string', format: 'uuid' },
                  period_start: { type: 'string', format: 'date', example: '2026-09-01' },
                  period_end: { type: 'string', format: 'date', example: '2026-09-30' },
                  employee_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Draft payrun created' } },
      },
    },
    '/api/v1/payruns/{id}': {
      get: {
        tags: ['Payruns'],
        summary: 'Get payrun details and summary aggregates',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Payrun totals, warnings, and payslips summary' } },
      },
    },
    '/api/v1/payruns/{id}/compute': {
      post: {
        tags: ['Payruns'],
        summary: 'Trigger payroll engine computation for payrun batch',
        description: 'Runs AST formula evaluator across all selected employee contracts, generates payslip lines, and captures warnings.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Payrun batch computed with gross/deductions/net figures' },
          422: { description: 'Engine rule evaluation error' },
        },
      },
    },
    '/api/v1/payruns/{id}/validate': {
      post: {
        tags: ['Payruns'],
        summary: 'Validate and lock payrun batch (HR Payroll Manager)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Payrun marked as VALIDATED' } },
      },
    },
    '/api/v1/payslips': {
      get: {
        tags: ['Payslips'],
        summary: 'List payslips across payruns and employees',
        parameters: [
          { name: 'payrun_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'employee_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Payslips list' } },
      },
    },
    '/api/v1/payslips/{id}': {
      get: {
        tags: ['Payslips'],
        summary: 'Get full payslip breakdown with earnings, deductions & net breakdown lines',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Payslip breakdown' } },
      },
    },
    '/api/v1/dashboard/metrics': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get Executive HR & Payroll Dashboard Analytics',
        parameters: [
          { name: 'period_start', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'period_end', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'KPI cards, department expense breakdown, monthly payroll trends, alerts' },
        },
      },
    },
    '/api/v1/users': {
      get: {
        tags: ['Users'],
        summary: 'List all system users (Admin)',
        responses: { 200: { description: 'Users list with assigned roles' } },
      },
    },
  },
};
