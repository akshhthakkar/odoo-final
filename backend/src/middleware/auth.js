import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing bearer token'));
  }
  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET);
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Access token expired'));
    }
    return next(new AppError(401, 'TOKEN_INVALID', 'Invalid access token'));
  }
}
