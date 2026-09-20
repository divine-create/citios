# CityConnect Hospitality: State-of-the-Art Hotel Management System

Based on our required workflow, here is the feature specification research for the **Hotels & Hospitality** vertical. The goal of this module is to be so powerful that a hotel can completely cancel their subscriptions to Oracle OPERA, Cloudbeds, or Mews, and run their entire operation inside CityConnect.

## 1. The Admin Portal (`/admin/hotel`) 
*This is the Property Management System (PMS) used by the Hotel Owner, Front Desk, and Housekeeping staff.*

### A. Front Desk & Reservations (The core engine)
*   **Tape Chart / Calendar View**: A drag-and-drop visual grid of all rooms and dates.
*   **Reservation Management**: Create, modify, cancel, and upgrade bookings.

*   **Group Blocks**: Ability to reserve blocks of rooms for weddings or corporate events.

### B. Housekeeping & Maintenance (Real-time operations)
*   **Live Room Status Dashboard**: (Clean, Dirty, Inspecting, Out of Order).
*   **Task Dispatch**: Automatically ping the `/courier` (or internal staff) app of a housekeeper when a guest checks out.
*   **Maintenance Ticketing**: Staff can snap a photo of a broken AC and instantly dispatch a ticket to the maintenance crew.

### C. Financials & Billing (Powered by CityPay)
*   **Automated Folio Routing**: Splitting room charges to a corporate card, but minibar charges to a personal Resident Wallet.
*   **CityPay**: The hotel gets paid instantly upon checkout directly to their CityPay Business Wallet.
*   **POS Integration**: Restaurant and Spa charges inside the hotel instantly sync to the guest's room folio.

### D. Channel Management
*   **OTA Syncing**: Syncing inventory with Expedia/Booking.com (or eventually, treating the CityConnect Resident App as the primary Booking engine to avoid OTA commissions!).

---

## 2. The Resident App (`/services/hotel`) 
*This is what the guest sees on their phone when they book or stay at the hotel.*

### A. Frictionless Booking
*   **Direct Booking**: Residents can search for local hotels and book instantly using their CityPay Resident Wallet (1-click checkout). 
*   **No Credit Card Holds**: Because the user's CityPay wallet is verified, no physical card hold is required at the desk.

### B. The "Digital Key" Experience
*   **Mobile Check-In/Check-Out**: Bypass the front desk entirely.
*   **Bluetooth Digital Key**: The resident app uses their phone's Bluetooth to unlock their room door.

### C. In-Stay Concierge
*   **Room Service via CityDrive**: Order room service from the Resident app. A ping goes to the hotel kitchen, and a hotel runner delivers it.
*   **Direct Chat**: Text the front desk directly from the app for extra towels.
*   **Local Discovery**: Because the hotel app is *inside* CityConnect, the hotel can recommend local restaurants and the resident can book a CityRide there with one tap.

---

### Approval Request
Review the features above. Are there any specific features you want to **add**, **remove**, or **modify** before we lock this in as the blueprint for the Hotel Vertical?
