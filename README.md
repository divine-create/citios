# CityOS

CityOS is a unified city-wide digital ecosystem connecting residents, businesses, and organizations through a shared operational layer.

## What is CityOS?

Rather than navigating dozens of separate apps, a resident accesses a hyper-local ecosystem where their identity, payments, and interactions map directly to the organizations operating in their city. 

CityOS is the single underlying architecture that powers this.

```
Resident
  ↓
CityOS Platform
  ↓
Shared City Entities (Authentication, Payments, Organizations)
  ↓
Organization Operational OS (ShopOS, ServiceOS)
  ↓
PostgreSQL
```

## The CityOS Ecosystem

### Resident-Facing Surfaces
Residents discover and interact with the city through integrated frontend surfaces:
* **CityMart & CityFood:** Retail and dining.
* **CityServices & CityJobs:** Service bookings and local employment.
* **CityHealth, CityHomes, CitySchools:** Specialized verticals for daily needs.
* **CityCommunity & Newsfeed:** Social connectivity.
* **Map:** Hyperlocal discovery.

### Organization Operational Systems
When a resident acts on a surface, the data flows into purpose-built tools for organizations:
* **ShopOS:** Order fulfillment, inventory, and retail tracking.
* **ServiceOS:** Service requests, quotes, technician dispatch, and invoicing.
* **SchoolOS:** Student management and operations.

## What Is Working Today

CityOS is actively being migrated from a static frontend demo into a robust, PostgreSQL-backed architecture.

### Production-backed (Live)
* **Real Authentication:** Server-side authentication (`NextAuth`), binding to canonical `Person` and `Organization` records.
* **Commerce Vertical:**
  - Real `RetailOrder` mutation.
  - Server-side price calculation and organization routing.
  - `ShopOS` workspace with database visibility and strict role-based access control (RBAC).
  - Secure resident `CityProfile` order history.
* **Service Requests Vertical:**
  - `ServiceJob` initialization tied to `ServiceCatalogItem` and `CustomerData`.
  - Secure resident submission of service requests.
  - `ServiceOS` workspace reflecting live resident requests.

### Demo / Transitional
* Certain OS workspaces (SchoolOS, WorkOS) and surfaces (CityHomes, Jobs, Events, Newsfeed).
* Later stages of ServiceOS (quotes, assigning technicians, generating invoices).
* True financial payment gateways (currently uses a simulated `CityPay` wallet).

## Architecture

The system uses a strict data isolation and validation pattern:
```
Next.js (App Router)
  ↓
NextAuth (JWT session bindings)
  ↓
Server Actions (Domain operations & RBAC)
  ↓
Prisma Next (Prisma 8 ORM / PostgreSQL)
```

**Key Security Characteristics:**
- **Server-side Authentication:** User IDs and roles are securely extracted from the `getServerSession` JWT, never trusted from client payloads.
- **Server-side Pricing:** Transaction totals and item verifications are fetched natively from the database; client-supplied prices are strictly rejected.
- **Organization Isolation:** Workspace queries enforce `session.user.memberships` mapping against the requested `orgId`.

## Demo Accounts

The project includes an active frictionless demo environment. When exploring the app, the "Switch Account" menu (bottom-left) allows you to log in as development users:
* **David** (Resident)
* **Amina** (Resident)

**Note on Security:** Demo access accounts use a fallback `CredentialsProvider`. This provider is strictly configured to be disabled in a production environment (`NODE_ENV === "production"`). It cannot be used as a backdoor in a live deployment.

## Local Development

To reproduce the project locally:

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Fill in your DATABASE_URL for a PostgreSQL 15+ instance
```

3. **Database setup & migrations:**
```bash
npx prisma-next migrate reset   # Or npx prisma-next db migrate
```

4. **Run Seed Scripts:**
```bash
npx tsx scripts/seed.ts
npx tsx scripts/seed-services.ts
```

5. **Start Application:**
```bash
npm run dev
```

## Project Structure

* `app/`: Next.js 15 App Router endpoints and pages.
* `app/actions/`: Secure server actions containing domain and database logic.
* `components/cityos/`: Modular frontend UI components.
* `src/prisma/`: Prisma 8 (`@prisma/orm-postgres`) data contract definitions and emitted assets.
* `scripts/`: Data seeding and utility scripts.
* `lib/`: Configuration and demo fallback logic.

## Database

CityOS uses a canonical **Prisma 8** data contract (`contract.prisma`) mapping to a PostgreSQL instance. The architecture shares a master schema to guarantee referential integrity across disparate operational surfaces.

## Roadmap
- **Commerce:** Completed and hardened.
- **ServiceOS:** Completed and hardened.
- **SchoolOS:** Next up for migration.
- **Jobs / Events / Social:** Subsequent.

## License
Proprietary / Internal CityOS.
