import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from './config.js';
import { Errors } from '@artisan/shared';

export type AccessClaims = { sub: string; role: 'CUSTOMER' | 'ARTISAN' | 'ADMIN' };

export function signAccess(claims: AccessClaims): string {
  return jwt.sign(claims, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyAccess(token: string): AccessClaims {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as AccessClaims;
  } catch {
    throw Errors.unauthenticated('Invalid or expired access token');
  }
}

export type RefreshClaims = { sub: string; family: string };

export function signRefresh(claims: RefreshClaims): string {
  return jwt.sign(claims, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_TTL as SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyRefresh(token: string): RefreshClaims {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as RefreshClaims;
  } catch {
    throw Errors.unauthenticated('Invalid or expired refresh token');
  }
}
