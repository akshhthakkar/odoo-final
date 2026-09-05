import * as service from './reports.service.js';

export async function metrics(req, res, next) {
  try {
    const data = await service.getDashboardMetrics(req.validatedQuery ?? req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
