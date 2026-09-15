# Database Architecture

## Technology Stack
- **Database:** PostgreSQL hosted on Supabase.
- **ORM:** Prisma 8 (Prisma Next) utilizing the Contract-first data layer (`contract.prisma`).

## Schema Design Principles
1. **Global vs Tenant:** Clearly separate models that span the entire platform (`User`, `City`) from those strictly bound to a tenant (`HotelRoom`, `RetailOrder`).
2. **Tenant ID:** Every tenant-bound model MUST have an `organizationId` foreign key.
3. **Referential Integrity:** Ensure `onDelete: Cascade` is configured safely. Deleting an `Organization` should wipe its specific OS data, but NEVER cascade to delete a global `User`.
4. **Enums vs Tables:** Use enums for fixed, platform-level states (e.g., `TaskStatus`). Use tables for tenant-customizable classifications (e.g., `RetailCategory`).

## Migration Strategy (Prisma 8)
- Changes to `contract.prisma` must be evaluated for data loss.
- **Identity Migration Risk:** Moving from localized PII (`RetailCustomer.name`) to global identity (`User.name`) requires careful multi-step migrations:
  1. Add optional global linking fields (e.g., `userId` to `RetailCustomer`).
  2. Run backfill scripts to create shadow global `User` accounts for existing localized customers and link them.
  3. Update application code to read/write from the global `User`.
  4. Drop the localized PII columns from the tenant models.

## Supabase RLS
Because Supabase exposes PostgREST, Row-Level Security is the primary defense line.
- Policies must inspect the `auth.uid()` and cross-reference the `OrganizationMember` table to allow reading/writing tenant data.
- The Prisma client used by the backend must be configured to pass the tenant context to Postgres (e.g., via `set_config` or JWT claims) so RLS applies even to server-side ORM calls.
