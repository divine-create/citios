# CityOS Architecture Contract

1. Platform Model
2. Core Identity
3. Shared Infrastructure
4. Vertical Architecture
5. Resident Layer
6. HQ
7. Transaction Lifecycle
8. Server Authority
9. Database Architecture
10. Data Integrity
11. Server Action/API Boundary
12. No Parallel Core Systems

CityOS Core
→ Shared Infrastructure
→ Vertical OS
→ Resident Experience
→ HQ / Administration

Person
→ Membership
→ Organization
→ Location

- Authentication
- Person
- Organization
- Membership
- Location
- Customer relationships
- Wallet
- Transaction
- LedgerEntry
- Payment
- PaymentEvent
- Notification
- Asset
- Microsite
- authorization
- tenant isolation

- ShopOS
- RestaurantOS
- SchoolOS
- HotelOS
- LogisticsOS
- HealthOS
- Services/WorkOS

Resident Experience consumes vertical capabilities and does not duplicate vertical backend logic.

HQ provides platform-level operational visibility.

DISCOVER
→ REGISTER
→ CONFIGURE
→ OPERATE
→ TRANSACT
→ PAY
→ FULFILL
→ TRACK
→ COMPLETE
→ SETTLE
→ ANALYZE

Server authority, transaction integrity, idempotency, concurrency, and the canonical Prisma contract are enforced.

src/prisma/contract.prisma

is the canonical schema source of truth.
