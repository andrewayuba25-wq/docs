"""FastAPI dependencies — auth extraction, current user, role gating."""
from __future__ import annotations

from typing import Annotated, Literal

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.errors import forbidden, unauthenticated
from app.models import User
from app.security import verify_access

Db = Annotated[AsyncSession, Depends(get_session)]


async def current_claims(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise unauthenticated()
    return verify_access(authorization.split(" ", 1)[1])


Claims = Annotated[dict, Depends(current_claims)]


async def current_user(db: Db, claims: Claims) -> User:
    user = await db.scalar(select(User).where(User.id == claims["sub"]))
    if not user:
        raise unauthenticated()
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def require_role(*roles: Literal["CUSTOMER", "ARTISAN", "ADMIN"]):
    async def _checker(claims: Claims) -> dict:
        if claims.get("role") not in roles:
            raise forbidden()
        return claims

    return _checker
