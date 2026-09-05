import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL';
  const message =
    status === 500 && env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  if (status >= 500) {
    logger.error(`[${req.id}]`, err);
  }

  res.status(status).json({
    success: false,
    error: { code, message, details: err.details || [] },
    meta: { request_id: req.id, timestamp: new Date().toISOString() },
  });
}
