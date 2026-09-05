import * as payrunsService from './payruns.service.js';

export async function listPayruns(req, res, next) {
  try {
    const { search, page, limit } = req.query;
    const result = await payrunsService.listPayruns({ search, page, limit });
    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPayrun(req, res, next) {
  try {
    const payrun = await payrunsService.getPayrunById(req.params.id);
    return res.status(200).json({
      success: true,
      data: payrun,
    });
  } catch (err) {
    next(err);
  }
}

export async function createPayrun(req, res, next) {
  try {
    const payrun = await payrunsService.createPayrun(req.body, req.user?.id);
    return res.status(201).json({
      success: true,
      data: payrun,
    });
  } catch (err) {
    next(err);
  }
}

export async function dispatchPayslips(req, res, next) {
  try {
    const result = await payrunsService.dispatchPayslips(req.params.id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
