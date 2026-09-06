import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/prisma.js';

function parseDateFilters(filters) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0); // Jan 1st of current year for comprehensive dynamic reporting
  const defaultEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); // Dec 31st

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

export async function getSummaryKPIs(filters) {
  const { start, end, startStr, endStr } = parseDateFilters(filters);
  const departmentId = filters.department_id || null;

  const [payrollAgg] = await prisma.$queryRaw`
    SELECT
      COUNT(p.id)::int AS payslips_count,
      COUNT(DISTINCT p.employee_id)::int AS employees_count,
      COALESCE(SUM(p.gross), 0)::float8 AS total_gross,
      COALESCE(SUM(p.deductions), 0)::float8 AS total_deductions,
      COALESCE(SUM(p.net), 0)::float8 AS total_net,
      COALESCE(AVG(p.net), 0)::float8 AS avg_net
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    WHERE p.period_end >= ${start} AND p.period_start <= ${end}
      ${departmentId ? Prisma.sql`AND e.department_id = ${departmentId}::uuid` : Prisma.empty}
  `;

  const [timeOffAgg] = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM(r.days), 0)::float8 AS total_leave_days
    FROM time_off_requests r
    JOIN employees e ON e.id = r.employee_id
    WHERE r.status = 'APPROVED'
      AND r.date_to >= ${start} AND r.date_from <= ${end}
      ${departmentId ? Prisma.sql`AND e.department_id = ${departmentId}::uuid` : Prisma.empty}
  `;

  const [attendanceAgg] = await prisma.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE a.status IN ('LATE', 'MISSING_CHECKOUT', 'MANUAL_EDIT'))::int AS exception_count,
      COALESCE(SUM(a.overtime_hours), 0)::float8 AS total_overtime_hours
    FROM attendance a
    JOIN employees e ON e.id = a.employee_id
    WHERE a.attendance_date >= ${start} AND a.attendance_date <= ${end}
      ${departmentId ? Prisma.sql`AND e.department_id = ${departmentId}::uuid` : Prisma.empty}
  `;

  return {
    data: {
      payslips_count: Number(payrollAgg?.payslips_count || 0),
      employees_count: Number(payrollAgg?.employees_count || 0),
      total_gross: Number(payrollAgg?.total_gross || 0),
      total_deductions: Number(payrollAgg?.total_deductions || 0),
      total_net: Number(payrollAgg?.total_net || 0),
      avg_net: Number(payrollAgg?.avg_net || 0),
      total_leave_days: Number(timeOffAgg?.total_leave_days || 0),
      exception_count: Number(attendanceAgg?.exception_count || 0),
      total_overtime_hours: Number(attendanceAgg?.total_overtime_hours || 0),
    },
    meta: {
      report: 'summary-kpis',
      period_start: startStr,
      period_end: endStr,
    },
  };
}

export async function getPayrollByDepartment(filters) {
  const { start, end, startStr, endStr } = parseDateFilters(filters);
  const departmentId = filters.department_id || null;
  const sort = filters.sort || 'net';
  const order = (filters.order || 'desc').toUpperCase();

  const rows = await prisma.$queryRaw`
    SELECT
      d.name AS department,
      d.code AS department_code,
      COUNT(DISTINCT p.employee_id)::int AS employee_count,
      COALESCE(SUM(p.gross), 0)::float8 AS gross,
      COALESCE(SUM(p.deductions), 0)::float8 AS deductions,
      COALESCE(SUM(p.net), 0)::float8 AS net,
      COALESCE(AVG(p.net), 0)::float8 AS avg_net
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    JOIN departments d ON d.id = e.department_id
    WHERE p.period_end >= ${start} AND p.period_start <= ${end}
      ${departmentId ? Prisma.sql`AND d.id = ${departmentId}::uuid` : Prisma.empty}
    GROUP BY d.id, d.name, d.code
    ORDER BY ${Prisma.raw(sort)} ${Prisma.raw(order)}
  `;

  return {
    data: rows.map((r) => ({
      department: String(r.department),
      department_code: String(r.department_code || ''),
      employee_count: Number(r.employee_count || 0),
      gross: Number(r.gross || 0),
      deductions: Number(r.deductions || 0),
      net: Number(r.net || 0),
      avg_net: Number(r.avg_net || 0),
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
      COALESCE(SUM(p.net), 0)::float8 AS net,
      COALESCE(AVG(p.net), 0)::float8 AS avg_net
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
      avg_net: Number(r.avg_net || 0),
    })),
    meta: {
      report: 'payroll-by-job',
      period_start: startStr,
      period_end: endStr,
      rows: rows.length,
    },
  };
}

export async function getPayrollMonthlyTrend(filters) {
  const { start, end, startStr, endStr } = parseDateFilters(filters);
  const departmentId = filters.department_id || null;

  const rows = await prisma.$queryRaw`
    SELECT
      TO_CHAR(p.period_start, 'YYYY-MM') AS month,
      COUNT(p.id)::int AS payslips_count,
      COUNT(DISTINCT p.employee_id)::int AS employee_count,
      COALESCE(SUM(p.gross), 0)::float8 AS gross,
      COALESCE(SUM(p.deductions), 0)::float8 AS deductions,
      COALESCE(SUM(p.net), 0)::float8 AS net,
      COALESCE(AVG(p.net), 0)::float8 AS avg_net
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    WHERE p.period_end >= ${start} AND p.period_start <= ${end}
      ${departmentId ? Prisma.sql`AND e.department_id = ${departmentId}::uuid` : Prisma.empty}
    GROUP BY TO_CHAR(p.period_start, 'YYYY-MM')
    ORDER BY month ASC
  `;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return {
    data: rows.map((r) => {
      const [year, monthNum] = (r.month || '').split('-');
      const mIdx = parseInt(monthNum, 10) - 1;
      const month_label = mIdx >= 0 && mIdx < 12 ? `${monthNames[mIdx]} ${year}` : r.month;

      return {
        month: String(r.month),
        month_label,
        payslips_count: Number(r.payslips_count || 0),
        employee_count: Number(r.employee_count || 0),
        gross: Number(r.gross || 0),
        deductions: Number(r.deductions || 0),
        net: Number(r.net || 0),
        avg_net: Number(r.avg_net || 0),
      };
    }),
    meta: {
      report: 'payroll-monthly-trend',
      period_start: startStr,
      period_end: endStr,
      rows: rows.length,
    },
  };
}

export async function getStatutoryCompliance(filters) {
  const { start, end, startStr, endStr } = parseDateFilters(filters);
  const departmentId = filters.department_id || null;

  const rows = await prisma.$queryRaw`
    SELECT
      l.code,
      l.name,
      l.category,
      COUNT(DISTINCT p.employee_id)::int AS employee_count,
      COALESCE(SUM(ABS(l.amount)), 0)::float8 AS total_amount
    FROM payslip_lines l
    JOIN payslips p ON p.id = l.payslip_id
    JOIN employees e ON e.id = p.employee_id
    WHERE p.period_end >= ${start} AND p.period_start <= ${end}
      AND l.category IN ('DEDUCTION', 'ALLOWANCE', 'EMPLOYER_CONTRIB')
      ${departmentId ? Prisma.sql`AND e.department_id = ${departmentId}::uuid` : Prisma.empty}
    GROUP BY l.code, l.name, l.category
    ORDER BY l.category ASC, total_amount DESC
  `;

  return {
    data: rows.map((r) => ({
      code: String(r.code),
      name: String(r.name),
      category: String(r.category),
      employee_count: Number(r.employee_count || 0),
      total_amount: Number(r.total_amount || 0),
    })),
    meta: {
      report: 'statutory-compliance',
      period_start: startStr,
      period_end: endStr,
      rows: rows.length,
    },
  };
}

export async function getEmployeePayslipSummary(filters) {
  const { start, end, startStr, endStr } = parseDateFilters(filters);
  const departmentId = filters.department_id || null;
  const sort = filters.sort || 'net';
  const order = (filters.order || 'desc').toUpperCase();

  const rows = await prisma.$queryRaw`
    SELECT
      p.id AS payslip_id,
      e.id AS employee_id,
      e.first_name || ' ' || e.last_name AS employee_name,
      e.employee_code,
      COALESCE(d.name, 'Unassigned') AS department,
      COALESCE(j.name, 'Unassigned') AS job,
      c.reference AS contract_ref,
      TO_CHAR(p.period_start, 'YYYY-MM-DD') AS period_start,
      TO_CHAR(p.period_end, 'YYYY-MM-DD') AS period_end,
      COALESCE(p.worked_days, 0)::float8 AS worked_days,
      COALESCE(p.gross, 0)::float8 AS gross,
      COALESCE(p.deductions, 0)::float8 AS deductions,
      COALESCE(p.net, 0)::float8 AS net,
      p.status AS status
    FROM payslips p
    JOIN employees e ON e.id = p.employee_id
    LEFT JOIN contracts c ON c.id = p.contract_id
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN jobs j ON j.id = e.job_id
    WHERE p.period_end >= ${start} AND p.period_start <= ${end}
      ${departmentId ? Prisma.sql`AND e.department_id = ${departmentId}::uuid` : Prisma.empty}
    ORDER BY ${Prisma.raw(sort)} ${Prisma.raw(order)}
  `;

  return {
    data: rows.map((r) => ({
      payslip_id: String(r.payslip_id),
      employee_id: String(r.employee_id),
      employee_name: String(r.employee_name),
      employee_code: String(r.employee_code),
      department: String(r.department),
      job: String(r.job),
      contract_ref: r.contract_ref ? String(r.contract_ref) : '—',
      period_start: String(r.period_start),
      period_end: String(r.period_end),
      worked_days: Number(r.worked_days || 0),
      gross: Number(r.gross || 0),
      deductions: Number(r.deductions || 0),
      net: Number(r.net || 0),
      status: String(r.status),
    })),
    meta: {
      report: 'employee-payslip-summary',
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
      t.code AS type_code,
      COALESCE(SUM(a.allocated_days), 0)::float8 AS allocated,
      COALESCE(
        GREATEST(
          SUM(a.taken_days),
          (
            SELECT COALESCE(SUM(r.days), 0)
            FROM time_off_requests r
            WHERE r.type_id = t.id AND r.status = 'APPROVED'
              AND r.date_to >= ${start} AND r.date_from <= ${end}
              ${departmentId ? Prisma.sql`AND r.employee_id IN (SELECT id FROM employees WHERE department_id = ${departmentId}::uuid)` : Prisma.empty}
          )
        ),
        0
      )::float8 AS taken,
      CASE
        WHEN COALESCE(SUM(a.allocated_days), 0) > 0
        THEN ROUND((
          COALESCE(
            GREATEST(
              SUM(a.taken_days),
              (
                SELECT COALESCE(SUM(r.days), 0)
                FROM time_off_requests r
                WHERE r.type_id = t.id AND r.status = 'APPROVED'
                  AND r.date_to >= ${start} AND r.date_from <= ${end}
                  ${departmentId ? Prisma.sql`AND r.employee_id IN (SELECT id FROM employees WHERE department_id = ${departmentId}::uuid)` : Prisma.empty}
              )
            ),
            0
          ) / SUM(a.allocated_days) * 100
        )::numeric, 1)::float8
        ELSE 0
      END AS utilization_pct
    FROM time_off_allocations a
    JOIN time_off_types t ON t.id = a.type_id
    WHERE a.status = 'APPROVED'
      AND a.valid_to >= ${start} AND a.valid_from <= ${end}
      ${departmentId ? Prisma.sql`AND a.employee_id IN (SELECT id FROM employees WHERE department_id = ${departmentId}::uuid)` : Prisma.empty}
    GROUP BY t.id, t.name, t.code
    ORDER BY ${Prisma.raw(sort)} ${Prisma.raw(order)} NULLS LAST
  `;

  return {
    data: rows.map((r) => ({
      type_name: String(r.type_name),
      type_code: String(r.type_code || ''),
      allocated: Number(r.allocated || 0),
      taken: Number(r.taken || 0),
      utilization_pct: r.utilization_pct == null ? 0 : Number(r.utilization_pct),
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
