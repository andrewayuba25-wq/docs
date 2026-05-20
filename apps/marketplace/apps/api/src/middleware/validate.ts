import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { Errors } from '@artisan/shared';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) throw Errors.validation('Invalid request body', result.error.flatten());
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) throw Errors.validation('Invalid query', result.error.flatten());
    req.query = result.data as unknown as Request['query'];
    next();
  };
}
