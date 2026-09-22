# Phase 1B Current State Audit

## What Already Exists

### Database Models (contract.prisma)
- **Commerce & Payments:**
  - Payment: Canonical model containing mount, currency, method (WALLET, CARD, TRANSFER), status, provider, eference, providerReference, and idempotencyKey.
  - PaymentEvent: Canonical webhook processing model (providerEventId, 	ype, payload).
- **Wallets & Ledger:**
  - Wallet, Transaction, LedgerEntry provide a robust ledger foundation.
- **Vertical-Specific Order/Invoice Models:**
  - **Retail:** RetailOrder, RetailOrderItem, RetailRegister, RetailShift.
  - **Restaurant:** RestaurantOrder, OrderItem.
  - **Services:** ServiceJob, ServiceAppointment, ServiceInvoice.
  - **School:** FeeInvoice, FeePayment.
  - **Hospitality:** Reservation, OutletOrder, FolioCharge.
  - **Healthcare:** PharmacyOrder.
- **Logistics & Tasks:**
  - DeliveryJob linked to RestaurantOrder.
  - Task for PASSENGER_RIDE, FOOD_DELIVERY, PACKAGE_DELIVERY, SERVICE_DISPATCH.

### Action Logic (lib/actions/*)
- **Retail Idempotency:** Implemented locally in lib/actions/retail.ts. It manually checks if a RetailOrder with the same idempotencyKey and payload exists.
- **Retail Refunds:** Handled entirely in etail.ts. Reverses inventory (writes a negative RetailStockMovement), changes RetailOrder status to REFUNDED, and sends a notification. No interaction with an actual payment gateway yet.
- **Restaurant Debt:** lib/actions/restaurantos.ts notes a **"PHASE 1B DEBT"** where OrderStatus is currently used as a proxy for PaymentStatus. A COMPLETED order counts as paid, which is unsafe.
- **Paystack Integrations:** Currently non-existent. There is no lib/actions/paystack.ts or similar module managing real API calls to payment gateways.

---

## What is Reusable
- **Canonical Payment Infrastructure:** Payment and PaymentEvent models are designed exactly for a shared infrastructure and should be the central anchor for Paystack webhooks.
- **Ledger System:** Wallet, Transaction, and LedgerEntry can remain as the source of truth for internal balance settlements.
- **Idempotency Keys:** The schema already provides idempotencyKey on Payment and RetailOrder to prevent duplicate processing.

---

## What is Duplicated
- **Payment State Management:** Verticals manage payment statuses independently:
  - RestaurantOrder relies on paymentMethod and operational status.
  - RetailOrder relies on paymentMethod and status (PENDING, COMPLETED, REFUNDED).
  - Reservation uses paymentStatus.
  - FeeInvoice creates FeePayment records.
- **Refund Logic:** Written custom for Retail (inventory restoration + order update), but will eventually be needed by every vertical that accepts payments.

---

## What is Unsafe
- **Coupling of Operational and Financial State (The Restaurant Debt):** Using an order's operational fulfillment status (COMPLETED) to assume payment settlement is highly unsafe and creates reconciliation nightmare scenarios.
- **Missing Gateway Integrations:** Current payment flows are completely disconnected from real-world money movement. They assume trust in the client or cashier input without provider verification.
- **Atomicity Risks:** Refund operations are handled in JavaScript logic but must be strictly wrapped in transactions (db.transaction()) with strict constraints when money is involved.
- **Manual Idempotency Checks:** Relying on JavaScript if blocks for idempotency inside the retail action layer can be prone to race conditions if not tied into the database's unique constraints during a transaction.

---

## What Should Become Canonical
- **Centralized Payment Action Layer:** A new lib/actions/citypay.ts (or similar) should handle all Paystack API calls, webhook verifications, and updates to the Payment and PaymentEvent models.
- **Standardized Payment States:** All vertical models (like RetailOrder, RestaurantOrder, FeeInvoice) should defer their payment state to their linked Payment record or adopt a strictly enforced separate paymentStatus field that only the canonical payment module can update.
- **Global Idempotency:** Extract idempotency handling into a shared utility rather than maintaining it manually inside etail.ts.

---

## What Should Remain Vertical-Specific
- **Orders, Invoices, and Folios:** The structure of a RetailOrder vs a FeeInvoice vs a FolioCharge is correctly domain-specific and should not be merged.
- **Operational Statuses:** Order fulfillment statuses (PREPARING, READY, DELIVERING) should remain owned by the vertical.
- **Inventory/Stock Management:** Triggering a RetailStockMovement during a refund or sale is specific to Retail and should remain in the vertical action layer, though triggered via an event or transaction callback from the payment layer.

---

## What Should Be Deferred
- **Wallet Settlements:** The RetailSettings.walletSettlementEnabled flag hints at future CityPay functionality (Phase 7). Complex automated wallet payouts or multi-party escrows should be deferred until the core payment gateway is stable.
- **Cross-Vertical Cart Checkouts:** Standardize single-vertical payments first before attempting to build a unified cart that checks out an Event Ticket, Retail Product, and School Fee in one transaction.
