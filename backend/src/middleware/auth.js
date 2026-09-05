import { AppError } from '../shared/errors.js';

export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return next(new AppError(401, 'SESSION_INVALID', 'Authentication required'));
  }

  req.user = {
    id: req.session.userId,
    role: req.session.role,
    employee_id: req.session.employeeId || null,
  };

  return next();
}

