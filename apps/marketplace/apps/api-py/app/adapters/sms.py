"""SMS / OTP adapter — Twilio Verify in prod, in-memory fake in dev."""
from __future__ import annotations

import logging
import secrets
from abc import ABC, abstractmethod

import httpx

from app.config import settings

log = logging.getLogger(__name__)


class SmsAdapter(ABC):
    @abstractmethod
    async def send_otp(self, phone: str) -> str | None:
        """Returns the code only in dev so OtpService can store it."""

    @abstractmethod
    async def verify_otp(self, phone: str, code: str) -> bool:
        ...


class FakeSms(SmsAdapter):
    """Dev adapter — generates a 6-digit code and logs it."""

    async def send_otp(self, phone: str) -> str:
        code = f"{secrets.randbelow(1_000_000):06d}"
        log.info("[FakeSMS] OTP for %s -> %s (dev only)", phone, code)
        return code

    async def verify_otp(self, phone: str, code: str) -> bool:  # noqa: ARG002
        # Real verification handled by OtpService against its in-memory store.
        return True


class TwilioVerify(SmsAdapter):
    BASE = "https://verify.twilio.com/v2"

    def _auth(self) -> tuple[str, str]:
        assert settings.twilio_account_sid and settings.twilio_auth_token
        return settings.twilio_account_sid, settings.twilio_auth_token

    async def send_otp(self, phone: str) -> None:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                f"{self.BASE}/Services/{settings.twilio_verify_sid}/Verifications",
                auth=self._auth(),
                data={"To": phone, "Channel": "sms"},
            )
            r.raise_for_status()
        return None

    async def verify_otp(self, phone: str, code: str) -> bool:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                f"{self.BASE}/Services/{settings.twilio_verify_sid}/VerificationCheck",
                auth=self._auth(),
                data={"To": phone, "Code": code},
            )
            if r.status_code != 200:
                return False
            return r.json().get("status") == "approved"


sms: SmsAdapter = FakeSms() if settings.twilio_fake else TwilioVerify()
