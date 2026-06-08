"""Self-profile, role pick, artisan onboarding & availability, push tokens."""
from __future__ import annotations

import secrets
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select

from app import schemas
from app.adapters.storage import presign_put, public_url
from app.deps import CurrentUser, Db, require_role
from app.models import (
    ArtisanCategory,
    ArtisanProfile,
    CustomerProfile,
    PushToken,
    Role,
    VerificationDoc,
)
from app.services import artisans as artisan_svc

router = APIRouter(prefix="/v1/me", tags=["me"])


def _nid() -> str:
    return "c" + secrets.token_hex(12)


@router.get("")
async def me(user: CurrentUser, db: Db) -> dict[str, Any]:
    customer = await db.scalar(select(CustomerProfile).where(CustomerProfile.userId == user.id))
    artisan = await db.scalar(select(ArtisanProfile).where(ArtisanProfile.userId == user.id))
    return {
        "id": user.id,
        "phone": user.phone,
        "role": user.role.value,
        "fullName": user.fullName,
        "avatarUrl": user.avatarUrl,
        "status": user.status.value,
        "customer": (
            {"homeLat": customer.homeLat, "homeLng": customer.homeLng, "homeAddr": customer.homeAddr}
            if customer
            else None
        ),
        "artisan": (
            {
                "bio": artisan.bio,
                "available": artisan.available,
                "avgRating": artisan.avgRating,
                "ratingCount": artisan.ratingCount,
                "verifiedAt": artisan.verifiedAt,
                "baseRateCents": artisan.baseRateCents,
                "hourlyRateCents": artisan.hourlyRateCents,
            }
            if artisan
            else None
        ),
    }


@router.patch("")
async def update_me(payload: schemas.UpdateMeReq, user: CurrentUser, db: Db) -> dict[str, Any]:
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    await db.flush()
    return {"id": user.id, "fullName": user.fullName, "avatarUrl": user.avatarUrl, "email": user.email}


@router.post("/role")
async def set_role(payload: schemas.SetRoleReq, user: CurrentUser, db: Db) -> dict[str, Any]:
    user.role = Role(payload.role)
    if payload.role == "CUSTOMER":
        existing = await db.scalar(select(CustomerProfile).where(CustomerProfile.userId == user.id))
        if not existing:
            db.add(CustomerProfile(userId=user.id))
    else:
        existing = await db.scalar(select(ArtisanProfile).where(ArtisanProfile.userId == user.id))
        if not existing:
            db.add(ArtisanProfile(userId=user.id))
    await db.flush()
    return {"id": user.id, "role": user.role.value}


@router.post("/avatar")
async def avatar(user: CurrentUser) -> dict[str, str]:
    key = f"avatars/{user.id}/{_nid()}.jpg"
    p = presign_put(key, "image/jpeg")
    return {**p, "publicUrl": public_url(key)}


@router.post("/push-token")
async def push_token(payload: schemas.RegisterPushTokenReq, user: CurrentUser, db: Db) -> dict[str, bool]:
    existing = await db.scalar(select(PushToken).where(PushToken.token == payload.token))
    if existing:
        existing.userId = user.id
        existing.platform = payload.platform
    else:
        db.add(PushToken(id=_nid(), userId=user.id, token=payload.token, platform=payload.platform))
    return {"ok": True}


@router.post(
    "/artisan/onboarding",
    dependencies=[Depends(require_role("ARTISAN"))],
)
async def artisan_onboarding(
    payload: schemas.ArtisanOnboardingReq, user: CurrentUser, db: Db
) -> dict[str, Any]:
    profile = await db.scalar(select(ArtisanProfile).where(ArtisanProfile.userId == user.id))
    if not profile:
        profile = ArtisanProfile(userId=user.id)
        db.add(profile)
    profile.bio = payload.bio
    profile.yearsExperience = payload.yearsExperience
    profile.baseRateCents = payload.baseRateCents
    profile.hourlyRateCents = payload.hourlyRateCents

    # Replace categories.
    await db.execute(delete(ArtisanCategory).where(ArtisanCategory.artisanId == user.id))
    for cid in payload.categoryIds:
        db.add(ArtisanCategory(artisanId=user.id, categoryId=cid))
    await db.flush()
    return {"ok": True}


@router.patch(
    "/artisan/availability",
    dependencies=[Depends(require_role("ARTISAN"))],
)
async def availability(payload: schemas.AvailabilityReq, user: CurrentUser, db: Db) -> dict[str, bool]:
    await artisan_svc.set_availability(db, user.id, payload.available, payload.lat, payload.lng)
    return {"ok": True}


@router.post(
    "/artisan/documents",
    dependencies=[Depends(require_role("ARTISAN"))],
)
async def upload_document(kind: str, user: CurrentUser, db: Db) -> dict[str, str]:
    from app.models import DocKind  # local import to avoid cycle on enum

    safe_kind = DocKind(kind)
    key = f"docs/{user.id}/{safe_kind.value}/{_nid()}.jpg"
    p = presign_put(key, "image/jpeg", expires_seconds=600)
    db.add(VerificationDoc(id=_nid(), artisanId=user.id, kind=safe_kind, s3Key=key))
    return p
