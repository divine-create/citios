# Events & Rentals Vertical (Feature List)

This document outlines the architecture and features for the "Events & Rentals" vertical. This module will serve as a centralized platform for city-wide event management, ticketing, and equipment/venue rentals, replacing fragmented solutions like Eventbrite or independent rental software.

## 1. The Event Organizer & Rental Admin Portal (`/admin/events`)

This is the SaaS platform that event organizers, venue managers, and rental businesses will use to run their operations.

### A. Event Management & Ticketing
*   **Event Creation:** A dashboard to create and publish events to the CityConnect Community Feed. Organizers can set capacities, dates, and locations.
*   **Ticketing & Check-in:** Generate digital tickets with QR codes. Staff can use the portal to scan residents in at the door.
*   **CityPay Integration:** Seamless ticket sales and refunds processed directly through the resident's CityWallet.

### B. Venue & Equipment Rentals
*   **Resource Management:** Track the availability of physical assets like party tents, AV equipment, or specific rooms in a community center.
*   **Booking Calendar:** A visual calendar showing when resources are booked, out for maintenance, or available.
*   **Security Deposits:** Automated holding and release of security deposits via CityPay.

### C. Logistics & CityDrive Integration
*   **Equipment Delivery:** If a resident rents large equipment (e.g., a bounce house or AV gear), the system can automatically schedule a CityDrive courier (with a suitable vehicle type) for delivery and pickup.

---

## 2. The Resident Experience (Discover & Book)

This is how citizens will interact with events and rentals via their CityConnect app.

*   **City Calendar:** A unified view of all upcoming local events, concerts, and town halls.
*   **One-Click RSVP:** Residents can buy tickets or RSVP instantly without filling out long forms, as their identity is already verified.
*   **Rental Marketplace:** Browse and reserve equipment or venues for private parties directly from the app.

---

## 3. Database Updates Required (Prisma)

To support this, we will need to expand our current schema and add new models:
1.  **Event Model:** To store event details (name, date, capacity, location) linked to an Organizer (`Organization`).
2.  **Ticket Model:** To track individual RSVPs/purchases, linking the Resident (`User`) to the `Event`.
3.  **RentalResource Model:** To represent a bookable item or venue (e.g., Projector, Community Hall).
4.  **Booking Model:** To track the rental period and status of a `RentalResource` for a specific Resident.

---

**STATUS: AWAITING APPROVAL**
*Please review this feature list. Once approved, I will proceed to build the Events & Rentals backend and frontend.*
