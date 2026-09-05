import { AppError } from '../shared/errors.js';

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return next(new AppError(401, 'SESSION_INVALID', 'Authentication required'));
    }
    // ADMIN has universal administrative access across management routes
    if (role === 'ADMIN' || roles.includes(role)) {
      return next();
    }
    return next(new AppError(403, 'FORBIDDEN', 'Insufficient role permissions for this resource'));
  };
