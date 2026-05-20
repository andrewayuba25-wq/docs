import { Router } from 'express';
import { prisma } from '@artisan/db';
import { authRequired, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(authRequired, requireRole('ADMIN'));

adminRouter.get('/users', async (req, res) => {
  const q = (req.query.q as string) || '';
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ phone: { contains: q } }, { fullName: { contains: q, mode: 'insensitive' } }] } : {},
    take: 100,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users: users.map(({ passwordHash: _ph, ...u }) => u) });
});

adminRouter.post('/users/:id/suspend', async (req, res) => {
  const u = await prisma.user.update({
    where: { id: req.params.id! },
    data: { status: 'SUSPENDED' },
  });
  res.json({ id: u.id, status: u.status });
});

adminRouter.post('/users/:id/reinstate', async (req, res) => {
  const u = await prisma.user.update({
    where: { id: req.params.id! },
    data: { status: 'ACTIVE' },
  });
  res.json({ id: u.id, status: u.status });
});

adminRouter.get('/verifications', async (_req, res) => {
  const docs = await prisma.verificationDoc.findMany({
    where: { status: 'PENDING' },
    include: { artisan: { include: { user: { select: { id: true, phone: true, fullName: true } } } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
  res.json({ docs });
});

adminRouter.post('/verifications/:docId/approve', async (req, res) => {
  const doc = await prisma.verificationDoc.update({
    where: { id: req.params.docId! },
    data: { status: 'APPROVED', reviewerId: req.user!.sub, reviewedAt: new Date() },
  });
  // If all required docs are approved, mark artisan as verified.
  const required = await prisma.verificationDoc.findMany({
    where: { artisanId: doc.artisanId, status: { not: 'REJECTED' } },
  });
  const kinds = new Set(required.map((d) => d.kind));
  if (kinds.has('ID_FRONT') && kinds.has('SELFIE')) {
    await prisma.artisanProfile.update({
      where: { userId: doc.artisanId },
      data: { verifiedAt: new Date() },
    });
  }
  res.json(doc);
});

adminRouter.post('/verifications/:docId/reject', async (req, res) => {
  const doc = await prisma.verificationDoc.update({
    where: { id: req.params.docId! },
    data: {
      status: 'REJECTED',
      reviewerId: req.user!.sub,
      reviewedAt: new Date(),
      notes: (req.body?.notes as string | undefined) ?? null,
    },
  });
  res.json(doc);
});

adminRouter.get('/reports', async (_req, res) => {
  const reports = await prisma.report.findMany({
    where: { status: { in: ['OPEN', 'REVIEWING'] } },
    include: {
      reporter: { select: { id: true, fullName: true, phone: true } },
      reported: { select: { id: true, fullName: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ reports });
});

adminRouter.get('/metrics', async (_req, res) => {
  const [users, artisans, bookings, completed] = await Promise.all([
    prisma.user.count(),
    prisma.artisanProfile.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: 'COMPLETED' } }),
  ]);
  res.json({ users, artisans, bookings, completed });
});

adminRouter.get('/categories', async (_req, res) => {
  const cats = await prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } });
  res.json({ categories: cats });
});

adminRouter.post('/categories', async (req, res) => {
  const cat = await prisma.serviceCategory.create({ data: req.body });
  res.status(201).json(cat);
});

adminRouter.patch('/categories/:id', async (req, res) => {
  const cat = await prisma.serviceCategory.update({
    where: { id: req.params.id! },
    data: req.body,
  });
  res.json(cat);
});
