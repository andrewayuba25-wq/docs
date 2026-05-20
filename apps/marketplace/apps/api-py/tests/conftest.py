"""Test fixtures. Many tests can run without a real DB by exercising pure logic."""
from __future__ import annotations

import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://artisan:artisan@localhost:5432/artisan")
os.environ.setdefault("DATABASE_URL_SYNC", "postgresql://artisan:artisan@localhost:5432/artisan")
os.environ.setdefault("JWT_ACCESS_SECRET", "test-access-secret-please-change")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh-secret-please-change")
