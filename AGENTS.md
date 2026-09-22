# CityOS — Agent Operating Protocol

## 1. CityOS Identity
CityOS is a hyperlocal city operating system. It provides a shared platform infrastructure (Identity, Organizations, Locations, Wallets, Ledger) upon which multiple industry-specific verticals (CityMart, RestaurantOS, HotelOS, SchoolOS, etc.) are built. Verticals MUST reuse shared infrastructure rather than creating parallel disconnected systems.

## 2. Repository Structure
- `app/` — Next.js 15 App Router pages and API routes.
- `components/` — React UI components (grouped by vertical or shared).
- `lib/actions/` — Server actions (the primary data mutation boundary).
- `src/prisma/` — Database configuration and canonical schema.
- `docs/` — Global architecture and vertical-specific context.

## 3. Canonical Architecture
- **Person**: The universal human identity (tied to NextAuth session).
- **Organization**: The primary tenant boundary for businesses and institutions.
- **Membership**: Links a Person to an Organization with specific Roles.
- **Location**: A physical branch of an Organization.
- **CustomerData / Relationship**: Links a Person to an Organization as a customer/client.

## 4. Database Rules
- **Schema**: `src/prisma/contract.prisma` is the absolute source of truth.
- **ORM**: Uses Prisma 8 (Prisma Next) via `db.orm.public.*`.
- **Generation**: Do NOT edit generated output. Run `npm run contract:emit` after schema changes.

## 5. Identity & Authentication
- Actor identity is derived strictly from the secure NextAuth session (`getServerSession`).
- **NEVER** trust a client-provided `userId`, `personId`, or `cashierId`.

## 6. Tenancy
- **Organization Isolation**: Always validate access using `requireMembership(organizationId)` from `lib/actions/tenant.ts`.
- **Location Isolation**: When a resource is location-bound, explicitly verify the location belongs to the authorized organization.
- **Resource Ownership**: Scoped database lookups (e.g., `where: { id, organizationId }`) must be used to prevent IDOR.

## 7. Shared Infrastructure
CityOS provides canonical implementations for:
- **Wallets & Ledger** (`Wallet`, `Transaction`, `LedgerEntry`)
- **Payments** (`Payment`)
- **Assets** (`Asset`)
- **Microsites** (`Microsite`)

## 8. Vertical Architecture
`CityOS Core → Shared Infrastructure → Vertical → Vertical-specific Features`
Do not duplicate canonical models (e.g., do not create `RetailCustomer` or `RetailUser`). Link back to `Person`, `CustomerData`, or `Organization`.

## 9. Security Principles
- **Server Authority**: The server calculates all financial totals, inventory deductions, and authorization boundaries.
- **Transactions**: Multi-step operations (e.g., Checkout) MUST use `db.transaction()` to prevent partial state.
- **Idempotency**: Retryable financial operations must enforce uniqueness (e.g., `idempotencyKey`).
- **Concurrency**: Do not read-then-write outside a transaction. Assert constraints (e.g., stock > 0) strictly inside the transaction block.

## 10. Coding Principles
- **Smallest Correct Change**: Do not refactor unrelated files.
- **Inspect First**: Always inspect the repository before assuming architecture.
- **Strict TypeScript**: Do not hide errors with `@ts-ignore` or `as any`. Fix the underlying type.

## 11. Testing
- Use the native Node.js test runner via `npm run test` (`tsx --test lib/*.test.ts`).
- Write deterministic regression tests for confirmed bugs.
- Do not bypass security to make a test pass.

## 12. Agent Behavior Requirements
1. Read `AGENTS.md` and relevant `docs/`.
2. Inspect the repository evidence.
3. Plan minimally.
4. Implement the smallest correct change.
5. Add/update tests.
6. Validate via `npm run build` and `npm run test`.
7. Do not scan or modify unrelated verticals unless a shared dependency requires it.
