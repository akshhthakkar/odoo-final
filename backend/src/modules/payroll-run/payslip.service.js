import { AppError } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';

// Detail include: employee + payrun names + lines in payslip display order.
const detailInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
  },
  payrun: {
    select: {
      id: true,
      name: true,
      status: true,
      structure: { select: { name: true, code: true } },
    },
  },
  lines: { orderBy: [{ sequence: 'asc' }, { code: 'asc' }] },
};

const listInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
  },
};

// Decimals -> numbers at the API boundary.
function toPublicPayslip(payslip, { withLines = false } = {}) {
  const base = {
    id: payslip.id,
    payrun_id: payslip.payrunId,
    employee_id: payslip.employeeId,
    employee_name: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
    employee_code: payslip.employee.employeeCode,
    period_start: payslip.periodStart,
    period_end: payslip.periodEnd,
    worked_days: Number(payslip.workedDays),
    gross: Number(payslip.gross),
    deductions: Number(payslip.deductions),
    net: Number(payslip.net),
    currency: payslip.currency,
    status: payslip.status,
    email_sent_at: payslip.emailSentAt,
    created_at: payslip.createdAt,
  };
  if (!withLines) return base;
  return {
    ...base,
    payrun: payslip.payrun,
    lines: payslip.lines.map(toPublicLine),
  };
}

function toPublicLine(line) {
  return {
    code: line.code,
    name: line.name,
    category: line.category,
    sequence: line.sequence,
    amount: Number(line.amount),
    rate: line.rate == null ? null : Number(line.rate),
    base_amount: line.baseAmount == null ? null : Number(line.baseAmount),
    computation_type: line.computationType,
  };
}

// Map API filters to Prisma where-clause fields.
function buildWhere(filters) {
  return {
    ...(filters.payrun_id ? { payrunId: filters.payrun_id } : {}),
    ...(filters.employee_id ? { employeeId: filters.employee_id } : {}),
    ...(filters.period_start ? { periodStart: { gte: new Date(filters.period_start) } } : {}),
    ...(filters.period_end ? { periodEnd: { lte: new Date(filters.period_end) } } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
}

export async function listPayslips(filters) {
  const where = buildWhere(filters);
  const payslips = await prisma.payslip.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (filters.page - 1) * filters.limit,
    take: filters.limit,
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
  });
  return payslips.map((payslip) => toPublicPayslip(payslip));
}

export async function getPayslip(payslipId) {
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: detailInclude,
  });
  if (!payslip) {
    throw new AppError(404, 'NOT_FOUND', 'Payslip not found');
  }
  return toPublicPayslip(payslip, { withLines: true });
}

export async function listMyPayslips(employeeId) {
  if (!employeeId) {
    throw new AppError(404, 'NOT_FOUND', 'No employee linked to this account');
  }
  const payslips = await prisma.payslip.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
  });
  return payslips.map((payslip) => toPublicPayslip(payslip));
}

// Self-service detail: ownership is enforced silently with 404 so another
// employee's payslip existence is never revealed.
export async function getMyPayslip(payslipId, employeeId) {
  if (!employeeId) {
    throw new AppError(404, 'NOT_FOUND', 'No employee linked to this account');
  }
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: detailInclude,
  });
  if (!payslip || payslip.employeeId !== employeeId) {
    throw new AppError(404, 'NOT_FOUND', 'Payslip not found');
  }
  return toPublicPayslip(payslip, { withLines: true });
}

// PDF self-service ownership check: returns 403 on wrong owner per TASK-017 AC.
export async function getOwnedPayslip(payslipId, employeeId) {
  if (!employeeId) {
    throw new AppError(404, 'NOT_FOUND', 'No employee linked to this account');
  }
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: detailInclude,
  });
  if (!payslip) {
    throw new AppError(404, 'NOT_FOUND', 'Payslip not found');
  }
  if (payslip.employeeId !== employeeId) {
    throw new AppError(403, 'FORBIDDEN', 'You can only access your own payslip');
  }
  return toPublicPayslip(payslip, { withLines: true });
}

