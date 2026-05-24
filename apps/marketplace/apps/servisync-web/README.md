# ServiSync Pro Connect

A complete, **runnable** mobile-first service marketplace web app — connect
customers with nearby skilled artisans (plumbers, electricians, carpenters,
painters, mechanics, cleaners, AC technicians, masons).

Built as a self-contained **React + TypeScript + Vite** single-page app with a
**local data layer** (localStorage-backed, seeded on first run), so it runs with
zero backend, no API keys, and no database setup. This makes it ideal as a
clickable prototype / demo of the full marketplace experience.

> For a production backend (Postgres + PostGIS, JWT auth, real-time chat,
> push), see the sibling `apps/api/` (TypeScript) and `apps/api-py/` (Python)
> packages in this monorepo. This app can be wired to either by replacing
> `src/lib/db.ts` with HTTP calls.

## Run it

```bash
cd apps/marketplace/apps/servisync-web
npm install
npm run dev      # open http://localhost:5173
```

Build for production:

```bash
npm run build && npm run preview
```

## Demo logins

OTP is mocked — **any 6-digit code works**. Known seed numbers map to roles:

| Role     | Phone             |
|----------|-------------------|
| Customer | `+2348010000001`  |
| Artisan  | `+2348020000010`  |
| Admin    | `+10000000000`    |

New phone numbers create a fresh account and let you pick a role.

## What's included

**Customer**
- Onboarding carousel, phone + OTP login, role selection
- Home with location chip, category grid, "top rated near you", recent bookings
- Emergency service shortcut
- Search/explore with category chips + sort (distance/rating/price) + distance & availability filters
- Artisan profile: rating, verified badge, portfolio, reviews, call/book actions
- Booking flow (describe job, address, emergency flag, price estimate)
- Booking detail with live status timeline, cancel, and post-completion review
- In-app chat (with a simulated reply), favorites, profile, dark/light toggle

**Artisan**
- Dashboard with availability toggle, earnings/rating/jobs snapshot
- Incoming & active job lists
- Job detail with accept/reject and the full status machine
  (`requested → accepted → en_route → in_progress → completed`)
- Maps deep-link, chat, earnings with commission breakdown
- Editable profile (services, bio, rates, experience), verification stub

**Admin**
- KPI overview (users, artisans, bookings, completed, pending KYC, reports)
- Verification queue (approve artisans)
- User management (suspend / reinstate)
- All-bookings table

## Architecture

```
src/
├── main.tsx            App bootstrap + providers
├── App.tsx             Router + role-based route guards
├── theme.css           Design tokens, dark/light, mobile-first shell
├── components/         Avatar, Card, Rating, Stars, TopBar, StatusBadge, BottomNav
├── lib/
│   ├── types.ts        Domain models
│   ├── seed.ts         Seed data (8 categories, 20 artisans near Lagos)
│   ├── db.ts           localStorage data layer: queries + mutations + pub/sub
│   ├── store.tsx       Session context + reactive DB hook + theme
│   └── geo.ts          Haversine distance + formatting
└── pages/
    ├── Onboarding / Login / RoleSelect
    ├── customer/       Home, Search, ArtisanDetail, NewBooking, BookingDetail, Bookings, Chat, Favorites, Profile
    ├── artisan/        Dashboard, JobDetail, Earnings, ProProfile
    └── admin/          Dashboard
```

The data layer (`lib/db.ts`) exposes `queries` (read) and `mutations` (write)
and notifies subscribers on every change, so the UI updates live — the same
shape you'd get from a real API client, making the swap to `apps/api` or
`apps/api-py` a focused change in one file.

Use **Profile → Reset demo data** to wipe localStorage and re-seed.
