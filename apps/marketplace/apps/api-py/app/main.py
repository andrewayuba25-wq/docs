"""FastAPI application entry point.

Mounts:
- REST API under /v1
- Socket.IO under /realtime (ASGI mount)
- /health for liveness probes
"""
from __future__ import annotations

import logging

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.errors import AppError, app_error_handler
from app.realtime.bus import sio
from app.routers import admin, artisans, auth, bookings, chat, me

logging.basicConfig(level=settings.log_level)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Artisan API (Python)",
        version="0.1.0",
        docs_url="/docs",
        redoc_url=None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(AppError, app_error_handler)

    app.include_router(auth.router)
    app.include_router(me.router)
    app.include_router(artisans.router)
    app.include_router(bookings.router)
    app.include_router(chat.router)
    app.include_router(admin.router)

    @app.get("/health")
    async def health() -> dict[str, object]:
        return {"ok": True, "env": settings.environment}

    return app


fastapi_app = create_app()

# Socket.IO ASGI app wraps the FastAPI app so both share the same port.
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="/realtime/socket.io")
