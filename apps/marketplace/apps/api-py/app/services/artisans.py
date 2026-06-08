"""Artisan discovery — PostGIS ST_DWithin + ST_Distance for nearby search."""
from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def search(
    db: AsyncSession,
    *,
    lat: float,
    lng: float,
    radius_km: float = 10,
    category: str | None = None,
    min_rating: float | None = None,
    max_price_cents: int | None = None,
    available_now: bool | None = None,
    sort: str = "distance",
    limit: int = 20,
) -> list[dict[str, Any]]:
    radius_m = int(radius_km * 1000)
    order_clause = {
        "rating": 'a."avgRating" DESC, dist_m ASC',
        "price": 'a."baseRateCents" ASC, dist_m ASC',
    }.get(sort, "dist_m ASC")

    sql = f"""
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
          ST_Distance(a.geo, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS dist_m
        FROM "ArtisanProfile" a
        JOIN "User" u ON u.id = a."userId"
        {'JOIN "ArtisanCategory" ac ON ac."artisanId" = a."userId" '
         'JOIN "ServiceCategory" c ON c.id = ac."categoryId" AND c.slug = :category'
         if category else ''}
        WHERE u.status = 'ACTIVE'
          AND a.geo IS NOT NULL
          AND ST_DWithin(a.geo, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)
          {'AND a.available = TRUE' if available_now else ''}
          {'AND a."avgRating" >= :min_rating' if min_rating is not None else ''}
          {'AND a."baseRateCents" <= :max_price' if max_price_cents is not None else ''}
        ORDER BY {order_clause}
        LIMIT :limit
    """

    params: dict[str, Any] = {
        "lat": lat,
        "lng": lng,
        "radius_m": radius_m,
        "limit": limit,
    }
    if category:
        params["category"] = category
    if min_rating is not None:
        params["min_rating"] = min_rating
    if max_price_cents is not None:
        params["max_price"] = max_price_cents

    rows = (await db.execute(text(sql), params)).mappings().all()
    artisan_ids = [r["user_id"] for r in rows]

    cats_by_artisan: dict[str, list[dict[str, str]]] = {}
    if artisan_ids:
        cat_rows = (
            await db.execute(
                text(
                    """
                    SELECT ac."artisanId" AS aid, c.id, c.slug, c.name, c."iconKey" AS "iconKey",
                           c.active
                      FROM "ArtisanCategory" ac
                      JOIN "ServiceCategory" c ON c.id = ac."categoryId"
                     WHERE ac."artisanId" = ANY(:ids)
                    """
                ),
                {"ids": artisan_ids},
            )
        ).mappings().all()
        for cr in cat_rows:
            cats_by_artisan.setdefault(cr["aid"], []).append(
                {
                    "id": cr["id"],
                    "slug": cr["slug"],
                    "name": cr["name"],
                    "iconKey": cr["iconKey"],
                    "active": cr["active"],
                }
            )

    return [
        {
            "id": r["user_id"],
            "fullName": r["full_name"],
            "avatarUrl": r["avatar_url"],
            "bio": r["bio"],
            "avgRating": float(r["avg_rating"]),
            "ratingCount": int(r["rating_count"]),
            "completedJobs": int(r["completed_jobs"]),
            "baseRateCents": int(r["base_rate_cents"]),
            "hourlyRateCents": int(r["hourly_rate_cents"]),
            "available": bool(r["available"]),
            "verified": r["verified_at"] is not None,
            "distanceKm": float(r["dist_m"]) / 1000,
            "currentLat": r["current_lat"],
            "currentLng": r["current_lng"],
            "categories": cats_by_artisan.get(r["user_id"], []),
        }
        for r in rows
    ]


async def set_availability(
    db: AsyncSession,
    user_id: str,
    available: bool,
    lat: float | None,
    lng: float | None,
) -> None:
    # The PostGIS trigger keeps geo in sync with currentLat/currentLng.
    await db.execute(
        text(
            """
            UPDATE "ArtisanProfile"
               SET available = :available,
                   "currentLat" = COALESCE(:lat, "currentLat"),
                   "currentLng" = COALESCE(:lng, "currentLng")
             WHERE "userId" = :uid
            """
        ),
        {"available": available, "lat": lat, "lng": lng, "uid": user_id},
    )
