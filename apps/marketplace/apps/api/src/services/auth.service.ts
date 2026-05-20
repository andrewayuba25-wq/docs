import crypto from 'node:crypto';
import { prisma, type User, Role } from '@artisan/db';
import { Errors } from '@artisan/shared';
import { signAccess, signRefresh, verifyRefresh } from '../lib/jwt.js';
import { otpService } from './otp.service.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function safeUser(u: User) {
  const { passwordHash, ...rest } = u;
  return rest;
}

export const authService = {
  async requestOtp(phone: string) {
    await otpService.request(phone);
  },

  async verifyOtp(phone: string, code: string) {
    const ok = await otpService.verify(phone, code);
    if (!ok) throw Errors.validation('Invalid OTP');

    let user = await prisma.user.findUnique({ where: { phone } });
    let isNew = false;
    if (!user) {
      user = await prisma.user.create({
        data: { phone, phoneVerifiedAt: new Date(), role: Role.CUSTOMER },
      });
      isNew = true;
    } else if (!user.phoneVerifiedAt) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerifiedAt: new Date() },
      });
    }

    const tokens = await this.issueTokens(user);
    return { user: safeUser(user), isNew, ...tokens };
  },

  async issueTokens(user: User) {
    const family = crypto.randomUUID();
    const accessToken = signAccess({ sub: user.id, role: user.role });
    const refreshToken = signRefresh({ sub: user.id, family });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        family,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    const claims = verifyRefresh(refreshToken);
    const tokenHash = hashToken(refreshToken);
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!record || record.revokedAt) {
      // Token reuse — revoke whole family.
      await prisma.refreshToken.updateMany({
        where: { family: claims.family },
        data: { revokedAt: new Date() },
      });
      throw Errors.unauthenticated('Refresh token reused; please sign in again');
    }
    if (record.expiresAt < new Date()) {
      throw Errors.unauthenticated('Refresh token expired');
    }
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: claims.sub } });
    return this.issueTokens(user);
  },

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  },
};
