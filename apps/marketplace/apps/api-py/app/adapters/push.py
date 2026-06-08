"""Expo push notification adapter."""
from __future__ import annotations

import logging
from typing import Any

import httpx

log = logging.getLogger(__name__)


async def send_push(
    tokens: list[str],
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> None:
    if not tokens:
        return
    messages = [
        {"to": tok, "title": title, "body": body, "data": data or {}, "sound": "default"}
        for tok in tokens
    ]
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post("https://exp.host/--/api/v2/push/send", json=messages)
        if r.status_code >= 300:
            log.warning("Expo push non-2xx: %s", r.status_code)
    except Exception as exc:  # noqa: BLE001
        log.warning("Push send failed (non-fatal): %s", exc)
