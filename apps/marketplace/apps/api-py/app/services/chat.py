"""Per-booking chat thread service."""
from __future__ import annotations

import secrets
from datetime import UTC, datetime

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import forbidden, not_found
from app.models import Booking, ChatMessage, ChatThread, MsgKind


def _new_id(prefix: str = "c") -> str:
    return prefix + secrets.token_hex(12)


async def assert_participant(db: AsyncSession, booking_id: str, user_id: str) -> Booking:
    b = await db.scalar(select(Booking).where(Booking.id == booking_id))
    if not b:
        raise not_found("Booking")
    if user_id not in (b.customerId, b.artisanId):
        raise forbidden()
    return b


async def list_messages(
    db: AsyncSession,
    booking_id: str,
    user_id: str,
    limit: int = 50,
    before: datetime | None = None,
) -> list[ChatMessage]:
    await assert_participant(db, booking_id, user_id)
    thread = await db.scalar(select(ChatThread).where(ChatThread.bookingId == booking_id))
    if not thread:
        return []
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.threadId == thread.id)
        .order_by(desc(ChatMessage.createdAt))
        .limit(limit)
    )
    if before:
        stmt = stmt.where(ChatMessage.createdAt < before)
    return list((await db.scalars(stmt)).all())


async def send_message(
    db: AsyncSession,
    booking_id: str,
    sender_id: str,
    body: str,
    kind: MsgKind = MsgKind.TEXT,
    s3_key: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> ChatMessage:
    await assert_participant(db, booking_id, sender_id)
    thread = await db.scalar(select(ChatThread).where(ChatThread.bookingId == booking_id))
    if not thread:
        thread = ChatThread(id=_new_id(), bookingId=booking_id)
        db.add(thread)
        await db.flush()
    msg = ChatMessage(
        id=_new_id(),
        threadId=thread.id,
        senderId=sender_id,
        body=body,
        kind=kind,
        s3Key=s3_key,
        lat=lat,
        lng=lng,
    )
    db.add(msg)
    thread.lastMsgAt = datetime.now(UTC)
    await db.flush()
    return msg
