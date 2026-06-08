"""Admin routes — only callable with role=ADMIN."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select

from app.deps import Claims, Db, require_role
from app.errors import not_found
from app.models import (
    ArtisanProfile,
    Booking,
    BookingStatus,
    DocStatus,
    Report,
    ReportStatus,
    ServiceCategory,
    User,
    UserStatus,
    VerificationDoc,
)

router = APIRouter(
    prefix="/v1/admin",
    tags=["admin"],
    dependencies=[Depends(require_role("ADMIN"))],
)


@router.get("/metrics")
async def metrics(db: Db) -> dict[str, int]:
    users = await db.scalar(select(func.count(User.id))) or 0
    artisans = await db.scalar(select(func.count(ArtisanProfile.userId))) or 0
    bookings = await db.scalar(select(func.count(Booking.id))) or 0
    completed = (
        await db.scalar(select(func.count(Booking.id)).where(Booking.status == BookingStatus.COMPLETED))
    ) or 0
    return {"users": users, "artisans": artisans, "bookings": bookings, "completed": completed}


@router.get("/users")
async def list_users(db: Db, q: str = "") -> dict[str, list[dict[str, Any]]]:
    stmt = select(User).order_by(User.createdAt.desc()).limit(100)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(User.phone.ilike(like), User.fullName.ilike(like)))
    rows = (await db.scalars(stmt)).all()
    return {
        "users": [
            {
                "id": u.id,
                "phone": u.phone,
                "fullName": u.fullName,
                "role": u.role.value,
                "status": u.status.value,
                "createdAt": u.createdAt,
            }
            for u in rows
        ]
    }


@router.post("/users/{user_id}/suspend")
async def suspend(user_id: str, db: Db) -> dict[str, str]:
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise not_found("User")
    user.status = UserStatus.SUSPENDED
    return {"id": user.id, "status": user.status.value}


@router.post("/users/{user_id}/reinstate")
async def reinstate(user_id: str, db: Db) -> dict[str, str]:
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise not_found("User")
    user.status = UserStatus.ACTIVE
    return {"id": user.id, "status": user.status.value}


@router.get("/verifications")
async def verifications(db: Db) -> dict[str, list[dict[str, Any]]]:
    rows = (
        await db.execute(
            select(VerificationDoc, User)
            .join(ArtisanProfile, ArtisanProfile.userId == VerificationDoc.artisanId)
            .join(User, User.id == ArtisanProfile.userId)
            .where(VerificationDoc.status == DocStatus.PENDING)
            .order_by(VerificationDoc.createdAt.asc())
            .limit(100)
        )
    ).all()
    return {
        "docs": [
            {
                "id": doc.id,
                "kind": doc.kind.value,
                "status": doc.status.value,
                "s3Key": doc.s3Key,
                "artisan": {
                    "user": {"id": user.id, "phone": user.phone, "fullName": user.fullName},
                },
            }
            for doc, user in rows
        ]
    }


@router.post("/verifications/{doc_id}/approve")
async def approve_doc(doc_id: str, db: Db, claims: Claims) -> dict[str, Any]:
    doc = await db.scalar(select(VerificationDoc).where(VerificationDoc.id == doc_id))
    if not doc:
        raise not_found("Document")
    doc.status = DocStatus.APPROVED
    doc.reviewerId = claims["sub"]
    doc.reviewedAt = datetime.utcnow()

    # If ID_FRONT + SELFIE are approved, flip the artisan to verified.
    kinds = {
        d.kind
        for d in (
            await db.scalars(
                select(VerificationDoc).where(
                    VerificationDoc.artisanId == doc.artisanId,
                    VerificationDoc.status == DocStatus.APPROVED,
                )
            )
        ).all()
    }
    if "ID_FRONT" in {k.value for k in kinds} and "SELFIE" in {k.value for k in kinds}:
        ap = await db.get(ArtisanProfile, doc.artisanId)
        if ap and ap.verifiedAt is None:
            ap.verifiedAt = datetime.utcnow()
    return {"id": doc.id, "status": doc.status.value}


@router.post("/verifications/{doc_id}/reject")
async def reject_doc(doc_id: str, db: Db, claims: Claims, notes: str | None = None) -> dict[str, Any]:
    doc = await db.scalar(select(VerificationDoc).where(VerificationDoc.id == doc_id))
    if not doc:
        raise not_found("Document")
    doc.status = DocStatus.REJECTED
    doc.reviewerId = claims["sub"]
    doc.reviewedAt = datetime.utcnow()
    doc.notes = notes
    return {"id": doc.id, "status": doc.status.value}


@router.get("/reports")
async def list_reports(db: Db) -> dict[str, list[dict[str, Any]]]:
    rows = (
        await db.scalars(
            select(Report)
            .where(Report.status.in_([ReportStatus.OPEN, ReportStatus.REVIEWING]))
            .order_by(Report.createdAt.desc())
            .limit(100)
        )
    ).all()
    return {
        "reports": [
            {
                "id": r.id,
                "reporterId": r.reporterId,
                "reportedId": r.reportedId,
                "reason": r.reason,
                "status": r.status.value,
                "createdAt": r.createdAt,
            }
            for r in rows
        ]
    }


@router.get("/categories")
async def list_categories(db: Db) -> dict[str, list[dict[str, Any]]]:
    rows = (
        await db.scalars(select(ServiceCategory).order_by(ServiceCategory.name))
    ).all()
    return {
        "categories": [
            {"id": c.id, "slug": c.slug, "name": c.name, "iconKey": c.iconKey, "active": c.active}
            for c in rows
        ]
    }
