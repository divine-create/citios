# Subagent Task: Phase 4 Merchant UI

You are completing Phase 4 (UI/UX) for the Merchant Experience.

**Backend is fully implemented.** Do NOT modify `app/actions/commerce.ts`, `app/actions/orders.ts`, or `lib/actions/retail.ts`.

Files to modify:
1. `components/retail/InventoryManager.tsx`:
   - Enhance the product creation/edit form to support Variants.
   - If a product has variants, the merchant should be able to specify them (e.g., Size M, Size L). 
   - Under the hood, variants are just `RetailProduct` records with `parentId` set to the main product's ID, and `variantName` set to the variant's name. You may need to create a UI to add child products when creating/editing a product, and save them.

2. `components/retail/ShopDashboard.tsx`:
   - Add an **Analytics** tab.
   - In `ShopDashboard.tsx`, there's a `<TabsList>` and `<TabsContent>`. Add a new tab `value="analytics"` called "Analytics".
   - Use the `getShopAnalytics(organizationId)` function from `@/lib/actions/retail` to fetch data and display Gross Sales, Net Sales, Refunds, Total Orders, etc., in the Analytics tab.
   - In the **Orders** tab (already inside `ShopDashboard.tsx`), enhance the order details view.
   - Show `fulfillmentStatus` (PROCESSING, READY, FULFILLED) and `delivery.status` if available.
   - Add buttons for 'Cancel Order' and 'Process Refund'. Call `cancelOrder(order.id)` and `refundOrder(order.id, 'Merchant requested')` from `@/lib/actions/retail`.

Deliverable:
Apply the UI changes using `replace_file_content` or by writing helper scripts. Ensure the files compile (`npx tsc --noEmit`).
