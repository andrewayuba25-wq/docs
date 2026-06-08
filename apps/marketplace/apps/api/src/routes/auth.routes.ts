import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { OtpRequest, OtpVerify, RefreshTokenReq } from '@artisan/shared';
import { authService } from '../services/auth.service.js';
import { validateBody } from '../middleware/validate.js';

export const authRouter = Router();

const otpLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post('/otp/request', otpLimiter, validateBody(OtpRequest), async (req, res) => {
  await authService.requestOtp(req.body.phone);
  res.json({ ok: true });
});

authRouter.post('/otp/verify', otpLimiter, validateBody(OtpVerify), async (req, res) => {
  const result = await authService.verifyOtp(req.body.phone, req.body.code);
  res.json(result);
});

authRouter.post('/refresh', validateBody(RefreshTokenReq), async (req, res) => {
  const tokens = await authService.refresh(req.body.refreshToken);
  res.json(tokens);
});

authRouter.post('/logout', validateBody(RefreshTokenReq), async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.json({ ok: true });
});
