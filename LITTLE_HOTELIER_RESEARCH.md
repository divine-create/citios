# Little Hotelier Competitive Analysis & CityConnect Integration

Based on a detailed analysis of **Little Hotelier** (the leading all-in-one property management platform for small accommodation businesses, B&Bs, and boutique hotels), here is a breakdown of their core features, the roles they support, and how we will integrate these into CityConnect's Hotel Management ecosystem.

## 1. Core Features of Little Hotelier

1.  **Property Management System (PMS) / Front Desk**: A central, digital front desk calendar that visually displays reservations, room availability, check-ins, and check-outs in a single timeline view.
2.  **Channel Manager**: Real-time synchronization of room inventory across platforms (Booking.com, Airbnb) to prevent double-bookings.
3.  **Integrated Payments**: Secure processing of deposits, refunds, and room charges directly from the reservation screen.
4.  **Insights & Reporting**: Data-driven recommendations for rate optimization (yield management) based on market demand and occupancy rates.
5.  **Housekeeping & Maintenance**: Mobile-friendly tools for operational staff to update room statuses (e.g., from "Dirty" to "Clean") on the go.
6.  **Guest Engagement**: Automated communications (pre-arrival emails, post-stay reviews).

## 2. Supported Roles

While Little Hotelier uses a unified dashboard, small hotel staff often wear multiple hats. We will structure our RBAC (Role-Based Access Control) around these core operations:

*   **Owner / General Manager**: Needs access to the Insights/Reporting, Revenue Management (setting seasonal rates), and overall system configuration.
*   **Front Desk / Receptionist**: Needs constant access to the Front Desk Calendar to manage walk-ins, process check-ins/check-outs, and handle CityWallet payments.
*   **Housekeeping / Maintenance**: Needs a simplified, mobile-first view showing only room assignments, cleaning statuses, and maintenance ticketing.

---

## 3. How We Will Integrate This into CityConnect

To build an industry-leading Hotel Admin Panel for CityConnect, we will spawn subagents to build the following portals based on the Little Hotelier model:

### A. The Front Desk Calendar (The Core)
*   **Implementation**: A visual, drag-and-drop timeline calendar. Rows represent physical rooms (e.g., Room 101, 102), and columns represent dates. Reservations are blocks on this timeline.
*   **Actionable Tasks**: Staff can click a reservation block to trigger check-in, check-out, or process a CityWallet payment.

### B. The Housekeeping Mobile View
*   **Implementation**: A distinct tab or portal tailored for mobile screens. 
*   **Actionable Tasks**: Displays a list of rooms that are checking out today. Housekeepers can toggle room states (`OCCUPIED` -> `DIRTY` -> `CLEANING` -> `INSPECTED` -> `AVAILABLE`). 
*   **Integration**: The Front Desk Calendar immediately reflects these state changes so reception knows when a room is ready for early check-in.

### C. Revenue & Rate Manager
*   **Implementation**: A dashboard for the General Manager.
*   **Actionable Tasks**: Allows managers to set "Base Rates" and define multiplier rules (e.g., "Weekend Surge +20%", "Holiday Surge +50%"). Displays occupancy percentage and CityWallet payout schedules.

### D. CityWallet Payment Processing
*   **Implementation**: A unified modal within the Front Desk view.
*   **Actionable Tasks**: When a guest arrives, the front desk can capture a security deposit via CityWallet, and process room service / minibar charges to the guest's CityWallet ledger throughout their stay.
