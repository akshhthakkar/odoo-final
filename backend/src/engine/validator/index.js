import { AppError } from '../../shared/errors.js';

export function validateRules() {
  throw new AppError(500, 'ENGINE_NOT_IMPLEMENTED', 'Rule-set validation lands in TASK-013 (05-PAYROLL-ENGINE-CONTRACT.md)');
}
