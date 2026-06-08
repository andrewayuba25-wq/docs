"""Booking state machine + lifecycle service."""
from __future__ import annotations

import secrets
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import (
    AppError,
    ErrorCode,
    conflict,
    forbidden,
    not_found,
    validation,
)
from app.models import (
    ArtisanProfile,
    Booking,
    BookingStatus,
    ChatThread,
    Review,
    Role,
)

ALLOWED: dict[BookingStatus, set[BookingStatus]] = {
    BookingStatus.REQUESTED: {BookingStatus.ACCEPTED, BookingStatus.REJECTED, BookingStatus.CANCELLED},
    BookingStatus.ACCEPTED: {BookingStatus.EN_ROUTE, BookingStatus.CANCELLED},
    BookingStatus.EN_ROUTE: {BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED},
    BookingStatus.IN_PROGRESS: {BookingStatus.COMPLETED, BookingStatus.CANCELLED},
    BookingStatus.REJECTED: set(),
    BookingStatus.COMPLETED: set(),
    BookingStatus.CANCELLED: set(),
}


def _new_id(prefix: str = "c") -> str:
    return prefix + secrets.token_hex(12)


async def create(
    db: AsyncSession,
    *,
    customer_id: str,
    artisan_id: str,
    category_id: str,
    description: str,
    address_text: str,
    address_lat: float,
    address_lng: float,
    scheduled_for: datetime | None,
    is_emergency: bool,
) -> Booking:
    artisan = await db.scalar(select(ArtisanProfile).where(ArtisanProfile.userId == artisan_id))
    if not artisan:
        raise not_found("Artisan")
    if artisan.verifiedAt is None:
        raise AppError(ErrorCode.ARTISAN_NOT_VERIFIED, "Artisan is not verified yet", 409)

    booking = Booking(
        id=_new_id(),
        customerId=customer_id,
        artisanId=artisan_id,
        categoryId=category_id,
        description=description,
        addressText=address_text,
        addressLat=address_lat,
        addressLng=address_lng,
        scheduledFor=scheduled_for,
        isEmergency=is_emergency,
        priceCents=artisan.baseRateCents,
    )
    db.add(booking)
    db.add(ChatThread(id=_new_id(), bookingId=booking.id))
    await db.flush()
    return booking


async def get_for_actor(db: AsyncSession, booking_id: str, actor_id: str) -> Booking:
    b = await db.scalar(select(Booking).where(Booking.id == booking_id))
    if not b:
        raise not_found("Booking")
    if actor_id not in (b.customerId, b.artisanId):
        raise forbidden()
    return b


CUSTOMER_TRANSITIONS = {BookingStatus.CANCELLED}
ARTISAN_TRANSITIONS = {
    BookingStatus.ACCEPTED,
    BookingStatus.REJECTED,
    BookingStatus.EN_ROUTE,
    BookingStatus.IN_PROGRESS,
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
}


async def transition(
    db: AsyncSession,
    booking_id: str,
    to: BookingStatus,
    actor_id: str,
    actor_role: Role,
    *,
    reason: str | None = None,
) -> Booking:
    b = await get_for_actor(db, booking_id, actor_id)

    permitted = ARTISAN_TRANSITIONS if actor_role == Role.ARTISAN else CUSTOMER_TRANSITIONS
    if to not in permitted:
        raise forbidden(f"Cannot transition to {to}")
    if to not in ALLOWED[b.status]:
        raise conflict(f"Cannot transition booking from {b.status} to {to}")

    now = datetime.now(UTC)
    b.status = to
    if to == BookingStatus.ACCEPTED:
        b.acceptedAt = now
    elif to == BookingStatus.IN_PROGRESS:
        b.startedAt = now
    elif to == BookingStatus.COMPLETED:
        b.completedAt = now
    elif to in (BookingStatus.CANCELLED, BookingStatus.REJECTED):
        b.cancelledAt = now
        b.cancelReason = reason
    return b


async def submit_review(
    db: AsyncSession,
    booking_id: str,
    reviewer_id: str,
    rating: int,
    comment: str | None,
) -> Review:
    b = await db.scalar(select(Booking).where(Booking.id == booking_id))
    if not b:
        raise not_found("Booking")
    if b.status != BookingStatus.COMPLETED:
        raise validation("Can only review completed bookings")
    if b.customerId != reviewer_id:
        raise forbidden()

    review = Review(
        id=_new_id(),
        bookingId=booking_id,
        reviewerId=reviewer_id,
        revieweeId=b.artisanId,
        rating=rating,
        comment=comment,
    )
    db.add(review)
    await db.flush()

    # Recompute rolling rating average for the artisan.
    avg = await db.scalar(select(func.avg(Review.rating)).where(Review.revieweeId == b.artisanId))
    count = await db.scalar(select(func.count(Review.id)).where(Review.revieweeId == b.artisanId))
    artisan = await db.get(ArtisanProfile, b.artisanId)
    if artisan:
        artisan.avgRating = float(avg or 0)
        artisan.ratingCount = int(count or 0)
        artisan.completedJobs = (artisan.completedJobs or 0) + 1
    return review
