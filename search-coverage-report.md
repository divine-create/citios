# Repository-Wide Search Coverage Report

## 1. Resident Discovery Search
*   **Search Surface:** `/explore` (CityExplore)
*   **Implementation:** `app/actions/explore.ts` (`searchCityExplore`)
*   **Instrumented?** Yes
*   **Event Type:** `SEARCH_PERFORMED`
*   **Query Captured?** Yes
*   **Result Count?** Yes (Organizations + Products)
*   **Zero Result?** Yes (derived from `resultCount === 0`)
*   **Vertical?** Yes (derived from the `cat` parameter if selected)
*   **Location?** Yes (derived from the active `cityId`)
*   **Downstream Selection?** No (Does not require invasive frontend instrumentation per Phase 5 guidelines. Wait to evaluate actual business need).

## 2. ShopOS Operational Search
*   **Search Surface:** `/shopos` (Dashboard)
*   **Implementation:** `lib/actions/retail.ts` (`searchShopOS`)
*   **Instrumented?** No
*   **Reasoning:** This is a tenant-level operational lookup tool (finding specific orders/customers), not a platform-level consumer discovery search.

## 3. Healthcare Provider Search (Placeholder)
*   **Search Surface:** Unused/Internal
*   **Implementation:** `lib/actions/healthcare.ts` (`searchHealthcareProviders`)
*   **Instrumented?** No
*   **Reasoning:** Non-canonical or unimplemented.

## Summary
The primary driver of platform demand—**Resident Discovery Search**—is fully instrumented. It generates non-invasive server-side events tied to the authenticated user's session without relying on client-side tracking, capturing the exact metadata required for HQ Demand Gap analysis while ignoring DB-level failures to prevent false zero-result counts.
