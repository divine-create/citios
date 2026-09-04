# Events & Ticketing Competitive Analysis (Eventbrite + DICE Model)

Based on industry leaders like **Eventbrite** (the standard for local event creation) and **DICE** (the standard for mobile-first, secure ticketing), the CityConnect Events ecosystem must provide powerful creation tools for organizers and lightning-fast scanning tools for door staff.

## 1. Core Roles to Support
*   **Event Organizer / Promoter**: Creates events, designs seating or ticket tiers (GA, VIP, Early Bird), manages marketing, and tracks real-time sales and revenue.
*   **Door Staff / Scanner**: The physical on-site staff who need a high-speed, mobile-first app to scan attendee QR codes, look up names manually, and track real-time venue capacity.

## 2. Portals to Build for CityConnect

### A. Event Organizer Dashboard (The Command Center)
*   **Implementation**: A desktop-optimized analytics and creation portal.
*   **Features**:
    *   **Event Builder**: A UI to create new events, set dates, upload cover art, and define ticket tiers (e.g., General Admission $20, VIP $50).
    *   **Sales & Revenue Analytics**: Real-time charts showing ticket sales over time, total revenue, and page views vs. conversion rate.
    *   **Attendee CRM**: A list of all ticket buyers, with the ability to issue refunds via CityWallet or send broadcast messages (e.g., "Doors open at 8 PM").

### B. Box Office / Door Scanner App (Mobile-First)
*   **Implementation**: A mobile-optimized UI designed for high-speed use in dark, loud environments (like club doors or concert gates).
*   **Features**:
    *   **High-Speed Scanner UI**: A large camera placeholder UI for scanning CityConnect QR tickets.
    *   **Manual Guest List Lookup**: A fast search bar to look up attendees who lost their phone or whose battery died, with a 1-tap "Check In" button.
    *   **Live Capacity Tracker**: A real-time counter (e.g., "452 / 500 Checked In") so the door staff knows exactly how full the venue is.
