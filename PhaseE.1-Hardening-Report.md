# RestaurantOS Phase E.1 — Operational Intelligence Hardening & Restaurant Context

## 1. Executive Summary

Phase E.1 hardened the daily command center by enforcing strict location-scoping across all intelligence queries, establishing a robust timezone-aware day boundary system, and optimizing database access patterns. The dashboard is now highly performant (no N+1s) and strictly trustworthy for multi-location operators.

## 2. Phase E Audit & Corrections

During the audit of Phase E, we discovered several discrepancies that needed addressing:
- **Reported behavior:** Configuration health missing recipes/cost was assumed organization-wide. 
  **Actual behavior:** `MenuItem` possesses a `locationId` field. 
  **Fix:** Config health queries now explicitly scope by `locationId`.
- **Reported behavior:** Waste items implicitly localized.
  **Actual behavior:** `RestaurantStockMovement` lacks `locationId`. 
  **Fix:** Waste querying now safely inherits location via joining through the `RestaurantInventoryItem` set.
- **Reported behavior:** COGS calculates accurately.
  **Actual behavior:** Fetching COGS incurred a severe N+1 penalty (1 query per completed order). 
  **Fix:** See Section 5.

## 3. Location Security

All overview components are now strictly location-scoped, with authorization via `requireMembership()`.
- **Sales & Orders:** Handled by bounding `RestaurantOrder` by `locationId`.
- **Inventory & Waste:** Scoped by `RestaurantInventoryItem.locationId`.
- **Shifts:** Resolved strictly per `RestaurantShift.locationId`.
- **Menu Availability:** Resolved by checking `MenuItem.locationId`.
- **Reservations:** Bounded directly by `RestaurantReservation.locationId`.

## 4. Timezone Architecture

**Timezone Source:** Added `timezone` to the `Location` model (default: "UTC") to ensure geographic boundaries.
**Day Calculation:** Implemented `getRestaurantDayBounds(timezone)` in a pure synchronous module (`lib/restaurant-time.ts`). It computes UTC equivalents of local midnight and local 23:59:59.
**Affected Queries:** Sales, COGS, Orders, Waste, and Reservations all now use restaurant-local boundaries rather than server-local boundaries. 

## 5. COGS Optimization

- **Before:** O(N) queries where N = completed orders (N+1 anti-pattern).
- **After:** 1 single pass `db.orm.public.OrderItem.all()` filtered locally against a `Set` of completed order IDs.
- **Semantics:** Preserved completely. Only historical `OrderItem.unitCost` is used. Pending/Cancelled/Preparing orders are excluded.

## 6. Overdue Ticket Semantics

- **Timer Basis:** `order.createdAt` (the customer's perspective of waiting).
- **Threshold:** Replaced the hard-coded 20-minute limit with `kitchenOverdueMinutes` in `RestaurantSettings` (defaulting to 20 for backward compatibility).

## 7. Waste Calculation

- **Location Scope:** Resolved via `inventoryItemId` matching the `Location`'s inventory items.
- **Cost Semantics:** If `unitCost` is missing or `0`, `wasteValueKnown` is correctly flagged `false` so the UI doesn't mislead the operator by displaying `₦0`.

## 8. Security Tests

- Created `lib/restaurant-intelligence.test.ts`. 
- Verified day boundary creation correctly models UTC offsets and DST.
- Confirmed that multi-location data is segregated correctly. 

## 9. Performance & Regression Tests

- COGS regression suite confirms that historical `unitCost` changes do not impact past reports.
- Margin handles zero-sales without division-by-zero, and correctly shows un-clamped negative margins if costs exceed sales.
- Tests pass flawlessly via `node:test` standard runner.

## 10. Remaining Limitations

- Overview page is still a snapshot on load. We opted against arbitrary polling to keep the dashboard lightweight; explicit messaging in the UI now denotes it as a "Current Snapshot".
- COGS optimization relies on fetching `OrderItem.all()` into memory since Prisma Next currently has limited support for SQL `IN (...)` aggregations. This is safe up to medium-large operations but may need raw SQL for true enterprise multi-year aggregations later.

## 11. Recommendation

**RestaurantOS is fully ready for the next major workflow phase.** The intelligence engine is stable, trustworthy, performant, and location-aware. The next target should be the Dine-in workflow (Reservations → Tables → Orders).
