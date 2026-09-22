# CityMart (Retail Vertical)

## Current State
Phase 1 (Production-Ready Core) is implemented. The core checkout, inventory, and shift workflows are structurally secure, idempotency-protected, and transactionally safe.

## Architecture
CityMart is the standard e-commerce and POS (Point of Sale) vertical for CityOS. It relies on the shared `Organization`, `Membership`, `Location`, and financial `Wallet` infrastructure.

## Models (Prefix: `Retail`)
- **Products & Inventory**: `RetailProduct`, `RetailCategory`, `RetailStockMovement`, `RetailSupplier`, `RetailPurchaseOrder`.
- **Point of Sale**: `RetailRegister`, `RetailShift`.
- **Checkout**: `RetailOrder`, `RetailOrderItem`, `RetailCoupon`.
- **Finance**: `RetailExpense`.

## Server Actions
Location: `lib/actions/retail.ts`
Key workflows:
- `createOrder`: Validates products, asserts stock constraints, processes discounts/taxes, creates the order, deducts inventory, records stock movements, and settles the wallet. Entirely wrapped in `db.transaction()` and protected by an `idempotencyKey`.
- `openShift` / `closeShift`: Manages cashier floats.
- `adjustStock`: Records immutable `RetailStockMovement` records for shrinkage/damage.
- `refundOrder`: Reverses orders, restores inventory, and logs the movement.

## Security & Tenancy
- Every action strictly calls `requireMembership(organizationId, [...roles])`.
- Lookups and mutations are scoped to the authenticated `organizationId`.
- Physical operations (Shifts, Registers, Orders, Stock Movements) support a `locationId`. The server validates that the `locationId` explicitly belongs to the `organizationId`.

## Financial Flows
- Order subtotals, taxes, and totals are computed strictly server-side using the canonical `RetailProduct.price`. Client-provided prices are ignored.
- Paid orders automatically map to the canonical CityOS `LedgerEntry` and `Wallet` if `walletSettlementEnabled` is true in `RetailSettings`.

## Inventory
- Inventory mutation strictly follows an immutable ledger pattern (`RetailStockMovement`).
- Stock is never masked with `Math.max(0, current - qty)`.
- Concurrent overselling is prevented by asserting `stockQuantity < requested` inside the `db.transaction()` block.

## Current Limitations & Known Risks
- **Location UI**: The database enforces `locationId` constraints securely, but the frontend UI currently does not prompt the user for locations, meaning transactions safely fall back to `null` (the default org-wide branch).
- **Location Roles**: `MembershipLocation` is not yet enforced by `requireMembership`, meaning cashiers implicitly have org-wide location access.
- **Payment Gateway**: `CARD` payments rely entirely on the cashier's manual confirmation of a standalone POS terminal. True cryptographic verification requires Phase 2 integration with Stripe Terminal or Paystack webhooks.

## Phase 2A: True Multi-Location Operations
**Active Location Context**:
- CityMart introduces an explicit active location context. A user selects their operating location, and operations (shifts, orders, stock adjustments) are bound to it.
- **Null Fallback Removal**: `locationId` is no longer treated as `null` (organization-wide fallback) for physical operations (Orders, Shifts, Stock). These now explicitly require an active location if the organization has locations.
- **Server Validation**: The backend rigorously verifies that the selected `locationId` exists and belongs to the authenticated `organizationId`.

**Inventory Location Model**:
- *Reason for Schema Change*: Phase 1 stored `stockQuantity` directly on `RetailProduct`, meaning inventory was organization-wide. To support true multi-location retail without duplicating the global product catalog, a schema change was required.
- *Schema Addition*: `RetailLocationStock` bridges `RetailProduct` and `Location`, holding `stockQuantity` per location.
- *Backward Compatibility*: If a business has no locations, it relies on the global `RetailProduct.stockQuantity`. If it uses locations, stock mutations target `RetailLocationStock`.

**Known Phase 2A Limitations**:
- *RBAC Limitation*: Cashiers still hold organization-wide location access as `MembershipLocation` RBAC is not yet strictly enforced. An authorized user can freely switch their active location among the organization's branches.

## Completed Work
- Eliminated all inventory race conditions in `createOrder`.
- Enforced global unique checkout idempotency.
- Closed cross-tenant vulnerabilities in `openShift` and `adjustStock`.
- Eliminated silent fail/mock data fallbacks in the product.
