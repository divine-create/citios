# CityOS Security Reference

## Authentication
Authentication is managed via NextAuth.js (JWT strategy). The canonical identity of the actor is securely stored in the session.
- **Implementation**: The backend extracts the actor via `getServerSession()`.
- **Rule**: Client-provided IDs (`personId`, `userId`, `cashierId`) in API payloads are strictly forbidden for authorization purposes. Identity MUST be derived from the session.

## Authorization & Tenant Isolation
CityOS is a multi-tenant platform centered around Organizations.
- **Implementation**: `lib/actions/tenant.ts` exports `requireMembership(organizationId, allowedRoles?)`.
- **Tenant Isolation**: Every server action MUST invoke `requireMembership` to prove the session actor belongs to the requested `organizationId`. 
- **Roles**: Granular roles (`OWNER`, `MANAGER`, `CASHIER`, etc.) are checked within `requireMembership`.

## Location Isolation
Where applicable, resources (Orders, Inventory, Registers, Shifts) are bound to a specific physical `locationId` nested under an Organization.
- **Rule**: When a client submits a `locationId`, the server MUST verify that `Location.organizationId === Organization.id` to prevent cross-tenant data pollution.

## Server Authority
The client UI is untrusted. The backend is the sole authority for:
- **Pricing & Financial Totals**: Clients send "I want Product A". The server looks up Product A's price in the database and calculates subtotals, taxes, and discounts.
- **Inventory Levels**: Clients cannot dictate remaining stock.
- **Payment Status**: Manual terminal confirmations are logged, but cryptographically secure payment statuses must originate from server-to-server webhooks (when implemented).
- **Tenant Ownership**: The server asserts resource ownership.

## IDOR Prevention (Insecure Direct Object Reference)
User-controlled resource IDs must ALWAYS be ownership-scoped.
- **Bad**: `await db.orm.public.RetailOrder.where({ id: input.orderId }).update(...)`
- **Good**: `await db.orm.public.RetailOrder.where({ id: input.orderId, organizationId: input.orgId }).update(...)`
If an ID is passed, the server must either scope the lookup to the active tenant or manually fetch the record and assert `record.organizationId === activeTenantId` before proceeding.

## Transactions
Database transactions (`db.transaction()`) are mandatory for workflows modifying multiple records or asserting strict constraints.
- **Example**: Creating an order, deducting inventory, and updating a wallet must occur inside a single transaction.

## Concurrency
Race conditions must be prevented at the database level.
- **Rule**: Do not perform "read, then math, then write" outside a transaction.
- **Rule**: Inside a transaction, explicitly assert constraints (e.g., `if (stock < requested) throw new Error()`). If the constraint fails concurrently, the transaction rolls back safely. Do NOT mask errors with `Math.max(0, stock)`.

## Idempotency
Retryable financial operations (Checkouts, Refunds, Payments) require an idempotency key.
- **Implementation**: The client generates a UUID (`idempotencyKey`). The server checks if an operation with this key already completed for the organization.
- **Database**: The key is marked `@unique` in Prisma. This guarantees that simultaneous concurrent requests collide at the database constraint level, preventing duplicate financial mutations.

## Financial Integrity
- All debits and credits should eventually reconcile into the canonical `LedgerEntry` and `Wallet` models.
- A failed checkout or refund must leave zero partial artifacts in the database.

## Secrets
No API keys, secrets, or administrative credentials may be embedded in client-side code (`components/`). Store them in `.env.local` and access them exclusively in Server Actions or API routes.

## Demo Data
- Production code must never silently fall back to mock/demo data arrays. 
- If real data is absent, render an Empty State UI. Seed data belongs exclusively in development scripts.

## Security Testing
- Security regression tests must be written for all patched vulnerabilities (e.g., overselling, cross-tenant IDORs).
- Tests should be deterministic and placed in `lib/*.test.ts`. Use actual database calls or robust logical assertions rather than superficial mocks.
