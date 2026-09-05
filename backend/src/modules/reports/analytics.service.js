import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/prisma.js';

function parseDateFilters(filters) {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 30);
  defaultStart.setHours(0, 0, 0, 0);

  const defaultEnd = new Date(now);
  defaultEnd.setHours(23, 59, 59, 999);

  const start = filters.period_start
    ? new Date(`${filters.period_start}T00:00:00.000Z`)
    : defaultStart;

  const end = filters.period_end
    ? new Date(`${filters.period_end}T23:59:59.999Z`)
    : defaultEnd;

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  return { start, end, startStr, endStr };
}

export async function getPayrollByDepartment(filters) {
  const { start, end, startStr, endStr } = parseDateFilters(filters);
  const departmentId = filters.department_id || null;
  const sort = filters.sort || 'net';
  const order = (filters.order || 'desc').toUpperCase();

  const rows = await prisma.$queryRaw`
    SELECT
      d.name AS department,
      COUNT(DISTINCT p.employee_id)::int AS employee_count,
      COALESCE(SUM(p.gross), 0)::float8 AS gross,
      COALESCE(SUM(p.deductions), 0)::float8 AS deductions,
      COALESCE(SUM(p.net), 0)::float8 AS net
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    JOIN departments d ON d.id = e.department_id
    WHERE p.period_end >= ${start} AND p.period_start <= ${end}
      ${departmentId ? Prisma.sql`AND d.id = ${departmentId}::uuid` : Prisma.empty}
    GROUP BY d.name
    ORDER BY ${Prisma.raw(sort)} ${Prisma.raw(order)}
  `;

  return {
    data: rows.map((r) => ({
      department: String(r.department),
      employee_count: Number(r.employee_count || 0),
      gross: Number(r.gross || 0),
      deductions: Number(r.deductions || 0),
      net: Number(r.net || 0),
    })),
    meta: {
      report: 'payroll-by-department',
      period_start: startStr,
      period_end: endStr,
      rows: rows.length,
    },
  };
}

export async function getPayrollByJob(filters) {
  const { start, end, startStr, endStr } = parseDateFilters(filters);
  const departmentId = filters.department_id || null;
  const sort = filters.sort || 'net';
  const order = (filters.order || 'desc').toUpperCase();

  const rows = await prisma.$queryRaw`
    SELECT
      COALESCE(j.name, 'Unassigned') AS job,
      COUNT(DISTINCT p.employee_id)::int AS employee_count,
      COALESCE(SUM(p.gross), 0)::float8 AS gross,
      COALESCE(SUM(p.deductions), 0)::float8 AS deductions,
      COALESCE(SUM(p.net), 0)::float8 AS net
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    LEFT JOIN jobs j ON j.id = e.job_id
    WHERE p.period_end >= ${start} AND p.period_start <= ${end}
      ${departmentId ? Prisma.sql`AND e.department_id = ${departmentId}::uuid` : Prisma.empty}
    GROUP BY j.name
    ORDER BY ${Prisma.raw(sort)} ${Prisma.raw(order)}
  `;

  return {
    data: rows.map((r) => ({
      job: String(r.job),
      employee_count: Number(r.employee_count || 0),
      gross: Number(r.gross || 0),
      deductions: Number(r.deductions || 0),
      net: Number(r.net || 0),
    })),
    meta: {
      report: 'payroll-by-job',
      period_start: startStr,
      period_end: endStr,
      rows: rows.length,
    },
  };
}

export async function getLeaveUtilization(filters) {
  const { start, end, startStr, endStr } = parseDateFilters(filters);
  const departmentId = filters.department_id || null;
  const sort = filters.sort || 'utilization_pct';
  const order = (filters.order || 'desc').toUpperCase();

  const rows = await prisma.$queryRaw`
    SELECT
      t.name AS type_name,
      COALESCE(SUM(a.allocated_days), 0)::float8 AS allocated,
      COALESCE(SUM(a.taken_days), 0)::float8 AS taken,
      CASE
        WHEN COALESCE(SUM(a.allocated_days), 0) > 0
        THEN ROUND((SUM(a.taken_days) / SUM(a.allocated_days) * 100)::numeric, 1)::float8
        ELSE NULL
      END AS utilization_pct
    FROM time_off_allocations a
    JOIN time_off_types t ON t.id = a.type_id
    WHERE a.status = 'APPROVED'
      AND a.valid_to >= ${start} AND a.valid_from <= ${end}
      ${departmentId ? Prisma.sql`AND a.employee_id IN (SELECT id FROM employees WHERE department_id = ${departmentId}::uuid)` : Prisma.empty}
    GROUP BY t.name
    ORDER BY ${Prisma.raw(sort)} ${Prisma.raw(order)} NULLS LAST
  `;

  return {
    data: rows.map((r) => ({
      type_name: String(r.type_name),
      allocated: Number(r.allocated || 0),
      taken: Number(r.taken || 0),
      utilization_pct: r.utilization_pct == null ? null : Number(r.utilization_pct),
    })),
    meta: {
      report: 'leave-utilization',
      period_start: startStr,
      period_end: endStr,
      rows: rows.length,
    },
  };
}

export async function getAttendanceExceptions(filters) {
  const { start, end, startStr, endStr } = parseDateFilters(filters);
  const departmentId = filters.department_id || null;
  const sort = filters.sort || 'late_days';
  const order = (filters.order || 'desc').toUpperCase();

  const rows = await prisma.$queryRaw`
    SELECT
      e.first_name || ' ' || e.last_name AS employee_name,
      e.employee_code,
      COALESCE(d.name, 'Unassigned') AS department,
      COUNT(*) FILTER (WHERE a.status = 'LATE')::int AS late_days,
      COUNT(*) FILTER (WHERE a.status = 'MISSING_CHECKOUT')::int AS missing_checkouts,
      COUNT(*) FILTER (WHERE a.status = 'MANUAL_EDIT')::int AS manual_edits,
      COALESCE(SUM(a.overtime_hours), 0)::float8 AS overtime_hours
    FROM attendance a
    JOIN employees e ON e.id = a.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE a.attendance_date >= ${start} AND a.attendance_date <= ${end}
      AND (a.status IN ('LATE', 'MISSING_CHECKOUT', 'MANUAL_EDIT') OR a.overtime_hours > 0)
      ${departmentId ? Prisma.sql`AND e.department_id = ${departmentId}::uuid` : Prisma.empty}
    GROUP BY e.id, e.first_name, e.last_name, e.employee_code, d.name
    ORDER BY ${Prisma.raw(sort)} ${Prisma.raw(order)}
  `;

  return {
    data: rows.map((r) => ({
      employee_name: String(r.employee_name),
      employee_code: String(r.employee_code),
      department: String(r.department),
      late_days: Number(r.late_days || 0),
      missing_checkouts: Number(r.missing_checkouts || 0),
      manual_edits: Number(r.manual_edits || 0),
      overtime_hours: Number(r.overtime_hours || 0),
    })),
    meta: {
      report: 'attendance-exceptions',
      period_start: startStr,
      period_end: endStr,
      rows: rows.length,
    },
  };
}
