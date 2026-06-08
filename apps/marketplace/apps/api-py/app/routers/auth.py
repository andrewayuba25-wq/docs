"""Authentication routes: phone OTP -> JWT."""
from __future__ import annotations

from fastapi import APIRouter

from app import schemas
from app.deps import Db
from app.services import auth as auth_svc

router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.post("/otp/request")
async def otp_request(payload: schemas.OtpRequest) -> dict[str, bool]:
    await auth_svc.request_otp(payload.phone)
    return {"ok": True}


@router.post("/otp/verify", response_model=schemas.VerifyOtpResp)
async def otp_verify(payload: schemas.OtpVerify, db: Db) -> schemas.VerifyOtpResp:
    user, is_new, access, refresh = await auth_svc.verify_otp(db, payload.phone, payload.code)
    return schemas.VerifyOtpResp(
        accessToken=access,
        refreshToken=refresh,
        isNew=is_new,
        user=schemas.UserResp.model_validate(user),
    )


@router.post("/refresh", response_model=schemas.TokensResp)
async def refresh(payload: schemas.RefreshTokenReq, db: Db) -> schemas.TokensResp:
    access, refresh = await auth_svc.refresh(db, payload.refreshToken)
    return schemas.TokensResp(accessToken=access, refreshToken=refresh)


@router.post("/logout")
async def logout(payload: schemas.RefreshTokenReq, db: Db) -> dict[str, bool]:
    await auth_svc.logout(db, payload.refreshToken)
    return {"ok": True}
