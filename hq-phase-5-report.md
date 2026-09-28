# CityOS HQ Phase 5 — Platform Measurement & Analytics

## Architecture Overview
A lightweight, non-invasive measurement layer was successfully added to CityOS HQ. The primary goal was to measure existing business state and securely track behavioral intent (Search) without manufacturing fake data or duplicating existing state.

### 1. The Canonical Rule
The Analytics layer treats the core domain models (`Person`, `Organization`, `Payment`, `RetailOrder`) as the absolute source of truth. Metrics such as "Total Users", "Active Businesses", and "Payment Volume" are calculated securely by querying the original models via DB aggregations, bypassing any N+1 logic or in-memory arrays.

### 2. Behavioral Measurement Model
To support behavioral intelligence that doesn't belong in transactional tables, a `MeasurementEvent` model was added to the canonical `src/prisma/contract.prisma`.
*   Includes `eventType` (e.g., `SEARCH_PERFORMED`), `occurredAt`, `personId`, `organizationId`, and generic JSON `metadata`.
*   The `trackEvent` server action auto-associates current session identity via `getAuthSession` rather than trusting client-supplied identifiers.

## Implementation Details

### Search Intelligence
Search intent is highly valuable for a hyperlocal platform to identify unfulfilled demand (e.g., searches yielding no results).
1.  **Tracking**: Injected `trackEvent` into the server-side discovery route (`app/actions/explore.ts`).
2.  **Metrics Captured**: Search query text, result counts, and a `zeroResult` flag.
3.  **Analytics Render**: Added the `/hq/analytics` dashboard displaying *Total Searches*, *Top Search Terms*, and a *Zero-Result Rate*.

### The Analytics Interface (`/hq/analytics`)
Built the primary analytics dashboard interface accessible only to System Admins:
*   **Time Filtering**: Supports dynamic multi-day looks (7d, 30d, 90d) via Next.js server-side query parameters.
*   **Platform Dimension Cards**:
    *   **Citizens**: Total citizens (`Person` model) + new registrations in the period.
    *   **Organizations**: Total orgs + new orgs.
    *   **Payment Volume**: Total processed volume (`Payment` aggregate sum) + raw counts.
    *   **Orders**: Breakdowns of `RetailOrder` and `RestaurantOrder`.
*   **Metric Registry Documentation**: Explicit transparency built into the UI defining what each number means.
*   **Navigation Integration**: Added an `Analytics` sidebar link alongside `Master Ledger` and `Governance Audit` within the HQ layout.

## Data Governance & Privacy
*   Search events strip PII at display-time. While original event tables carry the linked `personId`, the HQ Analytics aggregates strictly decouple behavior from specific users when rendering "Top Searches".
*   Avoided invasive full-body tracking or external third-party BI hooks to preserve CityOS strict multi-tenant privacy.

## Verification
*   No `.slice()` used for bounding metrics.
*   Uses `aggregate((a) => ({ count: a.count(), volume: a.sum() }))` exclusively for big sets.
*   Database contracts were emitted cleanly.
*   Typescript types were strictly cast and validated across the HQ UI.
