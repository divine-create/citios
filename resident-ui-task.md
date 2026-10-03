# Subagent Task: Phase 4 Resident UI

You are completing Phase 4 (UI/UX) for the Resident Shopping Experience.

**Backend is fully implemented.** Do NOT modify `app/actions/commerce.ts`, `app/actions/orders.ts`, or `lib/actions/retail.ts`.

Files to modify:
1. `components/cityos/CartView.tsx` & `components/cityos/CheckoutView.tsx`:
   - Currently, they don't display product variants properly.
   - Update the UI to display the `variantName` if the item is a variant. (The backend `RetailOrderItem` has `productId` and we might need to display the variant name if the item added was a variant. Wait, the cart already has `name` which I updated to include variantName in ProductDetail! So just ensure the cart displays it cleanly).
   - Ensure the empty cart and loading states match CityOS design.

2. `components/cityos/ResidentOrders.tsx`:
   - Add a detailed view or expander for each order to show the full lifecycle.
   - Display `fulfillmentStatus` (e.g., PENDING, PROCESSING, READY, FULFILLED, CANCELLED).
   - Display LogisticsOS `delivery` state (e.g., driver assigned, picked up, in transit, delivered).
   - Add a 'Cancel Order' button for orders that are `PENDING`. This should call `cancelOrder(orderId)` from `@/lib/actions/retail`.
   - Add a 'Request Refund' button for orders that are `COMPLETED` or paid but not refunded. This should call `refundOrder(orderId, 'User requested')` from `@/lib/actions/retail`.
   - Handle idempotency (disable buttons while loading).
   - Do NOT mock states. Use the data from `order` (which now includes `.delivery` and `.status` and `.fulfillmentStatus`).

Deliverable:
Apply the UI changes using `replace_file_content` or by writing helper scripts to modify the components. Ensure the files compile (`npx tsc --noEmit`).
