"""Socket.IO gateway for chat + live location. Same event names as the Node API."""
from __future__ import annotations

import logging
from typing import Any

import socketio

from app.db import SessionLocal
from app.models import MsgKind, Role
from app.security import verify_access
from app.services import artisans as artisan_svc
from app.services import chat as chat_svc

log = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

# user_id -> set of socket session ids
_user_sids: dict[str, set[str]] = {}


@sio.event(namespace="/realtime")
async def connect(sid: str, environ: dict, auth: dict | None) -> bool:
    token = None
    if auth and "token" in auth:
        token = auth["token"]
    else:
        header = environ.get("HTTP_AUTHORIZATION", "")
        if header.startswith("Bearer "):
            token = header.split(" ", 1)[1]
    if not token:
        return False
    try:
        claims = verify_access(token)
    except Exception:
        return False
    await sio.save_session(sid, {"user_id": claims["sub"], "role": claims["role"]}, namespace="/realtime")
    _user_sids.setdefault(claims["sub"], set()).add(sid)
    return True


@sio.event(namespace="/realtime")
async def disconnect(sid: str) -> None:
    session = await sio.get_session(sid, namespace="/realtime")
    user_id = session.get("user_id") if session else None
    if user_id:
        _user_sids.get(user_id, set()).discard(sid)


@sio.on("chat:send", namespace="/realtime")
async def chat_send(sid: str, payload: dict[str, Any]) -> dict[str, Any]:
    session = await sio.get_session(sid, namespace="/realtime")
    user_id = session["user_id"]
    booking_id = payload["bookingId"]
    async with SessionLocal() as db:
        try:
            msg = await chat_svc.send_message(
                db,
                booking_id,
                user_id,
                payload["body"],
                MsgKind(payload.get("kind", "TEXT")),
                s3_key=payload.get("s3Key"),
                lat=payload.get("lat"),
                lng=payload.get("lng"),
            )
            booking = await chat_svc.assert_participant(db, booking_id, user_id)
            await db.commit()
        except Exception as e:
            await db.rollback()
            return {"ok": False, "error": str(e)}
    peer = booking.artisanId if user_id == booking.customerId else booking.customerId
    await emit_to_user(
        peer,
        "chat:new",
        {
            "bookingId": booking.id,
            "message": {
                "id": msg.id,
                "threadId": msg.threadId,
                "senderId": msg.senderId,
                "body": msg.body,
                "kind": msg.kind.value if hasattr(msg.kind, "value") else msg.kind,
                "createdAt": msg.createdAt.isoformat(),
            },
        },
    )
    return {"ok": True, "messageId": msg.id}


@sio.on("artisan:location", namespace="/realtime")
async def artisan_location(sid: str, payload: dict[str, Any]) -> None:
    session = await sio.get_session(sid, namespace="/realtime")
    if session.get("role") != Role.ARTISAN.value:
        return
    user_id = session["user_id"]
    lat, lng = payload.get("lat"), payload.get("lng")
    async with SessionLocal() as db:
        await artisan_svc.set_availability(db, user_id, True, lat, lng)
        await db.commit()
    await sio.emit(
        "artisan:location",
        {"userId": user_id, "lat": lat, "lng": lng},
        room=f"artisan:{user_id}",
        namespace="/realtime",
    )


@sio.on("booking:subscribe", namespace="/realtime")
async def booking_subscribe(sid: str, payload: dict[str, str]) -> None:
    await sio.enter_room(sid, f"booking:{payload['bookingId']}", namespace="/realtime")


async def emit_to_user(user_id: str, event: str, data: Any) -> None:
    for sid in list(_user_sids.get(user_id, set())):
        await sio.emit(event, data, to=sid, namespace="/realtime")
