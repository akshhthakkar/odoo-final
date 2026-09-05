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

  return { start, end };
}

export async function getDashboardMetrics(filters = {}) {
  const { start, end } = parseDateFilters(filters);
  const departmentId = filters.department_id || null;
  const employeeType = filters.employee_type || null;

  // Shared Where Clauses
  const payslipWhere = {
    periodStart: { lte: end },
    periodEnd: { gte: start },
    ...(departmentId ? { employee: { departmentId } } : {}),
    ...(employeeType ? { contract: { contractType: employeeType } } : {}),
  };

  const attendanceWhere = {
    attendanceDate: { gte: start, lte: end },
    ...(departmentId ? { employee: { departmentId } } : {}),
    ...(employeeType
      ? {
          employee: {
            contracts: {
              some: { contractType: employeeType, status: 'ACTIVE' },
            },
          },
        }
      : {}),
  };

  const timeOffWhere = {
    dateFrom: { lte: end },
    dateTo: { gte: start },
    ...(departmentId ? { employee: { departmentId } } : {}),
    ...(employeeType
      ? {
          employee: {
            contracts: {
              some: { contractType: employeeType, status: 'ACTIVE' },
            },
          },
        }
      : {}),
  };

  const now = new Date();

  // Execute queries in parallel
  const [
    paidPayslipsSum,
    payslipsAggregate,
    approvedTimeOffAggregate,
    attendanceStatusGroups,
    salaryCostByDeptRaw,
    monthlyNetTrendRaw,
    openWarnings,
    contractAttentionEmployees,
    pendingTimeOffRequests,
    attendanceOvertimeAggregate,
    activeEmployeesCount,
    distinctAttendees,
    pendingTimeOffCount,
    timeOffTypes,
    leaveAllocations,
    deptBreakdownRaw,
  ] = await Promise.all([
    // 1. Total Net Paid
    prisma.payslip.aggregate({
      where: { ...payslipWhere, status: 'PAID' },
      _sum: { net: true },
    }),

    // 2. Payslips Count & Average Net Salary
    prisma.payslip.aggregate({
      where: payslipWhere,
      _count: { id: true },
      _sum: { net: true },
      _avg: { net: true },
    }),

    // 3. Approved Time Off Days
    prisma.timeOffRequest.aggregate({
      where: { ...timeOffWhere, status: 'APPROVED' },
      _sum: { days: true },
    }),

    // 4. Attendance Status Groups
    prisma.attendance.groupBy({
      by: ['status'],
      where: attendanceWhere,
      _count: { id: true },
    }),

    // 5. Salary Cost By Department (Chart)
    prisma.$queryRaw`
      SELECT
        COALESCE(d.name, 'Unassigned') AS department,
        COALESCE(SUM(p.net), 0)::float AS total_net
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN contracts c ON p.contract_id = c.id
      WHERE p.period_start <= ${end} AND p.period_end >= ${start}
        ${departmentId ? Prisma.sql`AND e.department_id = ${departmentId}::uuid` : Prisma.empty}
        ${employeeType ? Prisma.sql`AND c.contract_type = ${employeeType}::"ContractType"` : Prisma.empty}
      GROUP BY d.name
      ORDER BY total_net DESC
    `,

    // 6. Monthly Net Trend (Chart)
    prisma.$queryRaw`
      SELECT
        TO_CHAR(p.period_start, 'YYYY-MM') AS month,
        COALESCE(SUM(p.net), 0)::float AS total_net
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN contracts c ON p.contract_id = c.id
      WHERE p.period_start <= ${end} AND p.period_end >= ${start}
        ${departmentId ? Prisma.sql`AND e.department_id = ${departmentId}::uuid` : Prisma.empty}
        ${employeeType ? Prisma.sql`AND c.contract_type = ${employeeType}::"ContractType"` : Prisma.empty}
      GROUP BY TO_CHAR(p.period_start, 'YYYY-MM')
      ORDER BY month ASC
    `,

    // 7. Alerts: Open Payroll Warnings
    prisma.payrollWarning.findMany({
      where: {
        resolved: false,
        ...(departmentId ? { payslip: { employee: { departmentId } } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { payrun: { select: { name: true } } },
    }),

    // 8. Alerts: Contract Attention (Active employees without an active contract covering today)
    prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        ...(departmentId ? { departmentId } : {}),
        contracts: {
          none: {
            status: 'ACTIVE',
            startDate: { lte: now },
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
        },
      },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    }),

    // 9. Alerts: Pending Time Off Requests
    prisma.timeOffRequest.findMany({
      where: {
        status: 'TO_APPROVE',
        ...(departmentId ? { employee: { departmentId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        type: { select: { name: true } },
      },
    }),

    // 10. Attendance Overtime Hours Aggregate
    prisma.attendance.aggregate({
      where: attendanceWhere,
      _sum: { overtimeHours: true },
    }),

    // 11. Active Employees Count (for attendance coverage & absence)
    prisma.employee.count({
      where: {
        status: 'ACTIVE',
        ...(departmentId ? { departmentId } : {}),
      },
    }),

    // 12. Distinct Attendees in Period
    prisma.attendance.findMany({
      where: attendanceWhere,
      distinct: ['employeeId'],
      select: { employeeId: true },
    }),

    // 13. Pending Time Off Requests Count
    prisma.timeOffRequest.count({
      where: { ...timeOffWhere, status: 'TO_APPROVE' },
    }),

    // 14. Active Time Off Types
    prisma.timeOffType.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),

    // 15. Leave Allocations Grouped by Type
    prisma.timeOffAllocation.groupBy({
      by: ['typeId'],
      where: {
        status: 'APPROVED',
        ...(departmentId ? { employee: { departmentId } } : {}),
      },
      _sum: { allocatedDays: true, takenDays: true },
    }),

    // 16. Department Breakdown
    prisma.$queryRaw`
      SELECT
        d.name AS department,
        COUNT(DISTINCT e.id)::int AS employee_count,
        COALESCE(SUM(p.net), 0)::float AS total_net
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'ACTIVE'
      LEFT JOIN payslips p ON p.employee_id = e.id
        AND p.period_start <= ${end} AND p.period_end >= ${start}
        ${employeeType ? Prisma.sql`AND EXISTS (SELECT 1 FROM contracts c WHERE c.id = p.contract_id AND c.contract_type = ${employeeType}::"ContractType")` : Prisma.empty}
      ${departmentId ? Prisma.sql`WHERE d.id = ${departmentId}::uuid` : Prisma.empty}
      GROUP BY d.id, d.name
      ORDER BY d.name ASC
    `,
  ]);

  // Process Attendance Counts
  const attendanceCounts = {
    present: 0,
    late: 0,
    absent: 0,
    missing_checkouts: 0,
    manual_edits: 0,
  };

  let totalAttendanceRows = 0;
  let healthyAttendanceRows = 0;

  for (const group of attendanceStatusGroups) {
    const count = group._count.id;
    totalAttendanceRows += count;
    if (group.status === 'PRESENT') {
      attendanceCounts.present = count;
      healthyAttendanceRows += count;
    } else if (group.status === 'LATE') {
      attendanceCounts.late = count;
    } else if (group.status === 'MANUAL_EDIT') {
      attendanceCounts.manual_edits = count;
      healthyAttendanceRows += count;
    } else if (group.status === 'MISSING_CHECKOUT') {
      attendanceCounts.missing_checkouts = count;
    }
  }

  const distinctAttendeesCount = distinctAttendees.length;
  attendanceCounts.absent = Math.max(0, activeEmployeesCount - distinctAttendeesCount);

  const coveragePct =
    activeEmployeesCount > 0
      ? Math.round((distinctAttendeesCount / activeEmployeesCount) * 100)
      : 0;

  const attendanceHealthPct =
    totalAttendanceRows > 0
      ? Math.round((healthyAttendanceRows / totalAttendanceRows) * 100)
      : 0;

  // Process Leave Balances
  const allocMap = new Map(
    leaveAllocations.map((a) => [
      a.typeId,
      {
        allocated: Number(a._sum.allocatedDays || 0),
        taken: Number(a._sum.takenDays || 0),
      },
    ])
  );

  const leaveBalances = timeOffTypes.map((type) => {
    const alloc = allocMap.get(type.id) || { allocated: 0, taken: 0 };
    return {
      type_name: type.name,
      allocated: alloc.allocated,
      taken: alloc.taken,
      remaining: Math.max(0, alloc.allocated - alloc.taken),
    };
  });

  const totalNetPaid = Number(paidPayslipsSum._sum.net || 0);
  const payslipsCount = payslipsAggregate._count.id || 0;
  const avgNetSalary =
    payslipsCount > 0
      ? Number(Number(payslipsAggregate._avg.net || 0).toFixed(2))
      : 0;
  const approvedTimeOffDays = Number(approvedTimeOffAggregate._sum.days || 0);
  const overtimeHours = Number(attendanceOvertimeAggregate._sum.overtimeHours || 0);

  return {
    kpis: {
      total_net_paid: totalNetPaid,
      payslips_count: payslipsCount,
      avg_net_salary: avgNetSalary,
      approved_timeoff_days: approvedTimeOffDays,
      attendance_health_pct: attendanceHealthPct,
    },
    charts: {
      salary_cost_by_department: salaryCostByDeptRaw.map((row) => ({
        department: String(row.department),
        total_net: Number(row.total_net || 0),
      })),
      monthly_net_trend: monthlyNetTrendRaw.map((row) => ({
        month: String(row.month),
        total_net: Number(row.total_net || 0),
      })),
    },
    alerts: {
      open_warnings: openWarnings.map((w) => ({
        id: w.id,
        code: w.code,
        severity: w.severity,
        message: w.message,
        payrun_name: w.payrun?.name || 'N/A',
        created_at: w.createdAt,
      })),
      contract_attention: contractAttentionEmployees.map((e) => ({
        id: e.id,
        employee_name: `${e.firstName} ${e.lastName}`,
        employee_code: e.employeeCode,
      })),
      pending_requests: pendingTimeOffRequests.map((r) => ({
        id: r.id,
        employee_name: `${r.employee.firstName} ${r.employee.lastName}`,
        type_name: r.type?.name || 'Leave',
        days: Number(r.days),
        date_from: r.dateFrom,
        date_to: r.dateTo,
      })),
    },
    overviews: {
      attendance: {
        present: attendanceCounts.present,
        late: attendanceCounts.late,
        absent: attendanceCounts.absent,
        overtime_hours: overtimeHours,
        missing_checkouts: attendanceCounts.missing_checkouts,
        manual_edits: attendanceCounts.manual_edits,
        coverage_pct: coveragePct,
      },
      timeoff: {
        approved_days: approvedTimeOffDays,
        pending_count: pendingTimeOffCount,
        leave_balances: leaveBalances,
      },
    },
    department_breakdown: deptBreakdownRaw.map((row) => ({
      department: String(row.department),
      employee_count: Number(row.employee_count || 0),
      total_net: Number(row.total_net || 0),
    })),
  };
}
