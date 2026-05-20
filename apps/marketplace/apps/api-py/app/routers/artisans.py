"""Discovery — categories, search, profile detail, reviews, favorites."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select

from app import schemas
from app.deps import CurrentUser, Db, current_user
from app.errors import not_found
from app.models import (
    ArtisanCategory,
    ArtisanProfile,
    Favorite,
    Review,
    ServiceCategory,
    User,
)
from app.services import artisans as artisan_svc

router = APIRouter(prefix="/v1", tags=["discovery"])


@router.get("/categories", response_model=list[schemas.CategoryResp])
async def list_categories(db: Db) -> list[ServiceCategory]:
    rows = (
        await db.scalars(
            select(ServiceCategory).where(ServiceCategory.active.is_(True)).order_by(ServiceCategory.name)
        )
    ).all()
    return list(rows)


@router.get("/artisans/search", response_model=schemas.ArtisanListResp)
async def search(
    db: Db,
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radiusKm: float = Query(10, ge=0.1, le=50),
    category: str | None = None,
    minRating: float | None = Query(None, ge=0, le=5),
    maxPriceCents: int | None = Query(None, ge=0),
    availableNow: bool | None = None,
    sort: str = Query("distance", pattern="^(distance|rating|price)$"),
    limit: int = Query(20, ge=1, le=50),
) -> schemas.ArtisanListResp:
    results = await artisan_svc.search(
        db,
        lat=lat,
        lng=lng,
        radius_km=radiusKm,
        category=category,
        min_rating=minRating,
        max_price_cents=maxPriceCents,
        available_now=availableNow,
        sort=sort,
        limit=limit,
    )
    return schemas.ArtisanListResp(results=[schemas.ArtisanSearchResp.model_validate(r) for r in results])


@router.get("/artisans/{artisan_id}")
async def get_artisan(artisan_id: str, db: Db) -> dict[str, Any]:
    profile = await db.scalar(select(ArtisanProfile).where(ArtisanProfile.userId == artisan_id))
    if not profile:
        raise not_found("Artisan")
    user = await db.scalar(select(User).where(User.id == artisan_id))
    cats = (
        await db.execute(
            select(ServiceCategory)
            .join(ArtisanCategory, ArtisanCategory.categoryId == ServiceCategory.id)
            .where(ArtisanCategory.artisanId == artisan_id)
        )
    ).scalars().all()
    reviews = (
        await db.scalars(
            select(Review).where(Review.revieweeId == artisan_id).order_by(desc(Review.createdAt)).limit(10)
        )
    ).all()

    return {
        "profile": {
            "userId": profile.userId,
            "bio": profile.bio,
            "yearsExperience": profile.yearsExperience,
            "baseRateCents": profile.baseRateCents,
            "hourlyRateCents": profile.hourlyRateCents,
            "avgRating": profile.avgRating,
            "ratingCount": profile.ratingCount,
            "verifiedAt": profile.verifiedAt,
            "user": {
                "id": user.id if user else None,
                "fullName": user.fullName if user else None,
                "phone": user.phone if user else None,
                "avatarUrl": user.avatarUrl if user else None,
            },
            "categories": [
                {"category": {"id": c.id, "slug": c.slug, "name": c.name}} for c in cats
            ],
        },
        "recentReviews": [
            {
                "id": r.id,
                "rating": r.rating,
                "comment": r.comment,
                "createdAt": r.createdAt,
            }
            for r in reviews
        ],
    }


@router.post("/favorites/{artisan_id}")
async def add_favorite(artisan_id: str, db: Db, user: CurrentUser = Depends(current_user)) -> dict[str, bool]:
    existing = await db.scalar(
        select(Favorite).where(Favorite.userId == user.id, Favorite.artisanId == artisan_id)
    )
    if not existing:
        db.add(Favorite(userId=user.id, artisanId=artisan_id))
    return {"ok": True}


@router.delete("/favorites/{artisan_id}")
async def remove_favorite(artisan_id: str, db: Db, user: CurrentUser = Depends(current_user)) -> dict[str, bool]:
    fav = await db.scalar(
        select(Favorite).where(Favorite.userId == user.id, Favorite.artisanId == artisan_id)
    )
    if fav:
        await db.delete(fav)
    return {"ok": True}


@router.get("/favorites")
async def list_favorites(db: Db, user: CurrentUser = Depends(current_user)) -> dict[str, list[dict[str, Any]]]:
    rows = (
        await db.execute(
            select(Favorite, ArtisanProfile, User)
            .join(ArtisanProfile, ArtisanProfile.userId == Favorite.artisanId)
            .join(User, User.id == ArtisanProfile.userId)
            .where(Favorite.userId == user.id)
        )
    ).all()
    return {
        "favorites": [
            {
                "artisanId": ap.userId,
                "artisan": {
                    "avgRating": ap.avgRating,
                    "ratingCount": ap.ratingCount,
                    "user": {"id": u.id, "fullName": u.fullName, "avatarUrl": u.avatarUrl},
                },
            }
            for _f, ap, u in rows
        ]
    }
