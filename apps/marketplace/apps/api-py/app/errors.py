"""Domain error hierarchy + FastAPI exception handler.

Mirrors the Node API's error envelope so the mobile client handles both
backends identically.
"""
from __future__ import annotations

from enum import StrEnum
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class ErrorCode(StrEnum):
    UNAUTHENTICATED = "UNAUTHENTICATED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    VALIDATION = "VALIDATION"
    CONFLICT = "CONFLICT"
    RATE_LIMITED = "RATE_LIMITED"
    INTERNAL = "INTERNAL"
    OTP_INVALID = "OTP_INVALID"
    BOOKING_INVALID_TRANSITION = "BOOKING_INVALID_TRANSITION"
    ARTISAN_NOT_VERIFIED = "ARTISAN_NOT_VERIFIED"


class AppError(Exception):
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status: int = 400,
        details: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.details = details


def not_found(entity: str = "Resource") -> AppError:
    return AppError(ErrorCode.NOT_FOUND, f"{entity} not found", 404)


def forbidden(msg: str = "You do not have access to this resource") -> AppError:
    return AppError(ErrorCode.FORBIDDEN, msg, 403)


def unauthenticated(msg: str = "Authentication required") -> AppError:
    return AppError(ErrorCode.UNAUTHENTICATED, msg, 401)


def validation(msg: str, details: Any | None = None) -> AppError:
    return AppError(ErrorCode.VALIDATION, msg, 400, details)


def conflict(msg: str) -> AppError:
    return AppError(ErrorCode.CONFLICT, msg, 409)


def rate_limited(msg: str = "Too many requests") -> AppError:
    return AppError(ErrorCode.RATE_LIMITED, msg, 429)


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )
