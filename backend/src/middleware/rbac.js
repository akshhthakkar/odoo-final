import { AppError } from '../shared/errors.js';

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    const role = req.user?.role || req.session?.role;
    if (!role) {
      return next(new AppError(401, 'SESSION_INVALID', 'Authentication required'));
    }
    if (!roles.includes(role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient role permissions'));
    }
    return next();
  };

