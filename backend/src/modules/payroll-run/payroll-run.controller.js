import * as service from './payroll-run.service.js';

export async function eligibility(req, res, next) {
  try {
    const flags = await service.getEligibility(req.validatedQuery ?? req.query);
    res.json({ success: true, data: flags });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const payrun = await service.createPayrun(req.body, req.user.id);
    res.status(201).json({ success: true, data: payrun });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const payruns = await service.listPayruns();
    res.json({ success: true, data: payruns });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const payrun = await service.getPayrun(req.params.id);
    res.json({ success: true, data: payrun });
  } catch (err) {
    next(err);
  }
}

export async function statusChange(req, res, next) {
  try {
    const result = await service.statusChange(req.params.id, req.body.action, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function dispatch(req, res, next) {
  try {
    const result = await service.dispatchPayrunPayslips(req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function deletePayrun(req, res, next) {
  try {
    const result = await service.deletePayrun(req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}


