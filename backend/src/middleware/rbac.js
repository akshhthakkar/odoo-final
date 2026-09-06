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

export const requireSelfOrRole =
  (...roles) =>
  (req, res, next) => {
    const user = req.user;
    if (!user) {
      return next(new AppError(401, 'SESSION_INVALID', 'Authentication required'));
    }
    if (user.role === 'ADMIN' || roles.includes(user.role)) {
      return next();
    }
    // Allow if accessing self employee or user record
    if (user.employee_id && user.employee_id === req.params.id) {
      return next();
    }
    if (user.id && user.id === req.params.id) {
      return next();
    }
    return next(new AppError(403, 'FORBIDDEN', 'Insufficient role permissions for this resource'));
  };
