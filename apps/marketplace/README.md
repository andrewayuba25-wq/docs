# Artisan — Service Marketplace

Mobile-first, two-sided marketplace connecting customers with nearby skilled
workers (plumbers, electricians, carpenters, painters, mechanics, cleaners, AC
technicians and more). Modeled on Uber / TaskRabbit / Thumbtack: GPS discovery,
ID verification, real-time chat, fast booking, and an admin back-office.

This directory is a self-contained pnpm monorepo. It is intentionally isolated
from the rest of this repository — nothing outside `apps/marketplace/` is
touched.

---

## What's in here

```
apps/marketplace/
├── apps/
│   ├── api/         Express + Socket.IO + Prisma backend (TypeScript)
│   ├── api-py/      FastAPI + SQLAlchemy + PostGIS backend (Python) — same DB, JWT-interop
│   ├── mobile/      React Native (Expo Router) customer + artisan app
│   ├── admin/       Next.js admin dashboard
│   └── marketing/   Next.js SEO landing page
├── packages/
│   ├── db/          Prisma schema, migrations, seed
│   └── shared/      Zod schemas, error codes, geo helpers (used by API + mobile)
├── infra/
│   ├── docker-compose.yml   Postgres+PostGIS, Redis, MinIO
│   ├── fly/                 Sample Fly.io deploy config
│   └── github-actions/      Sample CI workflow
└── .env.example
```

---

## Tech stack

| Layer       | Choice                                                      |
|-------------|-------------------------------------------------------------|
| Mobile      | React Native (Expo Router, TypeScript)                      |
| Marketing   | Next.js 14 (App Router)                                     |
| Admin       | Next.js 14 (App Router)                                     |
| Backend     | Node.js + Express + Socket.IO + TypeScript                  |
| Database    | PostgreSQL 16 + PostGIS (radius/distance queries)           |
| ORM         | Prisma                                                      |
| Auth        | JWT (access + rotating refresh) + Twilio Verify phone OTP   |
| Realtime    | Socket.IO (chat, live location, booking status)             |
| Storage     | S3-compatible (MinIO in dev, AWS S3 in prod)                |
| Push        | Expo Push API → FCM / APNs                                  |
| Maps        | Google Maps (`react-native-maps`)                           |
| Payments    | Stripe Connect (Phase 2 — schema + adapter slot ready)      |

---

## Getting started

```bash
# 1) From this directory
cp .env.example .env

# 2) Bring up Postgres+PostGIS, Redis, MinIO
pnpm db:up

# 3) Install workspaces
pnpm install

# 4) Generate Prisma client + run migrations + apply PostGIS SQL + seed
pnpm --filter @artisan/db generate
pnpm --filter @artisan/db migrate:dev
psql "$DATABASE_URL" -f packages/db/prisma/migrations/001_postgis.sql
pnpm db:seed

# 5) Run everything in parallel
pnpm dev
#   API           http://localhost:4000
#   Marketing     http://localhost:3000
#   Admin         http://localhost:3001
#   Mobile (Expo) opens an inspector; press 'w' for web, scan QR for device
```

Demo data created by `db:seed`:
- 1 admin: phone `+10000000000` (Twilio Verify bypassed in dev — see logs)
- 1 customer: phone `+10000000001`
- 20 artisans clustered within 5 km of Lagos centre (Lagos 6.5244, 3.3792)
- 8 service categories

In dev (`TWILIO_FAKE=true`), the OTP code is printed to the API server log
when you request one — paste it in the mobile app.

---

## Architecture

```
        Mobile (Expo)       Admin Web       Marketing
              │                 │                │
              └────────┬────────┘                ▼
                       ▼                      (Vercel)
            ┌─────────────────────┐
            │  Express API + WS   │
            │  REST  /v1/*        │
            │  Socket.IO /realtime│
            └──┬───────┬────────┬─┘
               ▼       ▼        ▼
            Postgres  Redis    S3
           (+ PostGIS)
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
      Twilio    Stripe    FCM/APNs
       (OTP)   (payments)  (push)
```

The API is layered route → service → repository (Prisma). External providers
sit behind adapter interfaces (`adapters/sms.ts`, `adapters/storage.ts`,
`adapters/push.ts`) so they can be swapped without touching business logic.

The mobile app uses a single Expo binary serving both roles; navigation is
gated by `user.role` after sign-in, so customer and artisan flows share auth,
chat, and profile screens.

---

## API surface (v1)

| Group       | Endpoints                                                              |
|-------------|------------------------------------------------------------------------|
| Auth        | `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/refresh`, `POST /auth/logout` |
| Me          | `GET/PATCH /me`, `POST /me/role`, `POST /me/avatar`, `POST /me/push-token`, artisan onboarding + availability + documents |
| Discovery   | `GET /categories`, `GET /artisans/search`, `GET /artisans/:id`, `GET /artisans/:id/reviews`, favorites |
| Booking     | `POST /bookings`, lifecycle transitions (accept, reject, start, in-progress, complete, cancel), `POST /bookings/:id/review` |
| Chat        | `GET/POST /threads/:bookingId/messages` (HTTP), plus Socket.IO `/realtime` events |
| Admin       | `GET /admin/users` + suspend/reinstate, `/admin/verifications` approve/reject, `/admin/reports`, `/admin/metrics`, `/admin/categories` |

Socket.IO events (`/realtime` namespace, JWT auth via handshake):
- `chat:send` / `chat:new` / `chat:read`
- `artisan:location` (artisan → server → subscribers)
- `booking:status` (broadcast to both parties on every transition)
- `booking:subscribe` (join a per-booking room for ETA + status)

---

## Data model

See `packages/db/prisma/schema.prisma`. Key entities:

- **User** (phone-first; role: `CUSTOMER` | `ARTISAN` | `ADMIN`)
- **CustomerProfile**, **ArtisanProfile** (split per role)
- **ServiceCategory** ↔ **ArtisanCategory** (M-N)
- **VerificationDoc** (ID front/back, selfie, trade license)
- **Booking** (state machine: `REQUESTED → ACCEPTED → EN_ROUTE → IN_PROGRESS → COMPLETED`, plus `REJECTED` / `CANCELLED`)
- **ChatThread** + **ChatMessage** (one per booking)
- **Review** (one per completed booking; updates `ArtisanProfile.avgRating`)
- **Payment** (Phase 2 — Stripe Connect)
- **Favorite**, **Report**, **PushToken**, **AuditLog**, **RefreshToken**

A PostGIS `geo` column on `ArtisanProfile` is maintained by trigger and indexed
with GIST so `ST_DWithin` does sub-millisecond radius lookups.

---

## Security

- **TLS** everywhere; HSTS + Helmet defaults
- **Auth:** 15-min access JWT + 30-day rotating refresh, family-based reuse detection (any reuse revokes the whole family)
- **OTP rate limits:** per-phone, per-IP, with backoff
- **Input validation:** Zod schemas at every route boundary; unknown fields rejected
- **AuthZ:** ownership + role checks in services, not just routes
- **Uploads:** S3 presigned PUT with MIME / size limits; verification docs in a private bucket
- **SQL injection:** Prisma parameterized queries only; raw queries use `$1, $2…` bindings
- **Secrets:** all via env; `.env` is gitignored; production secrets via Doppler / Fly secrets
- **Audit log:** every privileged admin action recorded

---

## MVP roadmap

| Sprint | Goal             | Status                              |
|--------|------------------|-------------------------------------|
| 0      | Setup            | ✅ monorepo, CI, dev DB, components |
| 1      | Auth & profiles  | ✅ OTP, JWT, role picker, onboarding |
| 2      | Discovery        | ✅ PostGIS search, filters, detail   |
| 3      | Bookings         | ✅ state machine, push, history      |
| 4      | Realtime         | ✅ chat + location via Socket.IO     |
| 5      | Trust & admin    | ✅ reviews, reports, admin web       |
| 6      | Payments (P2)    | ⏳ Stripe Connect (schema + adapter ready) |
| 7      | Growth           | ⏳ referrals, multi-city, i18n       |

---

## Deployment

| Component   | Recommendation                                        |
|-------------|-------------------------------------------------------|
| Mobile      | Expo EAS Build + EAS Submit, OTA updates              |
| API         | Fly.io (2× shared-cpu, autoscale on CPU)              |
| Postgres    | Neon (serverless, branching) or Fly Postgres          |
| Redis       | Upstash                                               |
| Object store| AWS S3 + CloudFront                                   |
| Marketing   | Vercel                                                |
| Admin       | Vercel (separate project, optional IP allowlist)      |
| Push        | Expo Push API                                         |
| Observability | Sentry + OpenTelemetry → Grafana Cloud              |

Sample `fly.toml` is in `infra/fly/api.fly.toml`. The GitHub Actions CI
template is in `infra/github-actions/ci.yml` — copy it to `.github/workflows/`
in your deployment repo (it scopes itself to `apps/marketplace/**` so it
coexists peacefully with other workflows).

---

## Monetization

1. **Commission** — 10–15 % take rate on completed bookings, via Stripe destination charges
2. **Promoted listings** — boost in category search; daily or weekly budget
3. **"Pro" subscription** — gold badge, lower commission, advanced analytics
4. **Lead fee** alternative for regions where commissions are hard to enforce
5. **Emergency surcharge** — small premium on emergency requests
6. **Insurance / warranty add-ons** at checkout (revenue share with partner)
7. **B2B / property managers** — bulk discounted accounts
8. **Anonymized marketplace data** for suppliers, with explicit consent

---

## Verification — end-to-end smoke test

Once the stack is running:

1. `curl http://localhost:4000/health` → `{ ok: true }`
2. `curl -X POST http://localhost:4000/v1/auth/otp/request -H 'content-type: application/json' -d '{"phone":"+10000000001"}'` → check API logs for the 6-digit code
3. In the mobile app, sign in with that phone + code → land on customer home
4. Tap **Plumber** → see seeded nearby artisans
5. Open one, tap **Book**, describe the job
6. Sign in as the artisan in a second simulator (`+10000002000`), see the request, **Accept** it
7. Confirm both screens flip live via Socket.IO (`booking:status`)
8. Exchange chat messages — they appear in real time
9. Mark complete → review screen on the customer
10. Open `http://localhost:3001` (admin) — KPIs reflect the new completed booking

---

## License

UNLICENSED — internal scaffold. Replace with the license you intend to ship.
