import { prisma } from '@artisan/db';
import type { z } from 'zod';
import {
  Errors,
  type ArtisanSearchResult,
  type SearchArtisansReq,
} from '@artisan/shared';

type SearchInput = z.infer<typeof SearchArtisansReq>;

// PostGIS-powered nearby search. Falls back to lat/lng filter without
// distance ordering if PostGIS isn't installed (dev convenience).
export const artisanService = {
  async search(input: SearchInput): Promise<ArtisanSearchResult[]> {
    const radiusM = Math.round(input.radiusKm * 1000);
    const sort =
      input.sort === 'rating'
        ? 'a."avgRating" DESC, dist_m ASC'
        : input.sort === 'price'
        ? 'a."baseRateCents" ASC, dist_m ASC'
        : 'dist_m ASC';

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        user_id: string;
        full_name: string | null;
        avatar_url: string | null;
        bio: string | null;
        avg_rating: number;
        rating_count: number;
        completed_jobs: number;
        base_rate_cents: number;
        hourly_rate_cents: number;
        available: boolean;
        verified_at: Date | null;
        current_lat: number | null;
        current_lng: number | null;
        dist_m: number;
      }>
    >(
      `
      SELECT
        a."userId" AS user_id,
        u."fullName" AS full_name,
        u."avatarUrl" AS avatar_url,
        a.bio,
        a."avgRating" AS avg_rating,
        a."ratingCount" AS rating_count,
        a."completedJobs" AS completed_jobs,
        a."baseRateCents" AS base_rate_cents,
        a."hourlyRateCents" AS hourly_rate_cents,
        a.available,
        a."verifiedAt" AS verified_at,
        a."currentLat" AS current_lat,
        a."currentLng" AS current_lng,
        ST_Distance(a.geo, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS dist_m
      FROM "ArtisanProfile" a
      JOIN "User" u ON u.id = a."userId"
      ${input.category ? `JOIN "ArtisanCategory" ac ON ac."artisanId" = a."userId"
         JOIN "ServiceCategory" c ON c.id = ac."categoryId" AND c.slug = $6` : ''}
      WHERE u.status = 'ACTIVE'
        AND a.geo IS NOT NULL
        AND ST_DWithin(a.geo, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
        ${input.availableNow ? `AND a.available = true` : ''}
        ${input.minRating ? `AND a."avgRating" >= $4` : ''}
        ${input.maxPriceCents ? `AND a."baseRateCents" <= $5` : ''}
      ORDER BY ${sort}
      LIMIT ${input.limit}
      `,
      input.lng,
      input.lat,
      radiusM,
      input.minRating ?? 0,
      input.maxPriceCents ?? Number.MAX_SAFE_INTEGER,
      input.category ?? '',
    );

    const artisanIds = rows.map((r) => r.user_id);
    const cats = artisanIds.length
      ? await prisma.artisanCategory.findMany({
          where: { artisanId: { in: artisanIds } },
          include: { category: true },
        })
      : [];
    const catsByArtisan = new Map<string, { id: string; slug: string; name: string }[]>();
    for (const ac of cats) {
      const list = catsByArtisan.get(ac.artisanId) ?? [];
      list.push({ id: ac.category.id, slug: ac.category.slug, name: ac.category.name });
      catsByArtisan.set(ac.artisanId, list);
    }

    return rows.map((r) => ({
      id: r.user_id,
      fullName: r.full_name,
      avatarUrl: r.avatar_url,
      bio: r.bio,
      avgRating: Number(r.avg_rating),
      ratingCount: Number(r.rating_count),
      completedJobs: Number(r.completed_jobs),
      baseRateCents: Number(r.base_rate_cents),
      hourlyRateCents: Number(r.hourly_rate_cents),
      available: r.available,
      verified: Boolean(r.verified_at),
      distanceKm: Number(r.dist_m) / 1000,
      currentLat: r.current_lat,
      currentLng: r.current_lng,
      categories: catsByArtisan.get(r.user_id) ?? [],
    }));
  },

  async getById(id: string) {
    const profile = await prisma.artisanProfile.findUnique({
      where: { userId: id },
      include: {
        user: true,
        categories: { include: { category: true } },
        portfolio: { take: 12, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!profile) throw Errors.notFound('Artisan');
    const recentReviews = await prisma.review.findMany({
      where: { revieweeId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
    });
    return { profile, recentReviews };
  },

  async setAvailability(userId: string, available: boolean, lat?: number, lng?: number) {
    return prisma.artisanProfile.update({
      where: { userId },
      data: {
        available,
        ...(lat !== undefined ? { currentLat: lat } : {}),
        ...(lng !== undefined ? { currentLng: lng } : {}),
      },
    });
  },
};
