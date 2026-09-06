import * as auditService from './audit.service.js';

export async function listAuditLogs(req, res, next) {
  try {
    const { action, entity, actor_id, search, start_date, end_date, page, limit } = req.query;

    const result = await auditService.listAuditLogs({
      action,
      entity,
      actor_id,
      search,
      start_date,
      end_date,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
}
