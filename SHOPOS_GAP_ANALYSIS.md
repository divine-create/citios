# ShopOS Gap Matrix — Phase 0 Forensic Analysis

Prepared as the first deliverable of the ShopOS upgrade effort, using **Daash** (see
`DAASH_RESEARCH.md`) as the primary feature/UX reference. This document classifies the
state of 17 ShopOS capability areas **before** any code is changed this effort, so the
improvement phases that follow are measurable.

Property data is based on direct reads of:

- `src/prisma/contract.prisma` (the live contract)
- `lib/actions/retail.ts` (server actions, 1,218 lines)
- `lib/actions/shopos.ts` + `lib/actions/tenant.ts` (provisioning + authn/z helpers)
- `app/(admin)/grocery/page.tsx` (ShopOS entry route + role gate), `picker` page
- `components/retail/*` (ShopDashboard 1,598 lines, POSTerminal, InventoryManager,
  Settings, ShopOnboardingWidget, ReceiptModal)
- `lib/actions/microsite.ts` / `business.ts` / `app/site/[slug]` (storefront path)

## Classification legend

- **EXISTS** — implemented and working (not necessarily polished)
- **PARTIAL** — exists but with meaningful scope/UX limits
- **MISSING** — not present in code or contract
- **UNSAFE** — present but violates the security/consistency bar (must fix)
- **NEEDS UX** — functionally present but UX below the Daash-quality bar
- **GATED** — will not be implemented in this phase by explicit scope decision

---

## Matrix

| # | Area | Status | What exists | Key gaps vs Daash / quality bar |
|---|------|--------|-------------|--------------------------------|
| 1 | **Dashboard** | PARTIAL / NEEDS UX | KPIs only: Gross Sales, Transactions, Refunds, Net Sales (today), low-stock alert, open-shift chip, onboarding widget | No top products, no recent orders, no customer activity, no order trend, no revenue comparison, no storefront status, no empty-state story |
| 2 | **POS Terminal** | EXISTS / PARTIAL | Product grid, category filter, product search, cart with stepper, item discount, tax (settings `taxRate`), CASH/CARD, customer picker, isWeighed float-qty input, auto stock decrement, receipt modal after sale, empty-cart state | No SPLIT-payment UI (SPLIT is accepted by the action), no tender/change screen, no per-item discount reason, no quick-add customer, no offline mode |
| 3 | **Orders** | PARTIAL / UNSAFE | `Sales & Returns`: status filter (COMPLETED/REFUNDED), search (id/cashier/item name), view modal, refund with reason restores stock, totals cards | Reference = `#` + first 8 chars of uuid (no order number); no pagination; no CSV export; **no product↔org ownership validation before stock decrement (cross-tenant stock mutation — see UNSAFE §1); order+items+stock writes are not transactional**; no channel (POS/online), no scheduled/delivery, no void |
| 4 | **Products** | PARTIAL | Full CRUD: name, sku, barcode, category, price, cost, stock, low-stock level, unit, isWeighed, image upload, category CRUD; search; low-stock tag | No variants, no active/inactive, no per-storefront visibility, no collections, no bulk ops, no CSV import/export, no stock history, category parent dropdown not wired in UI |
| 5 | **Inventory** | PARTIAL / UNSAFE | `adjustStock(productId, delta)` clamps ≥ 0; stock decremented on sale, restored on refund; low-stock count on dashboard; custom units in settings | **No stock movement/audit ledger (model missing)**; low-stock list UI does not exist; read-modify-write stock update is racy under concurrent cashiers; no per-location stock; no reorder guidance |
| 6 | **Customers** | PARTIAL / UNSAFE | CRUD, search, 360 modal (order history, loyalty points adjust), total spent/orders/last visit enrichment | **`getCustomers` queries `PersonIdentifier.where({})` across all tenants (UNSAFE §2)**; no tags, no address, no birthday, no auto-points accrual on sale, no SMS bridge |
| 7 | **Staff** | PARTIAL | List w/ roles, add by email+role (MANAGER/CASHIER/INVENTORY_STAFF), role-gated nav | No role editing, **no removal**, no activation toggle, no owner protection beyond nav gating, no role history; `MembershipRole.role` is a free string, per-action role lists are ad hoc |
| 8 | **Locations** | PARTIAL | Create + list (name + address) via generic `Location` | No edit/delete/activate, no HQ, no staff assignment, no per-location stock/orders/reporting, no storefront visibility |
| 9 | **Discounts / Promotions** | MISSING | Only per-order `discountAmount` clamped `[0, subtotal]` in POS/action | No discount presets/Coupon model, no type (fixed/percent), no promo scheduling, no "best deal" logic, no saved discount library, no per-item discount UI |
| 10 | **Storefront** | EXISTS | `provisionShopOS` creates Microsite (auto-published), themes (minimal/innovator/warm/playful/editorial), Website Builder in `/business/website`, retail-products section via `RetailCategoryPicker`, rendered at `/site/[slug]` | No generate→preview→publish flow (auto-published at provision); no per-product visibility; storefront management is inside the generic Website Builder, not ShopOS; no inventory display control; onboarding/site copy duplicated |
| 11 | **Delivery** | MISSING | `RetailSettings.shippingRates` (JSON) only | No Delivery model, no zones, no fees per zone, no scheduled delivery, no pickup/delivery choice, no order-level delivery status, no address capture at checkout |
| 12 | **Payments** | PARTIAL | Cash & card *recording* at POS; `paymentGateway`/`bankDetails` fields; Settings payment tab says "coming soon" (recent) | No real gateway (correctly not faked), no split UI, no tendered/change, no CityPay/Wallet integration for retail orders, no refund-money-path, no payment audit beyond order status |
| 13 | **Reports / Exports** | MISSING | Dashboard KPIs, expense summary, shift discrepancy, per-shop KPIs — none expose a "Reports" surface | No sales-by-product, no sales-by-cashier, no period comparison (7d/30d), no CSV export, no low-stock report view, no tax summary |
| 14 | **Global Search** | MISSING | Static non-functional "Search..." input in the header | No ⌘K/"/" palette, no server-search across products/customers/orders/staff, no results UI |
| 15 | **Notifications** | MISSING | Static bell with a fake red dot | No notification model, no low-stock/refund/shift events, no read/unread, no empty state |
| 16 | **Settings** | EXISTS | General/payment/shipping/unsub-units tabs: store name/address/currency/receipt message/tax, bank details, rates JSON, custom units | No storefront domain/SEO/footer wiring here, no tax-on-invoices region defaults, no behavior toggles (auto-restock on refund is implicit), no receipt watermark |
| 17 | **Onboarding** | PARTIAL / NEEDS UX | 4-step banner + modal that flag `has*` booleans and deep-link to Settings; wait, "Add products" links to Products | Tasks don't detect real completion (they mark flags), no first-sale/publish/team tasks, not dismissible, no explainer per task beyond one line |

---

## UNSAFE items (must fix first, before feature work)

1. **Cross-tenant stock mutation in `createOrder`** (`lib/actions/retail.ts:441`).
   Products are resolved globally by `id` and their stock is decremented with **no check that
   `product.organizationId === input.organizationId`**. A member of org A can craft a cart
   containing org B's `productId`s and mutate org B's stock — inventory corruption across
   tenants. Fix: validate every line item belongs to the sale's org (single org-level fetch,
   fail fast otherwise).

2. **Non-transactional order writes** (`createOrder`, `refundOrder`). Order + line items +
   stock updates run as sequential awaits; an error mid-way leaves orphan orders/item with
   stock already decremented (or not). Fix: wrap the write path in `db.transaction(async (tx) => …)`
   using `tx.orm.public.*` (supported by `@prisma/orm-postgres` runtime).

3. **Cross-tenant read amplification** (`getCustomers` line 933, `PersonIdentifier.where({})`).
   Fetches every person identifier in the database into a single tenant request. Scope by the
   customers' own `personId`s.

4. **Racy stock decrement.** Read-then-write on `stockQuantity` can oversell under two
   concurrent cashiers. Mitigate inside the transaction and document a proper
   `UPDATE … WHERE stockQuantity >= qty` atomic path for the post-transaction layer.

5. **Auto-published storefront at provision.** `provisionShopOS` publishes the Microsite with
   default copy the moment a store is created, before the merchant curates anything — the 
   "publish" step claimed by onboarding is not real. Not a security hole, but inconsistent with
   the promised flow and with the No-Fake-Data rule.

## Non-goals this effort (explicit scope decisions)

- No new postgres schema/migration in Phase 1 (everything above is implementable on the live
  contract; candidate schema adds — Delivery, stock ledger, Coupon, order reference — are
  captured in `IMPLEMENTATION_TODO.md` for a later contract-change phase).
- No Resident Marketplace, no CityDrive/delivery integration, no real payment gateway claims.
- No empty "AI Assistant" button.

## Phase plan (driven from this matrix)

1. Fix UNSAFE §1–§4 (org-validated, transactional order write; scoped identifier query).
2. Dashboard + Onboarding + Navigation + Global Search + Empty States (this is Phase 1).
3. Products/Inventory polish incl. stock ledger UI, low-stock report.
4. Customers/Staff (removal, role edits, owner protection) + Locations + Discounts.
5. Storefront publish flow + visibility + delivery readiness + Payments prerequisites.
6. Reports/Exports (7/30-day windows, CSV) + Notifications foundation + AI integration points.
7. CityConnect data connection (storefront exposure, wallet/ledger settlement).