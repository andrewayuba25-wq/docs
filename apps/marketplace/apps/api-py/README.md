# Artisan API — Python (FastAPI)

A FastAPI + SQLAlchemy + PostGIS backend for the Artisan marketplace, mirroring
the Node API at `apps/marketplace/apps/api/`. Same database, same JWT secrets,
same endpoints — so the mobile client can point at either backend
interchangeably.

## Stack

- **FastAPI** (ASGI) — REST API
- **python-socketio** — `/realtime` namespace (chat, live location, booking events)
- **SQLAlchemy 2.0** (async) + **GeoAlchemy2** — ORM + PostGIS
- **Alembic** — migrations (optional; the Node side's Prisma can own schema instead)
- **Pydantic v2** — request / response validation
- **python-jose** + **passlib** — JWT + bcrypt
- **httpx** — Twilio Verify, Expo Push
- **pytest** + **ruff** + **mypy** — quality gates

## Run it

```bash
# 0) Start Postgres+PostGIS and Redis from the parent infra
cd ../../          # apps/marketplace/
pnpm db:up
psql "$DATABASE_URL_SYNC" -f packages/db/prisma/migrations/001_postgis.sql

# 1) Python env
cd apps/api-py
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'

# 2) Apply schema (one of these — pick the one that owns your DB)
alembic revision --autogenerate -m "init"
alembic upgrade head
# ...or let Prisma drive: from the monorepo root, `pnpm db:migrate` then this
# service just uses the same tables.

# 3) Serve
uvicorn app.main:app --reload --port 4001
# Docs: http://localhost:4001/docs
```

## Endpoints (parity with Node)

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/auth/otp/request` | Twilio Verify (or in-memory in dev) |
| POST | `/v1/auth/otp/verify` | Returns `{accessToken, refreshToken, user, isNew}` |
| POST | `/v1/auth/refresh` | Rotating refresh + family-reuse detection |
| POST | `/v1/auth/logout` | Revokes refresh token |
| GET, PATCH | `/v1/me` | Self profile |
| POST | `/v1/me/role` | Pick CUSTOMER or ARTISAN |
| POST | `/v1/me/avatar` | S3 presigned PUT URL |
| POST | `/v1/me/push-token` | Register Expo push token |
| POST | `/v1/me/artisan/onboarding` | Categories, rates, bio |
| PATCH | `/v1/me/artisan/availability` | Toggle availability + update GPS |
| POST | `/v1/me/artisan/documents` | Verification doc upload (presigned PUT) |
| GET | `/v1/categories` | List categories |
| GET | `/v1/artisans/search` | PostGIS `ST_DWithin` + filters + sort |
| GET | `/v1/artisans/{id}` | Profile + reviews + categories |
| POST, DELETE | `/v1/favorites/{artisanId}` | Add/remove favorite |
| GET | `/v1/favorites` | List favorites |
| POST | `/v1/bookings` | Customer creates booking |
| GET | `/v1/bookings` | `?role=customer|artisan&status=...` |
| GET | `/v1/bookings/{id}` | Detail (participant-only) |
| POST | `/v1/bookings/{id}/accept|reject|start|in-progress|complete|cancel` | State machine |
| POST | `/v1/bookings/{id}/review` | Customer review |
| GET, POST | `/v1/threads/{bookingId}/messages` | Chat HTTP fallback |
| Admin | `/v1/admin/users\|verifications\|reports\|categories\|metrics` | role=ADMIN |

### Socket.IO

Namespace `/realtime`, JWT in handshake auth. Events:

- `chat:send` (client → server) → `chat:new` (server → peer)
- `artisan:location` (artisan → server, broadcast to `artisan:<id>` room)
- `booking:subscribe` (join `booking:<id>` room)

## Interop with the Node API

- **Same DB schema** — column names are exact Prisma-quoted camelCase.
- **Same JWT secrets** — set `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` to the
  same values as the Node service. A token minted by either side is accepted
  by both. Mobile clients can switch base URL with no re-auth required.
- **Shared seed data** — run `pnpm db:seed` from the monorepo root to populate
  categories, demo customer, demo admin, and 20 nearby artisans.

## Tests

```bash
pytest -q                  # pure-logic tests (no DB required)
ruff check .
mypy app
```

## Deploy

`Dockerfile` is included. Recommended target: **Fly.io** (`uvicorn` on
`shared-cpu-1x` with autoscale on CPU), **Neon** for Postgres, **Upstash** for
Redis. Match secrets to the Node service for token portability.
