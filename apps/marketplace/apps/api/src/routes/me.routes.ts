import { Router } from 'express';
import {
  AvailabilityReq,
  ArtisanOnboardingReq,
  RegisterPushTokenReq,
  SetRoleReq,
  UpdateMeReq,
} from '@artisan/shared';
import { prisma } from '@artisan/db';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { artisanService } from '../services/artisan.service.js';
import { storage } from '../adapters/storage.js';
import { nanoid } from 'nanoid';

export const meRouter = Router();
meRouter.use(authRequired);

meRouter.get('/', async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.sub },
    include: { customer: true, artisan: true },
  });
  const { passwordHash: _ph, ...safe } = user;
  res.json(safe);
});

meRouter.patch('/', validateBody(UpdateMeReq), async (req, res) => {
  const updated = await prisma.user.update({
    where: { id: req.user!.sub },
    data: req.body,
  });
  const { passwordHash: _ph, ...safe } = updated;
  res.json(safe);
});

meRouter.post('/role', validateBody(SetRoleReq), async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data: {
      role: req.body.role,
      ...(req.body.role === 'CUSTOMER'
        ? { customer: { upsert: { create: {}, update: {} } } }
        : { artisan: { upsert: { create: {}, update: {} } } }),
    },
    include: { customer: true, artisan: true },
  });
  const { passwordHash: _ph, ...safe } = user;
  res.json(safe);
});

meRouter.post('/avatar', async (req, res) => {
  const key = `avatars/${req.user!.sub}/${nanoid()}.jpg`;
  const presigned = await storage.presignPut(key, 'image/jpeg', 5_000_000);
  res.json({ ...presigned, publicUrl: storage.publicUrl(key) });
});

meRouter.post('/push-token', validateBody(RegisterPushTokenReq), async (req, res) => {
  await prisma.pushToken.upsert({
    where: { token: req.body.token },
    update: { userId: req.user!.sub, platform: req.body.platform },
    create: { userId: req.user!.sub, ...req.body },
  });
  res.json({ ok: true });
});

// ----- Artisan-only -----
meRouter.post(
  '/artisan/onboarding',
  requireRole('ARTISAN'),
  validateBody(ArtisanOnboardingReq),
  async (req, res) => {
    const { categoryIds, ...rest } = req.body;
    const profile = await prisma.artisanProfile.update({
      where: { userId: req.user!.sub },
      data: {
        ...rest,
        categories: {
          deleteMany: {},
          create: categoryIds.map((id: string) => ({ categoryId: id })),
        },
      },
      include: { categories: { include: { category: true } } },
    });
    res.json(profile);
  },
);

meRouter.patch(
  '/artisan/availability',
  requireRole('ARTISAN'),
  validateBody(AvailabilityReq),
  async (req, res) => {
    const profile = await artisanService.setAvailability(
      req.user!.sub,
      req.body.available,
      req.body.lat,
      req.body.lng,
    );
    res.json(profile);
  },
);

meRouter.post('/artisan/documents', requireRole('ARTISAN'), async (req, res) => {
  const kind = (req.body?.kind as string) ?? 'ID_FRONT';
  const key = `docs/${req.user!.sub}/${kind}/${nanoid()}.jpg`;
  const presigned = await storage.presignPut(key, 'image/jpeg', 10_000_000);
  await prisma.verificationDoc.create({
    data: { artisanId: req.user!.sub, kind: kind as never, s3Key: key },
  });
  res.json(presigned);
});
