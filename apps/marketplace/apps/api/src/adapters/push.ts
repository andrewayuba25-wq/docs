import { logger } from '../lib/logger.js';

export type PushPayload = {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export interface PushAdapter {
  send(payload: PushPayload): Promise<void>;
}

class ExpoPushAdapter implements PushAdapter {
  async send(payload: PushPayload): Promise<void> {
    const tokens = Array.isArray(payload.to) ? payload.to : [payload.to];
    const messages = tokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
    }));
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!res.ok) logger.warn({ status: res.status }, 'Expo push API non-2xx');
    } catch (err) {
      logger.warn({ err }, 'Push send failed (non-fatal)');
    }
  }
}

export const push: PushAdapter = new ExpoPushAdapter();
