"""OTP issuance / verification with in-memory store + per-phone rate limiting.

Swap for Redis in production by replacing the two dicts.
"""
from __future__ import annotations

import asyncio
import hmac
import time
from dataclasses import dataclass

from app.adapters.sms import FakeSms, sms
from app.config import settings
from app.errors import rate_limited, validation

RATE_WINDOW = 60.0
RATE_MAX = 3
ATTEMPT_MAX = 5
OTP_TTL = 5 * 60


@dataclass
class _Record:
    code: str
    expires_at: float
    attempts: int = 0


_store: dict[str, _Record] = {}
_rate: dict[str, list[float]] = {}
_lock = asyncio.Lock()


def _check_rate(phone: str) -> None:
    now = time.time()
    arr = [t for t in _rate.get(phone, []) if now - t < RATE_WINDOW]
    if len(arr) >= RATE_MAX:
        raise rate_limited("Too many OTP requests; try again shortly.")
    arr.append(now)
    _rate[phone] = arr


async def request_otp(phone: str) -> None:
    async with _lock:
        _check_rate(phone)
        if settings.twilio_fake:
            assert isinstance(sms, FakeSms)
            code = await sms.send_otp(phone)
            _store[phone] = _Record(code=code, expires_at=time.time() + OTP_TTL)
        else:
            await sms.send_otp(phone)


async def verify_otp(phone: str, code: str) -> bool:
    async with _lock:
        if settings.twilio_fake:
            rec = _store.get(phone)
            if not rec:
                raise validation("No OTP requested for this phone")
            if time.time() > rec.expires_at:
                _store.pop(phone, None)
                raise validation("OTP expired; request a new one")
            rec.attempts += 1
            if rec.attempts > ATTEMPT_MAX:
                _store.pop(phone, None)
                raise rate_limited("Too many attempts")
            ok = hmac.compare_digest(rec.code, code)
            if ok:
                _store.pop(phone, None)
            return ok
        return await sms.verify_otp(phone, code)
