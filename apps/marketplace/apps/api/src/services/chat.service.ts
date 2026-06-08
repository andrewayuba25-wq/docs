import { prisma, MsgKind } from '@artisan/db';
import { Errors } from '@artisan/shared';

export const chatService = {
  async assertParticipant(bookingId: string, userId: string) {
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw Errors.notFound('Booking');
    if (b.customerId !== userId && b.artisanId !== userId) throw Errors.forbidden();
    return b;
  },

  async listMessages(bookingId: string, userId: string, limit = 50, before?: string) {
    await this.assertParticipant(bookingId, userId);
    const thread = await prisma.chatThread.findUnique({ where: { bookingId } });
    if (!thread) return [];
    return prisma.chatMessage.findMany({
      where: { threadId: thread.id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async sendMessage(
    bookingId: string,
    senderId: string,
    body: string,
    kind: MsgKind = MsgKind.TEXT,
    extras: { s3Key?: string; lat?: number; lng?: number } = {},
  ) {
    await this.assertParticipant(bookingId, senderId);
    const thread = await prisma.chatThread.upsert({
      where: { bookingId },
      update: {},
      create: { bookingId },
    });
    const msg = await prisma.chatMessage.create({
      data: { threadId: thread.id, senderId, body, kind, ...extras },
    });
    await prisma.chatThread.update({
      where: { id: thread.id },
      data: { lastMsgAt: msg.createdAt },
    });
    return msg;
  },
};
