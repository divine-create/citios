# ShopOS Upgrade — Phase 1 Report

Status: **Implemented & typechecked** · Build not run (dev server on :3001 — see Verification)
Deliverable of Phase 0: `SHOPOS_GAP_ANALYSIS.md` (17-area matrix).

---

## Implemented

**1a — Security (data-integrity fixes from the gap matrix §1–§5)**
- `createOrder` — products are fetched once, scoped to the sale organization (`RetailProduct.where({ organizationId })` → `Map`). Any product id outside the organization is rejected **before** any stock mutation; `quantity > 0` validated; order + line items + stock decrement wrapped in `db.transaction` (DB-tx, not app-level). Preserves the existing `!isWeighed && stockQuantity < qty` guard and item-snapshot semantics.
- `refundOrder` — status flip + stock restore wrapped in `db.transaction`; not-found / already-refunded throw inside the tx and surface as an error message.
- `getCustomers` — `PersonIdentifier` lookups are now scoped per relationship (`where({ personId: rel.personId })`, `Promise.all`) instead of a global `where({})` scan.

**1b — Dashboard** (`getShopDashboardData` + `DashboardView`)
- StatCards (Today sales/orders/customers, open register pulse), **Top Products** (top 5 by revenue), **Recent Orders** (6 latest completed, enriched), **Inventory Watch** (low-stock list), **Store at a Glance**, **Launch Checklist** driven by real settings flags, plus `EmptyState` (shared).
- Money formatted with `settings.currencySymbol`.

**1c — Global Search**
- `searchShopOS` action (products by name/SKU/barcode; customers per-relationship; orders by id/cashier/customer/item-name across the 15 most recent; staff via `getStaff`).
- `GlobalSearch.tsx` ⌘K palette: debounced (250 ms), Arrow/Enter/Esc, grouped results, deep-links to the matching tab.
- Keyboard shortcuts ⌘K/`/`; mobile search icon; fake bell badge removed (honest "notifications coming soon").

**1d — Navigation** — grouped, role-filtered sidebar (Overview / Sell / Catalog / Customers / Operations / Team / Admin); Reports + Website Builder entries.

**1f — Staff Management** — `updateStaffRole` + `removeStaffMember` actions:
- roles restricted to `ASSIGNABLE_STAFF_ROLES`; OWNER membership changes only by an OWNER actor; owner cannot be demoted or removed; removes `MembershipRole` rows then the `Membership`.
- UI: inline role `<select>`, remove with confirm, initials avatars, role chips.

**1g — Reports** — `getShopReports` (periods today/7d/30d via a `series(since)` cursor with `refundedAt ?? createdAt`), sales by product, sales by cashier (membership→person name cache), top customers, low stock, totals → `ReportsTab`.

**1e — Onboarding widget** — rewritten as an 8-step Daash-style live checklist (products, stock, location, customer, first sale, online store, delivery, store info) computed from real data counts, progress bar, "next step" hint + modal, deep-link CTAs (storefront → Website Builder), dismissible via `localStorage["shoPOS:onboarding:hidden"]`, hides when fully complete.

**1h — Empty states + currency pass**
- Empty states on Dashboard/Reports/Inventory (shared `EmptyState`).
- Currency symbol threaded from live `RetailSettings.currencySymbol` (₦ default for new Nigerian shops) through the POS terminal, inventory manager, and every tab in the dashboard shell (shift float, PO totals, expenses, sales/returns, customer totals, receipts already settings-driven).

## DB changes
None (Phase 1 is code-only; contract/migrations untouched). No new columns or tables.

## Security changes
- Cross-tenant guard on `createOrder` closes the worst item from the matrix (foreign org stock mutation).
- Order writes and refunds are transactional (no partial writes).
- `getCustomers` no longer performs org-agnostic global queries.
- Staff role mutations and membership removal are server-authorized and owner-protected; cashier identity comes from the session, never the client.

## Verification
- `npx tsc --noEmit -p .` — **clean** after every phase checkpoint, including the final widget rewrite.
- `eslint` — clean for new files (`GlobalSearch.tsx` was refactored to conditional mount to satisfy `react-hooks/set-state-in-effect`); untouched files pass. Pre-existing async-in-effect patterns in other files still trip that rule (build ignores lint).
- `npm run build` — **NOT run**: the dev server is live on `:3001` and would race the `.next` lock. Run after stopping the dev server.

## Limitations / not in this phase
- Functional/regression tests not executed this session (no test runner; server actions are session-gated via `requireMembership`, so a scripted client cannot drive them). Manual regression still needed: tenant isolation on `createOrder`, cashier permission model, stock decrement/restore, discount clamp, staff role authorization.
- No data mutations to the schema; the stale root `prisma/schema.prisma` still mirrors the same models (no changes needed).
- Resident Marketplace / CityDrive are explicitly out of scope (integration points only).

## Next phase (2)
- Supplier → PO → receiving → stock-in with stock history; delivery/dispatch flows; receipt historically (settings-driven); inventory adjustments with audit trail; notification center (in-app, honest).