"""Chat thread routes (HTTP fallback alongside Socket.IO)."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Query

from app import schemas
from app.deps import Claims, Db
from app.models import MsgKind
from app.services import chat as svc

router = APIRouter(prefix="/v1/threads", tags=["chat"])


@router.get("/{booking_id}/messages")
async def list_messages(
    booking_id: str,
    db: Db,
    claims: Claims,
    limit: int = Query(50, ge=1, le=200),
    before: datetime | None = None,
) -> dict[str, list[dict[str, Any]]]:
    msgs = await svc.list_messages(db, booking_id, claims["sub"], limit=limit, before=before)
    return {
        "messages": [
            {
                "id": m.id,
                "threadId": m.threadId,
                "senderId": m.senderId,
                "body": m.body,
                "kind": m.kind.value if hasattr(m.kind, "value") else m.kind,
                "s3Key": m.s3Key,
                "lat": m.lat,
                "lng": m.lng,
                "createdAt": m.createdAt,
            }
            for m in msgs
        ]
    }


@router.post("/{booking_id}/messages", status_code=201)
async def send_message(
    booking_id: str, payload: schemas.SendMessageReq, db: Db, claims: Claims
) -> dict[str, Any]:
    msg = await svc.send_message(
        db,
        booking_id,
        claims["sub"],
        payload.body,
        MsgKind(payload.kind),
        s3_key=payload.s3Key,
        lat=payload.lat,
        lng=payload.lng,
    )
    return {
        "id": msg.id,
        "threadId": msg.threadId,
        "senderId": msg.senderId,
        "body": msg.body,
        "kind": msg.kind.value if hasattr(msg.kind, "value") else msg.kind,
        "createdAt": msg.createdAt,
    }
