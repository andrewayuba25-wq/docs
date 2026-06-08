import { Router } from 'express';
import { prisma } from '@artisan/db';
import { SearchArtisansReq } from '@artisan/shared';
import { authRequired } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { artisanService } from '../services/artisan.service.js';

export const artisanRouter = Router();

artisanRouter.get('/categories', async (_req, res) => {
  const cats = await prisma.serviceCategory.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
  res.json(cats);
});

artisanRouter.get('/artisans/search', validateQuery(SearchArtisansReq), async (req, res) => {
  const results = await artisanService.search(req.query as unknown as Parameters<typeof artisanService.search>[0]);
  res.json({ results });
});

artisanRouter.get('/artisans/:id', async (req, res) => {
  const data = await artisanService.getById(req.params.id!);
  res.json(data);
});

artisanRouter.get('/artisans/:id/reviews', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { revieweeId: req.params.id! },
    include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ reviews });
});

// Favorites require auth.
artisanRouter.post('/favorites/:artisanId', authRequired, async (req, res) => {
  await prisma.favorite.upsert({
    where: {
      userId_artisanId: { userId: req.user!.sub, artisanId: req.params.artisanId! },
    },
    update: {},
    create: { userId: req.user!.sub, artisanId: req.params.artisanId! },
  });
  res.json({ ok: true });
});

artisanRouter.delete('/favorites/:artisanId', authRequired, async (req, res) => {
  await prisma.favorite
    .delete({
      where: {
        userId_artisanId: { userId: req.user!.sub, artisanId: req.params.artisanId! },
      },
    })
    .catch(() => {});
  res.json({ ok: true });
});

artisanRouter.get('/favorites', authRequired, async (req, res) => {
  const favs = await prisma.favorite.findMany({
    where: { userId: req.user!.sub },
    include: { artisan: { include: { user: true } } },
  });
  res.json({ favorites: favs });
});
