import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const baseReportSchema = z.object({
  period_start: z.string().regex(DATE_REGEX, 'Must be YYYY-MM-DD').optional(),
  period_end: z.string().regex(DATE_REGEX, 'Must be YYYY-MM-DD').optional(),
  department_id: z.string().uuid('Invalid department UUID').optional(),
  format: z.enum(['json', 'csv']).default('json'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const payrollByDepartmentSchema = baseReportSchema.extend({
  sort: z.enum(['department', 'employee_count', 'gross', 'deductions', 'net']).default('net'),
});

export const payrollByJobSchema = baseReportSchema.extend({
  sort: z.enum(['job', 'employee_count', 'gross', 'deductions', 'net']).default('net'),
});

export const leaveUtilizationSchema = baseReportSchema.extend({
  sort: z.enum(['type_name', 'allocated', 'taken', 'utilization_pct']).default('utilization_pct'),
});

export const attendanceExceptionsSchema = baseReportSchema.extend({
  sort: z
    .enum([
      'employee_name',
      'employee_code',
      'department',
      'late_days',
      'missing_checkouts',
      'manual_edits',
      'overtime_hours',
    ])
    .default('late_days'),
});
