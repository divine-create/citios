# CityOS Architecture Reference

## 1. System Overview
CityOS is built on a modern, React-based stack optimized for both server-side security and client-side interactivity.
- **Framework**: Next.js 15 (App Router).
- **Language**: TypeScript throughout the entire stack.
- **Styling**: Tailwind CSS 4.
- **Database**: PostgreSQL accessed via Prisma 8 (Prisma Next).
- **Authentication**: NextAuth.js 4 (JWT session-based).
- **Architecture**: A modular monolithic architecture ("Hyperlocal OS") containing a shared platform core and multiple industry-specific verticals (Retail, Education, Hospitality, Healthcare, etc.).

## 2. Repository Architecture
- `app/`: Next.js App Router. Contains page routes, layouts, and API endpoints (e.g., NextAuth, Webhooks).
- `components/`: React UI components. Organized into shared platform components (`components/cityos`) and vertical-specific components (e.g., `components/retail`).
- `lib/actions/`: Server Actions. This is the exclusive data mutation and query boundary for the frontend. Direct Prisma calls from components are heavily discouraged in favor of these typed Server Actions.
- `src/prisma/`: Contains `contract.prisma`, the absolute canonical source of truth for the database schema.
- `docs/`: Persistent architecture and context documentation for AI agents and human developers.
- `scripts/` / `migrations/`: Operational and database migration scripts.

## 3. CityOS Core
CityOS provides a foundation of shared services that all verticals must use:
- **Identity & Auth**: NextAuth handles JWT sessions, tied to a canonical `Person` record.
- **Tenancy (Organizations)**: Every business/institution is an `Organization`.
- **Memberships & Roles**: Users (`Person`) access `Organizations` via a `Membership` record, which contains granular `MembershipRole` records.
- **Locations**: Physical branches belonging to an `Organization`.
- **Financial Ledger**: A unified wallet and transaction system tracking financial movements.
- **Assets**: A shared `Asset` table for uploads (images, receipts, documents).
- **Microsites**: A shared storefront/website builder system (`Microsite`, `MicrositePage`).

## 4. Canonical Data Model
Distinguishing core platform models from vertical models:

### Core Models
- **Person**: The universal human identity.
- **Organization**: The tenant boundary.
- **Location**: A physical subset of an Organization.
- **Membership**: Grants a Person access to an Organization.
- **Relationship / CustomerData**: Defines how a Person interacts with an Organization as a client/customer.
- **Wallet / Transaction / Payment / LedgerEntry**: The shared financial engine.
- **Notification**: Shared cross-platform alert system.

### Vertical Models (Examples)
- **CityMart (Retail)**: `RetailOrder`, `RetailProduct`, `RetailStockMovement`.
- **SchoolOS**: `SchoolGrade`, `ClassEnrolment`, `StudentNote`.
- **HotelOS**: `HotelRoom`, `Reservation`, `FolioCharge`.
- **RestaurantOS**: `MenuItem`, `RestaurantOrder`, `RestaurantTable`.

## 5. Tenancy Architecture
- **Organization Scoping**: ALMOST ALL resources belong to an `organizationId`. Server actions validate access to the requested `organizationId` via `requireMembership(organizationId)`.
- **Location Scoping**: Physical resources (Registers, Shifts, Orders, Inventory) are optionally bound to a `locationId` nested within the `organizationId`. Location-scoped RBAC is modeled (`MembershipLocation`) but currently organization-level membership implicitly grants access to all its locations.
- **Authorization Boundary**: The tenant boundary is strictly enforced server-side. Clients cannot query data outside their authorized `organizationId`.

## 6. Authentication Architecture
- **Session Flow**: NextAuth issues a JWT session.
- **Identity Resolution**: `lib/actions/tenant.ts` provides `requireAuthenticatedAccount()`, which resolves the canonical `Person` via `session.user.email` and `PersonIdentifier`.
- **Role Verification**: Server actions explicitly call `requireMembership(organizationId, ['ROLE1', 'ROLE2'])`. This ensures the session's `Person` possesses a `Membership` in the `Organization` with the required role before proceeding.

## 7. Financial Architecture
CityOS implements a double-entry-like unified ledger:
- **Wallet**: An account holding a balance for an Organization.
- **Transaction**: A logical grouping of financial changes.
- **Payment**: The record of funds captured (from cards, cash, etc.).
- **LedgerEntry**: Specific debits/credits applied to a Wallet.
Verticals process sales (e.g., `RetailOrder`) but settle funds globally by creating `Transaction` and `LedgerEntry` records against the organization's `Wallet`.

## 8. Notification Architecture
- Asynchronous alerts are handled via the `Notification` and `Notice` models.
- Real-time client updates are supported via Pusher (configured in `api/pusher/auth`).

## 9. Vertical Architecture
CityOS contains multiple industry applications. They share the Core but maintain isolated business logic:
- **CityMart (Retail)**: `lib/actions/retail.ts`. Point of Sale, Inventory Ledger, Purchase Orders, E-commerce.
- **RestaurantOS**: `lib/actions/restaurantos.ts`. Table management, Kitchen Display, Menus.
- **HotelOS**: `lib/actions/hotel.ts`. Front desk, housekeeping, room blocking.
- **SchoolOS**: `lib/actions/school.ts`. Gradebooks, attendance, student CRM.
- **Healthcare**: `lib/actions/healthcare.ts`. Prescriptions, patient data.
- **Events**: `lib/actions/events.ts`. Ticketing, scanners.
- **Services/Jobs**: `lib/actions/service.ts`, `lib/actions/business.ts`. Gig work, quotes, invoices.

*For specific details on a vertical, see `docs/verticals/[name].md`.*

## 10. Server Action Architecture
Server actions in `lib/actions/*.ts` follow a strict pattern:
1. **Authentication/Authorization**: Invoke `requireMembership(orgId)` to derive actor identity and verify tenant access.
2. **Validation**: Assert input correctness and cross-tenant data sanity (e.g., "does this location actually belong to this org?").
3. **Database Mutation**: Execute Prisma updates. Multi-step workflows (like checkout) MUST use `db.transaction()` to ensure atomicity.
4. **Revalidation**: Call Next.js `revalidatePath()` to refresh client UI.
5. **Return**: Return `{ success: true, data }` or `{ error: string }`.

## 11. Client/Server Boundary
**Server-Authoritative Data**: The following MUST be computed server-side and never trusted from the client payload:
- Actor identity (cashier/user).
- Resource ownership (who owns this ID?).
- Prices and Discounts (read from DB, not from cart payload).
- Inventory levels.
- Payment success state (if integrating external gateways).
- Financial totals (subtotal, tax, grand total).

## 12. Data Flow
1. **Authenticated User** clicks "Pay" in UI.
2. **Client Component** invokes a Server Action.
3. **Server Action** extracts `session.user` and verifies `Membership` for the `Organization`.
4. **Server Action** validates the target `Location`.
5. **Server Action** opens a `db.transaction()`.
6. **Server Action** calculates authoritative prices and verifies inventory constraints.
7. **Database** commits the Vertical models (e.g. `RetailOrder`) AND Shared models (e.g. `LedgerEntry`).
8. **Server Action** returns success to Client Component.

## 13. Known Architectural Constraints
- **Location Roles**: `MembershipLocation` is defined in the schema but not strictly enforced by `requireMembership`, meaning cashiers implicitly have org-wide location access.
- **Payment Gateways**: Manual payment methods (`CASH`, `CARD` via external terminal) are supported natively, but automated webhook-verified integrations (Stripe, Paystack) are not yet wired into the POS workflows.
