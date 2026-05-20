import type { ErrorRequestHandler } from 'express';
import { AppError, ErrorCodes, type ApiError } from '@artisan/shared';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    const body: ApiError = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.status).json(body);
    return;
  }
  logger.error({ err, path: req.path }, 'Unhandled error');
  const body: ApiError = {
    error: { code: ErrorCodes.INTERNAL, message: 'Internal server error' },
  };
  res.status(500).json(body);
};
