# Architecture decisions (condensed ADRs)

## 001 — Monorepo (pnpm + Turborepo)
Single repository for mobile, API, admin, marketing, and shared packages.
Shared Zod schemas and types eliminate drift between client and server.
Turborepo gives task-level caching and parallel `dev`.

## 002 — One mobile binary for both roles
Customer and artisan apps share auth, chat, profile, push, and location flows.
Splitting at navigation (`(customer)/` vs `(artisan)/`) is cheaper than two
binaries and lets a single account toggle role if we ever support that.

## 003 — Postgres + PostGIS instead of geohash on Firestore
PostGIS `ST_DWithin` over a GIST index is exact, supports complex filters in
one query (rating × price × availability × distance), and cheaper at scale.
Trade-off: we lose Firestore's offline cache; addressed in the mobile client
with optimistic UI and per-feature local state.

## 004 — Layered API, adapters for externals
Routes are thin; business logic lives in `services/`. External providers
(`sms`, `storage`, `push`, future `payments`) sit behind adapter interfaces
so we can swap Twilio for Termii, S3 for R2, Expo Push for raw FCM, etc.,
without touching service code.

## 005 — JWT access + rotating refresh with family detection
Stateless API; access JWT (15 min) + refresh (30 d, rotated on every use).
Refresh reuse revokes the whole family — a strong signal of theft.

## 006 — Socket.IO over raw WebSockets
Battle-tested fallbacks (long-poll), built-in rooms and namespaces, JWT auth
via handshake. Rooms power per-booking subscriptions for live ETA + status.

## 007 — Single state machine per booking
Booking transitions live in `services/booking.service.ts`. Roles are gated:
customers can only cancel; artisans drive the rest. Every transition
broadcasts on Socket.IO and triggers a push notification to the peer.

## 008 — Mobile state via Zustand, server state via fetch + SWR-ish hooks
Avoid Redux. Tiny `useAuth` / `useLocation` stores cover global concerns;
everything else is fetched per-screen with stale-while-revalidate semantics.

## 009 — Admin and marketing as separate Next.js apps
Admin needs auth + IP allowlist; marketing needs aggressive caching and ISR.
Splitting them keeps deploy targets and CSP policies clean.
