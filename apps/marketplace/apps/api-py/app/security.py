"""JWT helpers — HS256, claims compatible with the Node API so tokens interop."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from jose import JWTError, jwt

from app.config import settings
from app.errors import AppError, ErrorCode

ALGORITHM = "HS256"
Role = Literal["CUSTOMER", "ARTISAN", "ADMIN"]


def sign_access(*, sub: str, role: Role) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": sub,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.jwt_access_ttl_min)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_access_secret, algorithm=ALGORITHM)


def sign_refresh(*, sub: str, family: str) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": sub,
        "family": family,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.jwt_refresh_ttl_days)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_refresh_secret, algorithm=ALGORITHM)


def verify_access(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_access_secret, algorithms=[ALGORITHM])
    except JWTError as e:
        raise AppError(ErrorCode.UNAUTHENTICATED, "Invalid or expired access token", 401) from e


def verify_refresh(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_refresh_secret, algorithms=[ALGORITHM])
    except JWTError as e:
        raise AppError(ErrorCode.UNAUTHENTICATED, "Invalid or expired refresh token", 401) from e
