"""Auth service: phone OTP -> JWT access + rotating refresh with family detection."""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.errors import unauthenticated, validation
from app.models import RefreshToken, Role, User
from app.security import sign_access, sign_refresh, verify_refresh
from app.services import otp as otp_svc


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _new_id() -> str:
    # Prisma uses cuid; we use a short prefixed UUID4 for parity.
    return "c" + secrets.token_hex(12)


async def request_otp(phone: str) -> None:
    await otp_svc.request_otp(phone)


async def verify_otp(
    db: AsyncSession, phone: str, code: str
) -> tuple[User, bool, str, str]:
    ok = await otp_svc.verify_otp(phone, code)
    if not ok:
        raise validation("Invalid OTP")

    user = (await db.scalars(select(User).where(User.phone == phone))).first()
    is_new = False
    if user is None:
        user = User(
            id=_new_id(),
            phone=phone,
            phoneVerifiedAt=datetime.now(UTC),
            role=Role.CUSTOMER,
        )
        db.add(user)
        await db.flush()
        is_new = True
    elif user.phoneVerifiedAt is None:
        user.phoneVerifiedAt = datetime.now(UTC)

    access, refresh = await issue_tokens(db, user)
    return user, is_new, access, refresh


async def issue_tokens(db: AsyncSession, user: User) -> tuple[str, str]:
    family = uuid.uuid4().hex
    access = sign_access(sub=user.id, role=user.role)
    refresh = sign_refresh(sub=user.id, family=family)
    db.add(
        RefreshToken(
            id=_new_id(),
            userId=user.id,
            tokenHash=_hash(refresh),
            family=family,
            expiresAt=datetime.now(UTC) + timedelta(days=settings.jwt_refresh_ttl_days),
        )
    )
    await db.flush()
    return access, refresh


async def refresh(db: AsyncSession, refresh_token: str) -> tuple[str, str]:
    claims = verify_refresh(refresh_token)
    h = _hash(refresh_token)
    record = (
        await db.scalars(select(RefreshToken).where(RefreshToken.tokenHash == h))
    ).first()
    if record is None or record.revokedAt is not None:
        # Reuse — revoke whole family to invalidate any stolen sibling tokens.
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.family == claims["family"])
            .values(revokedAt=datetime.now(UTC))
        )
        raise unauthenticated("Refresh token reused; please sign in again")
    if record.expiresAt < datetime.now(UTC):
        raise unauthenticated("Refresh token expired")
    record.revokedAt = datetime.now(UTC)
    user = await db.scalar(select(User).where(User.id == claims["sub"]))
    if not user:
        raise unauthenticated()
    return await issue_tokens(db, user)


async def logout(db: AsyncSession, refresh_token: str) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.tokenHash == _hash(refresh_token))
        .values(revokedAt=datetime.now(UTC))
    )
