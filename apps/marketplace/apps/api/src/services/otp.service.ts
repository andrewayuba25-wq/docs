import crypto from 'node:crypto';
import { Errors } from '@artisan/shared';
import { sms } from '../adapters/sms.js';
import { config } from '../lib/config.js';

type Record = { code: string; expiresAt: number; attempts: number };

// In-memory store keyed by phone. For production swap for Redis.
const store = new Map<string, Record>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 3;
const rate = new Map<string, number[]>();

function checkRate(phone: string) {
  const now = Date.now();
  const arr = (rate.get(phone) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) throw Errors.rateLimited('Too many OTP requests; try again shortly.');
  arr.push(now);
  rate.set(phone, arr);
}

export const otpService = {
  async request(phone: string): Promise<void> {
    checkRate(phone);
    if (config.TWILIO_FAKE) {
      const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
      store.set(phone, { code, expiresAt: Date.now() + 5 * 60_000, attempts: 0 });
      await sms.sendOtp(phone, code);
      return;
    }
    await sms.sendOtp(phone, '');
  },

  async verify(phone: string, code: string): Promise<boolean> {
    if (config.TWILIO_FAKE) {
      const rec = store.get(phone);
      if (!rec) throw Errors.validation('No OTP requested for this phone');
      if (Date.now() > rec.expiresAt) {
        store.delete(phone);
        throw Errors.validation('OTP expired; request a new one');
      }
      if (++rec.attempts > 5) {
        store.delete(phone);
        throw Errors.rateLimited('Too many attempts');
      }
      const ok = crypto.timingSafeEqual(Buffer.from(rec.code), Buffer.from(code));
      if (ok) store.delete(phone);
      return ok;
    }
    return sms.verifyOtp(phone, code);
  },
};
