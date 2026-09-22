# CityOS Data Architecture Reference

## 1. Source of Truth
The canonical source of truth for all database modeling is the Prisma contract located at:
`src/prisma/contract.prisma`
All database operations use Prisma 8 (Prisma Next) via `db.orm.public.*`.

## 2. Core Entities
The platform relies on a shared set of core entities that model the physical and digital city:
- **Person**: The universal human identity record.
- **Relationship**: Connects a Person to an Organization (e.g., as a guardian, customer, or employee).
- **CustomerData**: Extended metadata for a Relationship acting as a client/customer.
- **Organization**: The primary tenant and business entity (e.g., a specific Restaurant, School, or Retailer).
- **Membership**: Links a Person to an Organization as an internal actor (staff/owner). Contains `MembershipRole` records.
- **Location**: A physical geographic branch belonging to an Organization.
- **Wallet**: A financial balance container for an Organization.
- **Transaction**: A logical financial operation.
- **Payment**: A record of received funds.
- **LedgerEntry**: Specific debits and credits applied to a Wallet linked to a Transaction.

## 3. Identity Model
CityOS maintains a **single universal identity** (`Person`).
- Verticals MUST NOT create isolated identity tables (e.g., `RetailCustomer`, `SchoolUser`).
- To model a customer, a vertical links a `Person` to an `Organization` via a `Relationship` (type: `CUSTOMER`), utilizing the `CustomerData` table.

## 4. Organization Model
`Organization` is the absolute boundary for tenancy. ALMOST all tables in CityOS contain an `organizationId` foreign key. Lookups and mutations must always be scoped by this ID to ensure data isolation.

## 5. Membership Model
Access control is granted via `Membership`.
- A `Person` holds a `Membership` in an `Organization`.
- The `Membership` has one or multiple `MembershipRole`s (e.g., `OWNER`, `CASHIER`, `TEACHER`).
- Server actions verify these roles using `requireMembership(organizationId, ['ROLE'])`.

## 6. Location Model
A `Location` represents a physical branch of an `Organization`.
- Resources that exist physically (e.g., `RetailRegister`, `RetailShift`, `RetailStockMovement`, `RetailOrder`) maintain an optional or required `locationId` foreign key.
- Resources that exist globally for the business (e.g., `RetailProduct`, `Wallet`) are tied only to the `Organization`.

## 7. Financial Data
The shared financial engine prevents verticals from inventing conflicting accounting logic.
- **Wallet**: Holds the actual balance.
- When an order completes (e.g., `RetailOrder`), the system generates a `Transaction` (e.g., reference "RET-1234").
- A `LedgerEntry` is created to credit the Organization's `Wallet`.
- Verticals manage their specific receipts/orders, but all monetary settlement flows into this unified ledger.

## 8. Vertical Data
Vertical-specific models sit on top of the shared core and prefix their tables for clarity.
- **CityMart (Retail)**: `RetailOrder`, `RetailProduct`, `RetailExpense`, `RetailStockMovement`.
- **RestaurantOS**: `RestaurantOrder`, `MenuItem`, `RestaurantTable`.
- **SchoolOS**: `SchoolClass`, `StudentData`, `Gradebook`.
**Principle**: Vertical models reference canonical CityOS entities. For example, `RetailOrder.customerDataId` points to the canonical `CustomerData` table, and `RetailOrder.cashierId` points to the canonical `Membership` table.

## 9. Referential Integrity
- **Foreign Keys**: Enforced at the database level by Prisma relations.
- **Cascade Deletes**: Used carefully (e.g., deleting an Organization cascades to its Locations).
- **Unique Constraints**: Used for idempotency (`@unique` on `RetailOrder.idempotencyKey`) and logical deduplication (`@@unique([membershipId, role])`).

## 10. Data Lifecycle
- Immutable logs: Tables like `RetailStockMovement` and `LedgerEntry` are append-only. They track *deltas* (changes) rather than just overriding state, enabling perfect historical audits.
- Hard deletes vs Soft deletes: Routine data (like Products) can often be hard deleted, but financial data or historical records (Orders) should never be deleted.

## 11. Production Data Rules
- The database is the authoritative source. UI state must always reflect the DB.
- **No Mock Data**: Do not embed arrays of fake data into the components. If the database is empty, the UI must show an empty state. 
- Seed scripts (`scripts/simulate*.ts`) exist explicitly for injecting test data during development.

## 12. Schema Change Rules
1. **Inspect**: Check if a canonical model already handles the requirement before adding a new table.
2. **Modify**: Edit `src/prisma/contract.prisma`.
3. **Compile**: Run `npm run contract:emit`.
4. **Verify**: Ensure `contract.json` and `contract.d.ts` reflect the changes.
5. **Commit**: Commit both the schema and the generated artifacts. Do NOT manually edit the generated output.
