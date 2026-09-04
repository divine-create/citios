# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CityConnect is a Next.js (App Router) "super app" prototype for a smart-city platform: one resident-facing consumer app (feed, grocery, hotel booking, healthcare, events, schools, local services, ride-hailing) plus a separate multi-vertical admin/back-office portal for the businesses and institutions running those services (school registrar/teacher/finance, hotel front desk/housekeeping/manager, grocery POS/picker/dispatch, events organizer/scanner, restaurant, healthcare, news). See `CITYCONNECT_SYSTEM_OVERVIEW.md` for the product vision and `IMPLEMENTATION_TODO.md` for the phased build plan (note: that TODO file understates progress — data persistence and several admin verticals are further along in code than its checkboxes suggest, so check the actual code before trusting its status).

Root-level `*_RESEARCH.md` and `*_FEATURE_LIST.md` files (e.g. `LITTLE_HOTELIER_RESEARCH.md`, `HOTEL_MANAGEMENT_FEATURE_LIST.md`) are competitive-analysis docs produced before building each admin vertical — consult the relevant one before extending that vertical's admin UI so new features match the agreed scope.

## Commands

```
npm run dev            # start Next.js dev server
npm run build           # production build
npm run start           # run the production build
npm run lint             # eslint .
npm run clean            # next clean
npx tsx scripts/seed-runner.ts   # seed the database (imports scripts/seed.ts)
npx tsx simulate.ts               # end-to-end simulation script exercising the DB layer across verticals
```

There is no test runner configured in `package.json` — don't assume `npm test` exists.

Single-vertical simulation scripts also exist at the repo root (`simulate-hotel-roles.ts`, `simulate-grocery-roles.ts`, `simulate-events-roles.ts`, `simulate-school-roles.ts`), runnable the same way via `npx tsx <file>`.

## Data layer: Prisma Next (Prisma 8), not classic Prisma ORM

This project uses **Prisma Next** (`@prisma/orm-postgres`, contract-first), not the classic `schema.prisma` + `@prisma/client` workflow. **The `prisma-8` skill is available in this repo and should be consulted for any schema/migration/query work on this layer** — it is more current than general Prisma knowledge.

Key files:
- `src/prisma/contract.prisma` — the actual, live data contract (models, enums, relations). **This is the schema to edit**, not the one below.
- `src/prisma/db.ts` — runtime client, built via `postgres<Contract>({ contractJson, url })`.
- `src/prisma/contract.json` / `contract.d.ts` — generated artifacts from the contract (via `prisma contract emit`).
- `prisma.config.ts` — points the Prisma CLI at `./src/prisma/contract.prisma`.
- `migrations/` — migration graph and snapshots managed by the Prisma Next CLI.

`prisma/schema.prisma` at the repo root is a **stale legacy file** using the classic `prisma-client-js` generator; it is not wired into `prisma.config.ts` and no application code imports `@prisma/client`. Ignore it for data-model changes — it appears out of sync with `src/prisma/contract.prisma` (fewer models, no uuid `@default`, etc.) and should not be treated as a source of truth.

Query pattern used throughout `lib/actions/*`:
```ts
import { db } from '@/src/prisma/db'
const rows = await db.orm.public.ModelName.where({ field: value }).all()
```
Relations are not auto-joined — actions fetch related tables separately and stitch them together in application code (see `lib/actions/feed.ts`, `lib/actions/school.ts` for the pattern), then `JSON.parse(JSON.stringify(...))` the result before returning from a Server Action (to strip non-serializable values like `Date`/Decimal before crossing the server/client boundary).

Env vars: `DATABASE_URL` and `DIRECT_URL` (Postgres, required by `prisma.config.ts`/`db.ts`), plus `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for auth.

## Data model shape

Everything hangs off `User` and `Organization`:
- `Organization.type` (`OrgType` enum: SCHOOL, HOTEL, HEALTHCARE, RESTAURANT, RETAIL, EVENT_ORGANIZER, PHARMACY, LOGISTICS, GOVERNMENT, REAL_ESTATE, SERVICES, PUBLISHER) determines which vertical an org belongs to, and most vertical models (`HotelRoom`, `Student`, `MenuItem`, `Event`, `PharmacyItem`, etc.) hang off an `organizationId`.
- `OrganizationMember` links a `User` to an `Organization` with an `OrgRole` (OWNER/MANAGER/STAFF/TEACHER/DOCTOR) — this is the RBAC join table for admin portals.
- `Wallet` + `Transaction` implement "CityPay": every `User` and `Organization` can have one wallet; transactions move balance between two wallets.
- `Task` + `ServiceQuote` implement "CityDrive": a `Task` (ride, food delivery, package delivery, service dispatch) is requested by a `User`, optionally tied to an `Organization`, and accepted by a courier `User` (via `GigWorkerProfile`).
- Auth models (`Account`, `Session`, `User`) follow the NextAuth Prisma adapter shape, with CityConnect-specific fields/relations added directly onto `User`.

## Frontend architecture

- App Router with route groups: `app/(resident)/*` is the consumer-facing app, `app/(admin)/*` and `app/admin/*` are back-office portals, `app/courier/*` is the driver/gig-worker interface. `app/(admin)` further splits by vertical and role (e.g. `app/(admin)/hotel/frontdesk`, `.../manager`, `.../housekeeping`; `app/(admin)/school/{admin,teacher,registrar,counselor,finance}`).
- Auth is NextAuth (`lib/auth.ts`, Google provider, JWT sessions) mounted at `app/api/auth/[...nextauth]`. Role is currently hardcoded to `RESIDENT` in the `jwt` callback — admin/staff role resolution against `OrganizationMember` is not yet wired in.
- Data fetching goes through Server Actions in `lib/actions/*.ts` (one file per domain: `feed`, `school`, `hotel`, `healthcare`, `restaurant`, `events`, `news`, `profile`, `resident`, `explore`, `services`, `post`, `local`). Components call these directly rather than hitting API routes; there is effectively no `app/api/*` surface besides NextAuth.
- Large per-vertical admin views live in `components/<vertical>/` (e.g. `components/hotel/FrontDeskCalendar.tsx`, `components/school/TeacherDashboard.tsx`, `components/grocery/RetailPOS.tsx`); shared/simple views sit directly under `components/` (e.g. `HomeView.tsx`, `Shared.tsx`, `LoginModal.tsx`).
- Styling is Tailwind v4 (`@tailwindcss/postcss`, `tw-animate-css`), with `class-variance-authority`/`tailwind-merge`/`clsx` for variant composition (see `lib/utils.ts` for the `cn()` helper convention typical of shadcn-style setups).
- `next.config.ts` sets `eslint.ignoreDuringBuilds: true` and disables webpack file watching when `DISABLE_HMR=true` (used by the AI Studio agent environment) — don't rely on lint failing the build, and don't "fix" the HMR watchOptions block, it's intentional.
