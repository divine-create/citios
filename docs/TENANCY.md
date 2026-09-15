# Tenancy Architecture

## The Organization Model
In Citios, tenancy is mapped 1:1 with the `Organization` model. Every business, school, hospital, or municipality using the platform is an `Organization`.

## Tenant Isolation
To ensure strict data isolation across the platform:
1. **Foreign Key Requirement:** Every domain-specific model (e.g., `HotelRoom`, `SchoolClass`, `RetailProduct`, `Task`) MUST have an `organizationId` column referencing the `Organization` table.
2. **Row-Level Security (RLS):** Because the platform shares a unified Postgres database (via Supabase), tenant isolation is enforced at the database level using RLS policies. Queries automatically scope to `organizationId = current_org_id()` or equivalent JWT claims.
3. **No Cross-Tenant Queries:** Application code should never need to filter by multiple `organizationId`s simultaneously unless performing platform-level admin tasks.

## The Global Exception
Certain models are intentionally cross-tenant (Global) and do not have an `organizationId`:
- **Identity:** `User`, `Account`, `Session`
- **Location:** `City`
- **Platform Infrastructure:** Some `Wallet` records (Resident wallets are global, Organization wallets are tenant-bound), global `Transaction` ledger.

## Data Ownership
- **Tenant Data:** Data tied to an `organizationId` is strictly owned by that organization (e.g., a school's grades, a shop's inventory, a hotel's reservations). If an organization deletes its account, this data is purged.
- **Global Data:** Data tied to a `userId` is owned by the resident (e.g., their universal profile, their wallet balance). If an organization deletes its account, the resident's global identity remains untouched.

## Current Vulnerabilities
- `Task` has an optional `organizationId`. If it's a P2P task (Resident to Gig Worker), there is no organization. This requires special RLS handling since it's a global entity.
- Some models (like `Ticket` and `Booking`) lack `organizationId` but reference `Event` or `RentalResource`. To enforce strict RLS and avoid complex joins in policies, denormalizing `organizationId` onto `Ticket` and `Booking` is highly recommended.
