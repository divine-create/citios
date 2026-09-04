# Food & Beverage / Restaurant POS Vertical (Feature List)

This document outlines the architecture and features for the "Food & Beverage" vertical. This software will serve as a state-of-the-art Restaurant Point of Sale (POS) and Kitchen Display System (KDS) for local restaurants, cafes, and bars, seamlessly integrated into the CityConnect Super App and CityDrive logistics.

## 1. The Restaurant Admin Portal (`/admin/restaurant`)

This is the SaaS platform that restaurant managers and kitchen staff will use to run their daily operations.

### A. Omnichannel Point of Sale (POS)
*   **Front-of-House Terminal:** A modern, touch-friendly grid interface for cashiers and servers to ring up orders, split checks, and manage tables.
*   **Tableside & QR Ordering:** Support for digital menus where residents can scan a QR code at their table and order directly from the CityConnect app on their phone.
*   **CityPay Integration:** Instant payments using the resident's CityWallet via NFC tap or in-app checkout, bypassing traditional credit card processing fees.

### B. Kitchen Display System (KDS)
*   **Live Ticket Routing:** Digital screens in the kitchen that instantly receive orders from the POS or the Resident App.
*   **Prep Time & Color Coding:** Tickets turn yellow or red based on wait times to ensure food comes out hot and on schedule.
*   **Allergy Alerts:** Automated, highly visible warnings on kitchen tickets if a resident's profile indicates a severe food allergy.

### C. Logistics & CityDrive Integration
*   **Automated Courier Dispatch:** When a delivery order is placed, the system automatically pings the CityConnect "CityDrive" courier network.
*   **Smart Handoff:** The KDS tells the kitchen exactly when the courier is 5 minutes away, ensuring the food is bagged exactly when they arrive.

---

## 2. The Resident Experience (Food Delivery & Pickup)

This is how citizens will interact with restaurants via their CityConnect app.

*   **Digital Storefront:** Residents can browse menus, view high-quality photos of dishes, and read community reviews.
*   **Omnichannel Ordering:** Residents can order ahead for pickup, request delivery via CityDrive, or order to their table while dining in.
*   **Loyalty & Rewards:** Automatic point accrual in their CityWallet for repeat visits, completely eliminating paper punch cards.

---

## 3. Database Updates Required (Prisma)

To support this, we will need to expand our current schema and add new models:
1.  **MenuItem Model:** To store dishes, prices, and categories (e.g., Appetizers, Mains, Drinks).
2.  **Order Model:** To track customer transactions, linking the Resident (`User`) to the Restaurant (`Organization`).
3.  **OrderItem Model:** To track the specific quantities and items inside an order.

---

**STATUS: AWAITING APPROVAL**
*Please review this feature list. Once approved, I will proceed to build the Restaurant POS backend and frontend.*
