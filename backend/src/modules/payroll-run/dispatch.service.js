import { AppError } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';
import { renderPayslipPdf } from './payslip-pdf.service.js';
import { sendPayslipEmail } from '../notifications/email.service.js';

function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') return date.slice(0, 10);
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return String(date);
}

export async function dispatchPayrunPayslips(payrunId, actorId) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: {
      payslips: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true },
          },
          lines: { orderBy: [{ sequence: 'asc' }, { code: 'asc' }] },
        },
      },
    },
  });

  if (!payrun) {
    throw new AppError(404, 'NOT_FOUND', 'Payrun not found');
  }

  const allowedStatuses = ['COMPUTED', 'VALIDATED', 'PAID'];
  if (!allowedStatuses.includes(payrun.status)) {
    throw new AppError(
      409,
      'STATE_ERROR',
      `Cannot dispatch payslips for a ${payrun.status} payrun. Payrun must be COMPUTED, VALIDATED, or PAID.`
    );
  }

  const results = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const payslip of payrun.payslips) {
    const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`;
    const email = payslip.employee.email;
    const periodStartStr = formatDate(payslip.periodStart);
    const periodEndStr = formatDate(payslip.periodEnd);
    const periodLabel = `${periodStartStr} → ${periodEndStr}`;
    const filename = `payslip-${payslip.employee.employeeCode || payslip.id}-${periodStartStr}.pdf`;

    try {
      if (!email || !email.includes('@')) {
        throw new Error(`Employee ${employeeName} (${payslip.employee.employeeCode}) has no valid email`);
      }

      // Build public payslip shape for zero-recalculation PDF renderer
      const publicPayslip = {
        id: payslip.id,
        payrun_id: payslip.payrunId,
        employee_id: payslip.employeeId,
        employee_name: employeeName,
        employee_code: payslip.employee.employeeCode,
        period_start: payslip.periodStart,
        period_end: payslip.periodEnd,
        worked_days: Number(payslip.workedDays),
        gross: Number(payslip.gross),
        deductions: Number(payslip.deductions),
        net: Number(payslip.net),
        currency: payslip.currency,
        status: payslip.status,
        payrun: { name: payrun.name, status: payrun.status },
        lines: payslip.lines.map((line) => ({
          code: line.code,
          name: line.name,
          category: line.category,
          sequence: line.sequence,
          amount: Number(line.amount),
          rate: line.rate == null ? null : Number(line.rate),
          base_amount: line.baseAmount == null ? null : Number(line.baseAmount),
          computation_type: line.computationType,
        })),
      };

      const pdfBuffer = await renderPayslipPdf(publicPayslip);

      await sendPayslipEmail({
        to: email,
        employeeName,
        payrunName: payrun.name,
        periodLabel,
        netAmount: Number(payslip.net),
        pdfBuffer,
        filename,
      });

      const sentAt = new Date();
      await prisma.payslip.update({
        where: { id: payslip.id },
        data: { emailSentAt: sentAt },
      });

      results.push({
        payslip_id: payslip.id,
        employee_name: employeeName,
        email,
        status: 'SENT',
        email_sent_at: sentAt.toISOString(),
      });
      sentCount++;
    } catch (err) {
      results.push({
        payslip_id: payslip.id,
        employee_name: employeeName,
        email: email || 'N/A',
        status: 'FAILED',
        error: err.message,
      });
      failedCount++;
    }
  }

  // Audit log record for the batch dispatch
  await prisma.auditLog
    .create({
      data: {
        actorId,
        action: 'PAYRUN_DISPATCH',
        entity: 'payrun',
        entityId: payrunId,
        payload: {
          channel: 'EMAIL',
          total: payrun.payslips.length,
          sent: sentCount,
          failed: failedCount,
        },
      },
    })
    .catch((err) => console.warn('[AuditLog] Failed to record PAYRUN_DISPATCH:', err.message));

  return {
    payrun_id: payrunId,
    channel: 'EMAIL',
    total: payrun.payslips.length,
    sent: sentCount,
    failed: failedCount,
    results,
  };
}
