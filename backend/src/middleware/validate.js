import { AppError } from '../shared/errors.js';

export const validateBody =
  (schema) =>
  (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid request body',
          parsed.error.flatten().fieldErrors
        )
      );
    }
    req.body = parsed.data;
    return next();
  };

export const validateQuery =
  (schema) =>
  (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid query parameters',
          parsed.error.flatten().fieldErrors
        )
      );
    }
    req.query = parsed.data;
    return next();
  };
