import * as service from './payslip.service.js';

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
