import type { NextFunction, Request, Response } from 'express';
import { Errors } from '@artisan/shared';
import { verifyAccess, type AccessClaims } from '../lib/jwt.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessClaims;
  }
}

export function authRequired(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) throw Errors.unauthenticated();
  req.user = verifyAccess(header.slice(7));
  next();
}

export function requireRole(...roles: AccessClaims['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw Errors.unauthenticated();
    if (!roles.includes(req.user.role)) throw Errors.forbidden();
    next();
  };
}
