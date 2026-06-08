import type { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccess } from '../lib/jwt.js';
import { chatService } from '../services/chat.service.js';
import { artisanService } from '../services/artisan.service.js';
import { logger } from '../lib/logger.js';

export class RealtimeBus {
  // Map of userId -> set of socket IDs so we can fan out events to a user's devices.
  private userSockets = new Map<string, Set<string>>();

  constructor(private io: SocketServer) {
    io.of('/realtime').use((socket, next) => {
      try {
        const token = (socket.handshake.auth?.token as string | undefined)
          ?? (socket.handshake.headers.authorization as string | undefined)?.slice(7);
        if (!token) return next(new Error('Unauthorized'));
        const claims = verifyAccess(token);
        (socket.data as { userId: string; role: string }).userId = claims.sub;
        (socket.data as { userId: string; role: string }).role = claims.role;
        next();
      } catch (err) {
        next(err as Error);
      }
    });

    io.of('/realtime').on('connection', (socket) => this.onConnect(socket));
  }

  private onConnect(socket: Socket) {
    const userId = socket.data.userId as string;
    if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set());
    this.userSockets.get(userId)!.add(socket.id);
    logger.debug({ userId, sid: socket.id }, 'socket connected');

    socket.on('chat:send', async (payload, ack) => {
      try {
        const msg = await chatService.sendMessage(
          payload.bookingId,
          userId,
          payload.body,
          payload.kind ?? 'TEXT',
          { s3Key: payload.s3Key, lat: payload.lat, lng: payload.lng },
        );
        const booking = await chatService.assertParticipant(payload.bookingId, userId);
        const peer = userId === booking.customerId ? booking.artisanId : booking.customerId;
        this.emitToUser(peer, 'chat:new', { bookingId: booking.id, message: msg });
        ack?.({ ok: true, message: msg });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('artisan:location', async ({ lat, lng }: { lat: number; lng: number }) => {
      if (socket.data.role !== 'ARTISAN') return;
      await artisanService.setAvailability(userId, true, lat, lng);
      // Active bookings can subscribe via a room to get live updates.
      this.io.of('/realtime').to(`artisan:${userId}`).emit('artisan:location', { userId, lat, lng });
    });

    socket.on('booking:subscribe', ({ bookingId }: { bookingId: string }) => {
      socket.join(`booking:${bookingId}`);
    });

    socket.on('disconnect', () => {
      this.userSockets.get(userId)?.delete(socket.id);
      logger.debug({ userId, sid: socket.id }, 'socket disconnected');
    });
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    const sids = this.userSockets.get(userId);
    if (!sids?.size) return;
    for (const sid of sids) {
      this.io.of('/realtime').to(sid).emit(event, payload);
    }
  }
}
