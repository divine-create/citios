# CityConnect Hospitality: State-of-the-Art Hotel Management System

Based on our required workflow, here is the feature specification research for the **Hotels & Hospitality** vertical. The goal of this module is to be so powerful that a hotel can completely cancel their subscriptions to Oracle OPERA, Cloudbeds, or Mews, and run their entire operation inside CityConnect.

## 1. The Admin Portal (`/admin/hotel`) 
*This is the Property Management System (PMS) used by the Hotel Owner, Front Desk, and Housekeeping staff.*

### A. Front Desk & Reservations (The core engine)
*   **Tape Chart / Calendar View**: A drag-and-drop visual grid of all rooms and dates.
*   **Reservation Management**: Create, modify, cancel, and upgrade bookings.
*   **Dynamic Pricing Engine**: Automated rate changes based on occupancy levels and local city events (synced with the CityConnect Event database).
*   **Group Blocks**: Ability to reserve blocks of rooms for weddings or corporate events.

### B. Housekeeping & Maintenance (Real-time operations)
*   **Live Room Status Dashboard**: (Clean, Dirty, Inspecting, Out of Order).
*   **Task Dispatch**: Automatically ping the `/courier` (or internal staff) app of a housekeeper when a guest checks out.
*   **Maintenance Ticketing**: Staff can snap a photo of a broken AC and instantly dispatch a ticket to the maintenance crew.

### C. Multi-Outlet Management (Restaurants, Bars, Clubs)
*   **Parent/Child Entities**: The Hotel acts as the "Parent." The Shawarma stand, the Nightclub, and the Rooftop Bar are set up as "Child Entities."
*   **Unified POS (Point of Sale)**: Bartenders and waiters use the CityConnect POS interface on tablets to ring up orders.
*   **"Charge to Room" Routing**: When a guest buys a drink at the club, the bartender selects "Charge to Room." The system instantly pings the PMS, verifies the guest is checked into Room 402, checks their credit limit, and posts the charge to their Master Folio.

### D. Inventory & Procurement
*   **Housekeeping Inventory**: Track linens, towels, soaps, and cleaning supplies. 
*   **F&B (Food & Beverage) Inventory**: Track liquor bottles at the bar and raw ingredients in the restaurant kitchen.
*   **Low-Stock Alerts**: Automated warnings when inventory drops below par levels.
*   **Supplier Orders**: Direct integration to order more supplies from local B2B vendors within CityConnect.

### E. Advanced Finances & Accounting
*   **The Guest Folio**: A centralized, itemized bill for every guest showing their room rate, room service, bar tabs, and spa charges.
*   **The Night Audit**: An automated accounting process that runs at 2:00 AM every night to post room charges, reconcile cash drawers across all sub-outlets, and generate daily revenue reports.
*   **CityPay General Ledger**: A financial dashboard showing a breakdown of Revenue Centers (e.g., 60% Rooms, 30% F&B, 10% Spa), tax liabilities, and payroll expenses.

### F. Channel Management
*   **OTA Syncing**: Syncing inventory with Expedia/Booking.com (or eventually, treating the CityConnect Resident App as the primary Booking engine to avoid OTA commissions!).

---

## 2. The Resident App (`/services/hotel`) 
*This is what the guest sees on their phone when they book or stay at the hotel.*

### A. Storefront & Frictionless Booking
*   **Brand Customization**: Hotel owners upload a Hero Image, Logo, and Photo Gallery. They can toggle amenities (Pool, Gym, WiFi) to appear on their CityConnect profile.
*   **Direct Booking**: Residents can search for local hotels and book instantly using their CityPay Resident Wallet (1-click checkout).
*   **No Credit Card Holds**: Because the user's CityPay wallet is verified, no physical card hold is required at the desk.

### B. The "Digital Key" Experience
*   **Mobile Check-In/Check-Out**: Bypass the front desk entirely.
*   **Bluetooth Digital Key**: The resident app uses their phone's Bluetooth to unlock their room door.

### C. In-Stay Concierge
*   **Room Service via CityDrive**: Order room service from the Resident app. A ping goes to the hotel kitchen, and a hotel runner delivers it.
*   **Direct Chat**: Text the front desk directly from the app for extra towels.
*   **Local Discovery**: Because the hotel app is *inside* CityConnect, the hotel can recommend local restaurants and the resident can book a CityRide there with one tap.
