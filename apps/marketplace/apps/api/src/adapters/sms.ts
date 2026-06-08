import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

export interface SmsAdapter {
  sendOtp(phone: string, code: string): Promise<void>;
  verifyOtp(phone: string, code: string): Promise<boolean>;
}

class FakeSmsAdapter implements SmsAdapter {
  // In dev we don't actually send SMS — we log the code so devs can test the flow.
  // OTP storage/verification is delegated to OtpService (Redis or in-memory).
  async sendOtp(phone: string, code: string): Promise<void> {
    logger.info({ phone, code }, '[FakeSMS] OTP issued (dev only)');
  }
  async verifyOtp(): Promise<boolean> {
    // Verification handled by OtpService when using FakeSmsAdapter.
    return true;
  }
}

class TwilioVerifyAdapter implements SmsAdapter {
  async sendOtp(phone: string): Promise<void> {
    const url = `https://verify.twilio.com/v2/Services/${config.TWILIO_VERIFY_SID}/Verifications`;
    const auth = Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, Channel: 'sms' }),
    });
    if (!res.ok) {
      logger.error({ status: res.status, body: await res.text() }, 'Twilio Verify send failed');
      throw new Error('Failed to send OTP');
    }
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const url = `https://verify.twilio.com/v2/Services/${config.TWILIO_VERIFY_SID}/VerificationCheck`;
    const auth = Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, Code: code }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string };
    return data.status === 'approved';
  }
}

export const sms: SmsAdapter = config.TWILIO_FAKE
  ? new FakeSmsAdapter()
  : new TwilioVerifyAdapter();
