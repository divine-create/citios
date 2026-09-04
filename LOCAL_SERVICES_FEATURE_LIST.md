# Local Services & Gig Dispatch Vertical (Feature List)

This document outlines the architecture and features for the "Local Services" vertical in the CityConnect ecosystem. This module powers the gig economy and professional services layer of the city, acting as a unified dispatch center for couriers (CityDrive/Ride), tradespeople (plumbers, electricians), and freelance workers.

## 1. The Dispatch Admin Portal (`/admin/services`)

This is the SaaS platform used by Service Agencies (e.g., a local plumbing company or the centralized CityConnect Courier network) to manage their fleet and workforce.

### A. Real-Time Job Board & Dispatch
*   **Live Map/Queue:** A dashboard showing all active service requests in the city, mapped to available workers.
*   **Gig Worker Management:** Track the online/offline status, current location, and ratings of all independent contractors (couriers, drivers, handymen).
*   **Task Assignment:** Manually or automatically route tasks based on proximity, vehicle type, and worker skills.

### B. Quoting & Invoicing
*   **Dynamic Pricing:** For complex jobs (e.g., home repairs), allow service providers to submit a quote to the resident.
*   **Automated Payouts:** Track completed jobs and calculate payouts to the gig workers, minus platform fees.

---

## 2. The Resident Experience (`/services/local`)

How citizens request help or book a ride.

*   **Unified Request Engine:** A single place to request a ride (CityRide), order a package delivery (CityDrive), or hire a local professional (CityFix).
*   **Live Tracking:** Watch the assigned worker approach on a map.
*   **Frictionless Payment:** Automatic billing via CityWallet upon task completion.

---

## 3. Database Updates Required (Prisma)

We already have a foundational `Task` and `GigWorkerProfile` model in `contract.prisma`. We will expand upon this:
1.  **Task Model Expansion:** Ensure it supports varying task types (`PASSENGER_RIDE`, `FOOD_DELIVERY`, `PACKAGE_DELIVERY`, `SERVICE_DISPATCH`) and links properly to the `Organization` fulfilling it and the `Courier`/`Worker` executing it.
2.  **ServiceQuote Model:** For jobs that require quoting (like plumbing) before the task is formally "Accepted".

---

**STATUS: AWAITING APPROVAL**
*Please review this feature list. Once approved, I will proceed to build the Local Services backend and frontend.*
