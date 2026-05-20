import { Router } from 'express';
import { SendMessageReq } from '@artisan/shared';
import { authRequired } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { chatService } from '../services/chat.service.js';
import type { RealtimeBus } from '../realtime/bus.js';

export function makeChatRouter(bus: RealtimeBus) {
  const r = Router();
  r.use(authRequired);

  r.get('/:bookingId/messages', async (req, res) => {
    const messages = await chatService.listMessages(
      req.params.bookingId!,
      req.user!.sub,
      Number(req.query.limit ?? 50),
      typeof req.query.before === 'string' ? req.query.before : undefined,
    );
    res.json({ messages });
  });

  r.post('/:bookingId/messages', validateBody(SendMessageReq), async (req, res) => {
    const msg = await chatService.sendMessage(
      req.params.bookingId!,
      req.user!.sub,
      req.body.body,
      req.body.kind,
      { s3Key: req.body.s3Key, lat: req.body.lat, lng: req.body.lng },
    );
    const booking = await chatService.assertParticipant(req.params.bookingId!, req.user!.sub);
    const peer = req.user!.sub === booking.customerId ? booking.artisanId : booking.customerId;
    bus.emitToUser(peer, 'chat:new', { bookingId: booking.id, message: msg });
    res.status(201).json(msg);
  });

  return r;
}
