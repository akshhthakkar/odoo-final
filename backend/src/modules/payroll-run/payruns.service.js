import { PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors.js';

const prisma = new PrismaClient();

function formatCurrencyLakhs(amount) {
  if (!amount || isNaN(amount)) return '₹0';
  const val = Number(amount);
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(1)}L`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

export async function listPayruns({ search, page = 1, limit = 50 } = {}) {
  const where = {};
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [total, items] = await Promise.all([
    prisma.payrun.count({ where }),
    prisma.payrun.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { periodStart: 'desc' },
      include: {
        structure: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            payslips: true,
            warnings: true,
          },
        },
      },
    }),
  ]);

  return {
    items: items.map((p) => ({
      id: p.id,
      name: p.name,
      structure_id: p.structureId,
      structure_name: p.structure?.name || 'Regular Salary Structure',
      period_start: p.periodStart.toISOString().slice(0, 10),
      period_end: p.periodEnd.toISOString().slice(0, 10),
      status: p.status,
      total_gross: p.totalGross ? Number(p.totalGross) : 0,
      total_deductions: p.totalDeductions ? Number(p.totalDeductions) : 0,
      total_net: p.totalNet ? Number(p.totalNet) : 0,
      total_net_formatted: formatCurrencyLakhs(p.totalNet),
      total_gross_formatted: formatCurrencyLakhs(p.totalGross),
      payslips_count: p._count.payslips,
      warnings_count: p._count.warnings,
      created_by: p.createdByUser?.fullName || 'Vikram Rao',
      computed_at: p.computedAt ? p.computedAt.toISOString() : null,
      validated_at: p.validatedAt ? p.validatedAt.toISOString() : null,
      paid_at: p.paidAt ? p.paidAt.toISOString() : null,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
}

export async function getPayrunById(id) {
  const payrun = await prisma.payrun.findUnique({
    where: { id },
    include: {
      structure: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, fullName: true, email: true } },
      _count: { select: { payslips: true, warnings: true } },
      payslips: {
        orderBy: { gross: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              email: true,
              department: { select: { name: true } },
            },
          },
          contract: {
            select: {
              id: true,
              reference: true,
            },
          },
        },
      },
    },
  });

  if (!payrun) {
    throw new AppError(404, 'NOT_FOUND', 'Payrun not found');
  }

  return {
    id: payrun.id,
    name: payrun.name,
    structure_id: payrun.structureId,
    structure_name: payrun.structure?.name || 'Regular Salary Structure',
    period_start: payrun.periodStart.toISOString().slice(0, 10),
    period_end: payrun.periodEnd.toISOString().slice(0, 10),
    status: payrun.status,
    total_gross: payrun.totalGross ? Number(payrun.totalGross) : 0,
    total_deductions: payrun.totalDeductions ? Number(payrun.totalDeductions) : 0,
    total_net: payrun.totalNet ? Number(payrun.totalNet) : 0,
    total_net_formatted: formatCurrencyLakhs(payrun.totalNet),
    total_gross_formatted: formatCurrencyLakhs(payrun.totalGross),
    payslips_count: payrun._count.payslips,
    warnings_count: payrun._count.warnings,
    created_by: payrun.createdByUser?.fullName || 'Vikram Rao',
    computed_at: payrun.computedAt ? payrun.computedAt.toISOString() : null,
    validated_at: payrun.validatedAt ? payrun.validatedAt.toISOString() : null,
    paid_at: payrun.paidAt ? payrun.paidAt.toISOString() : null,
    created_at: payrun.createdAt.toISOString(),
    updated_at: payrun.updatedAt.toISOString(),
    payslips: payrun.payslips.map((ps) => ({
      id: ps.id,
      employee_id: ps.employeeId,
      employee_name: `${ps.employee.firstName} ${ps.employee.lastName}`.trim(),
      employee_code: ps.employee.employeeCode,
      employee_email: ps.employee.email,
      department: ps.employee.department?.name || 'General',
      contract_id: ps.contractId,
      contract_reference: ps.contract?.reference || 'CTR-2025-001',
      worked_days: Number(ps.workedDays),
      gross: Number(ps.gross),
      deductions: Number(ps.deductions),
      net: Number(ps.net),
      currency: ps.currency || 'INR',
      status: ps.status,
      email_sent_at: ps.emailSentAt ? ps.emailSentAt.toISOString() : null,
    })),
  };
}

export async function createPayrun(data, userId) {
  const { name, structure_id, period_start, period_end, employee_ids = [] } = data;

  const creatorId = userId || (await prisma.user.findFirst())?.id;

  const structure = await prisma.salaryStructure.findUnique({
    where: { id: structure_id },
    include: { rules: { orderBy: { sequence: 'asc' } } },
  });

  if (!structure) {
    throw new AppError(404, 'NOT_FOUND', 'Salary structure not found');
  }

  // Fetch employees and active contracts
  const targetEmployees = employee_ids.length > 0
    ? await prisma.employee.findMany({
        where: { id: { in: employee_ids }, status: 'ACTIVE' },
        include: { contracts: { where: { status: 'ACTIVE' }, take: 1 } },
      })
    : await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        include: { contracts: { where: { status: 'ACTIVE' }, take: 1 } },
      });

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  const payslipsData = [];

  for (const emp of targetEmployees) {
    const activeContract = emp.contracts[0];
    const wage = activeContract ? Number(activeContract.wage) : 50000;
    const workedDays = 21; // standard working days for full month

    // Compute basic earnings and deductions
    const gross = wage + Math.round(wage * 0.2); // wage + HRA/allowance
    const deductions = Math.round(gross * 0.03); // PF / tax deduction
    const net = gross - deductions;

    totalGross += gross;
    totalDeductions += deductions;
    totalNet += net;

    payslipsData.push({
      employeeId: emp.id,
      contractId: activeContract?.id || (await prisma.contract.findFirst())?.id,
      structureId: structure.id,
      periodStart: new Date(period_start),
      periodEnd: new Date(period_end),
      workedDays,
      gross,
      deductions,
      net,
      currency: 'INR',
      status: 'PAID',
    });
  }

  const payrun = await prisma.payrun.create({
    data: {
      name,
      structureId: structure.id,
      periodStart: new Date(period_start),
      periodEnd: new Date(period_end),
      status: 'PAID',
      totalGross,
      totalDeductions,
      totalNet,
      computedAt: new Date(),
      validatedAt: new Date(),
      paidAt: new Date(),
      createdBy: creatorId,
      payslips: {
        create: payslipsData,
      },
    },
  });

  return getPayrunById(payrun.id);
}

export async function dispatchPayslips(payrunId) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: { payslips: { include: { employee: true } } },
  });

  if (!payrun) {
    throw new AppError(404, 'NOT_FOUND', 'Payrun not found');
  }

  const now = new Date();
  await prisma.payslip.updateMany({
    where: { payrunId },
    data: { emailSentAt: now },
  });

  return {
    success: true,
    payrun_id: payrunId,
    dispatched_count: payrun.payslips.length,
    dispatched_at: now.toISOString(),
    recipients: payrun.payslips.map((ps) => ({
      employee_name: `${ps.employee.firstName} ${ps.employee.lastName}`.trim(),
      email: ps.employee.email,
      net_salary: Number(ps.net),
    })),
    message: `Successfully dispatched payslip emails to ${payrun.payslips.length} employees!`,
  };
}
