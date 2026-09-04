# Backend Implementation Guide: Hotel Management System

This document outlines the database schema updates and server actions required to wire up the frontend Hotel Admin portals (Manager, Front Desk, Housekeeping) to the Prisma database.

## 1. Database Schema Updates (`contract.prisma`)

### Role Additions
Update the `OrgRole` enum to support hotel staff:
```prisma
enum OrgRole {
  // Existing roles...
  HOTEL_MANAGER
  HOTEL_FRONT_DESK
  HOTEL_HOUSEKEEPER
}
```

### New Models Required
*   **`HotelRoom`**: Represents physical rooms in the hotel.
    *   Fields: `orgId`, `roomNumber`, `roomType` (e.g., KING, DOUBLE), `baseRate`, `status` (AVAILABLE, OCCUPIED, DIRTY, CLEANING, INSPECTED, MAINTENANCE).
*   **`HotelReservation`**: Represents guest bookings.
    *   Fields: `orgId`, `roomId`, `guestId` (User), `checkInDate`, `checkOutDate`, `totalPrice`, `status` (CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED), `paymentStatus` (PENDING, DEPOSIT_PAID, PAID).
*   **`DynamicRateRule`**: To support the Manager's revenue management features.
    *   Fields: `orgId`, `ruleType` (WEEKEND_SURGE, HOLIDAY_SURGE), `multiplier` (e.g., 1.20).
*   **`HousekeepingLog`**: Audit trail for room cleaning.
    *   Fields: `roomId`, `housekeeperId`, `statusChangedTo`, `timestamp`.

## 2. Server Actions to Implement (`lib/actions/hotel.ts`)

### Manager Portal (`/hotel/manager`)
*   `getHotelRevenueMetrics(orgId)`: Calculates MTD revenue, RevPAR, and occupancy percentage by querying `HotelReservation` and `HotelRoom` counts.
*   `getDynamicRates(orgId)`: Fetches current base rates and surge multipliers.
*   `updateDynamicRates(orgId, rules)`: Upserts `DynamicRateRule` records.

### Front Desk Portal (`/hotel/frontdesk`)
*   `getFrontDeskCalendar(orgId, startDate, endDate)`: Fetches all `HotelRoom` records and their overlapping `HotelReservation` records for the timeline view.
*   `processCheckIn(reservationId)`: Updates reservation status to `CHECKED_IN` and the linked room status to `OCCUPIED`.
*   `processCityWalletPayment(reservationId, amount)`: Interacts with CityWallet core actions to deduct funds from the guest and mark the `HotelReservation.paymentStatus` as `PAID`.

### Housekeeping Portal (`/hotel/housekeeping`)
*   `getHousekeepingTasks(orgId)`: Fetches `HotelRoom` records filtered by statuses requiring attention (`DIRTY`, `CLEANING`, `OCCUPIED` with checkout today).
*   `updateRoomStatus(roomId, newStatus)`: Updates the `status` on `HotelRoom` and creates a `HousekeepingLog` entry.

## 3. Frontend Wiring Instructions
Once the server actions are created:
1.  Convert the static page routes (e.g., `app/(admin)/hotel/frontdesk/page.tsx`) into asynchronous Server Components.
2.  Await the relevant server actions (e.g., `const calendarData = await getFrontDeskCalendar(user.orgId, start, end)`).
3.  Pass the resulting data down as props to the Client Components (e.g., `<FrontDeskCalendar data={calendarData} />`), replacing the hardcoded mock data.
