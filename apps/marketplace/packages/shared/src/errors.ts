export const ErrorCodes = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  BOOKING_INVALID_TRANSITION: 'BOOKING_INVALID_TRANSITION',
  ARTISAN_NOT_VERIFIED: 'ARTISAN_NOT_VERIFIED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export type ApiError = {
  error: { code: ErrorCode; message: string; details?: unknown };
};

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  unauthenticated: (msg = 'Authentication required') =>
    new AppError(ErrorCodes.UNAUTHENTICATED, msg, 401),
  forbidden: (msg = 'You do not have access to this resource') =>
    new AppError(ErrorCodes.FORBIDDEN, msg, 403),
  notFound: (entity = 'Resource') =>
    new AppError(ErrorCodes.NOT_FOUND, `${entity} not found`, 404),
  validation: (msg: string, details?: unknown) =>
    new AppError(ErrorCodes.VALIDATION, msg, 400, details),
  conflict: (msg: string) => new AppError(ErrorCodes.CONFLICT, msg, 409),
  rateLimited: (msg = 'Too many requests') =>
    new AppError(ErrorCodes.RATE_LIMITED, msg, 429),
  internal: (msg = 'Internal server error') =>
    new AppError(ErrorCodes.INTERNAL, msg, 500),
};
