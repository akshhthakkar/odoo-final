export class AppError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  TOKEN_EXPIRED: 401,
  TOKEN_INVALID: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  STATE_ERROR: 409,
  CONTRACT_OVERLAP: 409,
  INSUFFICIENT_BALANCE: 409,
  DUPLICATE: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  ENGINE_RULE_ERROR: 422,
};
