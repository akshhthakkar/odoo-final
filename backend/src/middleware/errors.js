import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';
import { Prisma } from '@prisma/client';

export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

// Map known Prisma/PostgreSQL failures to safe API errors so constraint
// violations never leak ConnectorError details, constraint names, or rows.
// Unknown infrastructure errors stay 500 (message always masked).
function mapKnownError(err) {
  // Express / body-parser malformed JSON SyntaxError handling (A-15)
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    (err.type === 'entity.parse.failed' || 'body' in err)
  ) {
    return new AppError(400, 'VALIDATION_ERROR', 'Invalid JSON request body');
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return new AppError(409, 'DUPLICATE', 'Resource already exists');
      case 'P2025':
        return new AppError(404, 'NOT_FOUND', 'Resource not found');
      case 'P2023':
        return new AppError(400, 'VALIDATION_ERROR', 'Invalid identifier format');
      case 'P2010':
        return new AppError(400, 'VALIDATION_ERROR', 'Invalid data: value violates a database constraint');
      default:
        return null;
    }
  }
  // PostgreSQL CHECK violations can surface wrapped in ConnectorError messages.
  const message = String(err?.message || '');
  if (message.includes('23514') || /violates (check|foreign key|not-null|exclusion) constraint/i.test(message)) {
    return new AppError(400, 'VALIDATION_ERROR', 'Invalid data: value violates a database constraint');
  }
  return null;
}

export function errorHandler(err, req, res, next) {
  const mapped = mapKnownError(err);
  if (mapped) err = mapped;

  const status = err.status || 500;
  const code = err.code || 'INTERNAL';
  // 500 messages are never sent to clients (dev or prod) - internals go to logs only.
  const message = status === 500 ? 'Internal server error' : err.message;

  if (status >= 500) {
    logger.error(`[${req.id}]`, err);
  }

  res.status(status).json({
    success: false,
    error: { code, message, details: err.details || [] },
    meta: { request_id: req.id, timestamp: new Date().toISOString() },
  });
}
