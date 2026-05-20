"""Booking lifecycle routes."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body
from sqlalchemy import select

from app import schemas
from app.deps import Claims, Db
from app.models import Booking, BookingStatus, Role
from app.services import bookings as svc

router = APIRouter(prefix="/v1/bookings", tags=["bookings"])


@router.post("", response_model=schemas.BookingResp, status_code=201)
async def create(payload: schemas.CreateBookingReq, db: Db, claims: Claims) -> Booking:
    return await svc.create(
        db,
        customer_id=claims["sub"],
        artisan_id=payload.artisanId,
        category_id=payload.categoryId,
        description=payload.description,
        address_text=payload.addressText,
        address_lat=payload.addressLat,
        address_lng=payload.addressLng,
        scheduled_for=payload.scheduledFor,
        is_emergency=payload.isEmergency,
    )


@router.get("")
async def list_mine(
    db: Db, claims: Claims, role: str | None = None, status: str | None = None
) -> dict[str, list[dict[str, Any]]]:
    stmt = select(Booking)
    if role == "artisan":
        stmt = stmt.where(Booking.artisanId == claims["sub"])
    else:
        stmt = stmt.where(Booking.customerId == claims["sub"])
    if status:
        stmt = stmt.where(Booking.status == BookingStatus(status))
    stmt = stmt.order_by(Booking.createdAt.desc()).limit(50)
    bookings = (await db.scalars(stmt)).all()
    return {"bookings": [_to_dict(b) for b in bookings]}


@router.get("/{booking_id}")
async def get_one(booking_id: str, db: Db, claims: Claims) -> dict[str, Any]:
    b = await svc.get_for_actor(db, booking_id, claims["sub"])
    return _to_dict(b)


def _transition_route(target: BookingStatus, body_required: bool = False):
    async def handler(
        booking_id: str,
        db: Db,
        claims: Claims,
        payload: dict | None = Body(default=None),
    ) -> dict[str, Any]:
        reason = payload.get("reason") if isinstance(payload, dict) else None
        if body_required and not reason:
            from app.errors import validation

            raise validation("reason is required")
        b = await svc.transition(
            db, booking_id, target, claims["sub"], Role(claims["role"]), reason=reason
        )
        return _to_dict(b)

    return handler


router.post("/{booking_id}/accept")(_transition_route(BookingStatus.ACCEPTED))
router.post("/{booking_id}/reject")(_transition_route(BookingStatus.REJECTED, body_required=True))
router.post("/{booking_id}/start")(_transition_route(BookingStatus.EN_ROUTE))
router.post("/{booking_id}/in-progress")(_transition_route(BookingStatus.IN_PROGRESS))
router.post("/{booking_id}/complete")(_transition_route(BookingStatus.COMPLETED))
router.post("/{booking_id}/cancel")(_transition_route(BookingStatus.CANCELLED, body_required=True))


@router.post("/{booking_id}/review", status_code=201)
async def review(booking_id: str, payload: schemas.ReviewReq, db: Db, claims: Claims) -> dict[str, Any]:
    r = await svc.submit_review(db, booking_id, claims["sub"], payload.rating, payload.comment)
    return {"id": r.id, "rating": r.rating, "comment": r.comment, "createdAt": r.createdAt}


def _to_dict(b: Booking) -> dict[str, Any]:
    return {
        "id": b.id,
        "status": b.status.value if hasattr(b.status, "value") else b.status,
        "description": b.description,
        "addressText": b.addressText,
        "addressLat": b.addressLat,
        "addressLng": b.addressLng,
        "priceCents": b.priceCents,
        "isEmergency": b.isEmergency,
        "customerId": b.customerId,
        "artisanId": b.artisanId,
        "categoryId": b.categoryId,
        "scheduledFor": b.scheduledFor,
        "acceptedAt": b.acceptedAt,
        "startedAt": b.startedAt,
        "completedAt": b.completedAt,
        "cancelledAt": b.cancelledAt,
        "cancelReason": b.cancelReason,
        "createdAt": b.createdAt,
    }
