import * as service from './payslip.service.js';
import { renderPayslipPdf } from './payslip-pdf.service.js';

function buildPdfFilename(payslip) {
  const code = payslip.employee_code || payslip.id;
  const period =
    typeof payslip.period_start === 'string'
      ? payslip.period_start.slice(0, 10)
      : new Date(payslip.period_start).toISOString().slice(0, 10);
  return `payslip-${code}-${period}.pdf`;
}

export async function list(req, res, next) {
  try {
    const payslips = await service.listPayslips(req.validatedQuery ?? req.query);
    res.json({ success: true, data: payslips });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const payslip = await service.getPayslip(req.params.id);
    res.json({ success: true, data: payslip });
  } catch (err) {
    next(err);
  }
}

export async function listMine(req, res, next) {
  try {
    const payslips = await service.listMyPayslips(req.user.employee_id);
    res.json({ success: true, data: payslips });
  } catch (err) {
    next(err);
  }
}

export async function getMine(req, res, next) {
  try {
    const payslip = await service.getMyPayslip(req.params.id, req.user.employee_id);
    res.json({ success: true, data: payslip });
  } catch (err) {
    next(err);
  }
}

export async function pdf(req, res, next) {
  try {
    const payslip = await service.getPayslip(req.params.id);
    const buffer = await renderPayslipPdf(payslip);
    const filename = buildPdfFilename(payslip);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (err) {
    next(err);
  }
}

export async function myPdf(req, res, next) {
  try {
    const payslip = await service.getOwnedPayslip(req.params.id, req.user.employee_id);
    const buffer = await renderPayslipPdf(payslip);
    const filename = buildPdfFilename(payslip);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (err) {
    next(err);
  }
}
