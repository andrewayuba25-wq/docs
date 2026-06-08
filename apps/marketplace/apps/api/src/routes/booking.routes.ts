import { Router } from 'express';
import { BookingStatus, Role } from '@artisan/db';
import {
  CancelBookingReq,
  CreateBookingReq,
  RejectBookingReq,
  ReviewReq,
} from '@artisan/shared';
import { authRequired } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { bookingService } from '../services/booking.service.js';
import { push } from '../adapters/push.js';
import { prisma } from '@artisan/db';
import type { RealtimeBus } from '../realtime/bus.js';

export function makeBookingRouter(bus: RealtimeBus) {
  const r = Router();
  r.use(authRequired);

  async function notify(userId: string, title: string, body: string, data: Record<string, unknown>) {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length) await push.send({ to: tokens.map((t) => t.token), title, body, data });
  }

  r.post('/', validateBody(CreateBookingReq), async (req, res) => {
    const booking = await bookingService.create(req.user!.sub, req.body);
    bus.emitToUser(booking.artisanId, 'booking:new', booking);
    await notify(booking.artisanId, 'New booking request', booking.description.slice(0, 80), {
      bookingId: booking.id,
    });
    res.status(201).json(booking);
  });

  r.get('/', async (req, res) => {
    const role = (req.query.role === 'artisan' ? Role.ARTISAN : Role.CUSTOMER);
    const status = (req.query.status as BookingStatus | undefined) ?? undefined;
    const bookings = await bookingService.listForUser(req.user!.sub, role, status);
    res.json({ bookings });
  });

  r.get('/:id', async (req, res) => {
    const b = await bookingService.getById(req.params.id!, req.user!.sub);
    res.json(b);
  });

  const transitionRoute = (to: BookingStatus, schema?: typeof RejectBookingReq) =>
    async (req: import('express').Request, res: import('express').Response) => {
      const meta = schema?.parse(req.body) ?? {};
      const updated = await bookingService.transition(
        req.params.id!,
        to,
        req.user!.sub,
        req.user!.role,
        meta,
      );
      bus.emitToUser(updated.customerId, 'booking:status', updated);
      bus.emitToUser(updated.artisanId, 'booking:status', updated);
      const peer = req.user!.sub === updated.customerId ? updated.artisanId : updated.customerId;
      await notify(peer, 'Booking update', `Status: ${updated.status}`, { bookingId: updated.id });
      res.json(updated);
    };

  r.post('/:id/accept', transitionRoute('ACCEPTED'));
  r.post('/:id/reject', transitionRoute('REJECTED', RejectBookingReq));
  r.post('/:id/start', transitionRoute('EN_ROUTE'));
  r.post('/:id/in-progress', transitionRoute('IN_PROGRESS'));
  r.post('/:id/complete', transitionRoute('COMPLETED'));
  r.post('/:id/cancel', transitionRoute('CANCELLED', CancelBookingReq));

  r.post('/:id/review', validateBody(ReviewReq), async (req, res) => {
    const review = await bookingService.review(
      req.params.id!,
      req.user!.sub,
      req.body.rating,
      req.body.comment,
    );
    res.status(201).json(review);
  });

  return r;
}
