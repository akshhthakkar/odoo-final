import { AppError } from '../shared/errors.js';

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient role'));
    }
    return next();
  };
