import { prisma, BookingStatus, Role } from '@artisan/db';
import { ErrorCodes, Errors } from '@artisan/shared';

// Allowed status transitions per role. The booking state machine is the
// single source of truth for what each side can do at each step.
const ALLOWED: Record<BookingStatus, BookingStatus[]> = {
  REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};

function assertTransition(from: BookingStatus, to: BookingStatus) {
  if (!ALLOWED[from].includes(to)) {
    throw new (class extends Error {})(
      `Cannot transition booking from ${from} to ${to}`,
    ) as unknown as Error;
  }
}

export const bookingService = {
  async create(
    customerId: string,
    input: {
      artisanId: string;
      categoryId: string;
      description: string;
      addressText: string;
      addressLat: number;
      addressLng: number;
      scheduledFor?: string;
      isEmergency: boolean;
    },
  ) {
    const artisan = await prisma.artisanProfile.findUnique({
      where: { userId: input.artisanId },
      include: { user: true },
    });
    if (!artisan) throw Errors.notFound('Artisan');
    if (!artisan.verifiedAt) {
      throw new (class extends Error {
        code = ErrorCodes.ARTISAN_NOT_VERIFIED;
        status = 409;
      })('Artisan is not verified yet');
    }

    return prisma.booking.create({
      data: {
        customerId,
        artisanId: input.artisanId,
        categoryId: input.categoryId,
        description: input.description,
        addressText: input.addressText,
        addressLat: input.addressLat,
        addressLng: input.addressLng,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        isEmergency: input.isEmergency,
        priceCents: artisan.baseRateCents,
        chatThread: { create: {} },
      },
      include: { chatThread: true, category: true },
    });
  },

  async listForUser(userId: string, role: Role, status?: BookingStatus) {
    return prisma.booking.findMany({
      where: {
        ...(role === Role.ARTISAN ? { artisanId: userId } : { customerId: userId }),
        ...(status ? { status } : {}),
      },
      include: { category: true, artisan: { include: { user: true } }, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async getById(id: string, userId: string) {
    const b = await prisma.booking.findUnique({
      where: { id },
      include: {
        category: true,
        artisan: { include: { user: true } },
        customer: true,
        chatThread: true,
        review: true,
      },
    });
    if (!b) throw Errors.notFound('Booking');
    if (b.customerId !== userId && b.artisanId !== userId) throw Errors.forbidden();
    return b;
  },

  async transition(
    id: string,
    to: BookingStatus,
    actorId: string,
    actorRole: Role,
    meta: { reason?: string } = {},
  ) {
    const b = await prisma.booking.findUnique({ where: { id } });
    if (!b) throw Errors.notFound('Booking');
    if (b.customerId !== actorId && b.artisanId !== actorId) throw Errors.forbidden();

    // Restrict who can move to what.
    const customerCan: BookingStatus[] = ['CANCELLED'];
    const artisanCan: BookingStatus[] = ['ACCEPTED', 'REJECTED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    const permitted = actorRole === Role.ARTISAN ? artisanCan : customerCan;
    if (!permitted.includes(to)) throw Errors.forbidden(`Cannot transition to ${to}`);

    assertTransition(b.status, to);

    const now = new Date();
    return prisma.booking.update({
      where: { id },
      data: {
        status: to,
        acceptedAt: to === 'ACCEPTED' ? now : b.acceptedAt,
        startedAt: to === 'IN_PROGRESS' ? now : b.startedAt,
        completedAt: to === 'COMPLETED' ? now : b.completedAt,
        cancelledAt: to === 'CANCELLED' || to === 'REJECTED' ? now : b.cancelledAt,
        cancelReason: meta.reason ?? b.cancelReason,
      },
    });
  },

  async review(bookingId: string, reviewerId: string, rating: number, comment?: string) {
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw Errors.notFound('Booking');
    if (b.status !== 'COMPLETED') throw Errors.validation('Can only review completed bookings');
    if (b.customerId !== reviewerId) throw Errors.forbidden();

    const review = await prisma.review.create({
      data: { bookingId, reviewerId, revieweeId: b.artisanId, rating, comment },
    });

    // Rebuild rolling rating average.
    const agg = await prisma.review.aggregate({
      where: { revieweeId: b.artisanId },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.artisanProfile.update({
      where: { userId: b.artisanId },
      data: {
        avgRating: agg._avg.rating ?? 0,
        ratingCount: agg._count,
        completedJobs: { increment: 1 },
      },
    });
    return review;
  },
};
