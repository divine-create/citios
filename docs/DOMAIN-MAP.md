# Domain Map

The Citios platform is divided into core universal domains and vertical-specific domains.

## 1. Universal Core
- **Identity & Access Management (IAM):** 
  - `User`, `Account`, `Session` (Global Identity & Auth)
  - `Organization`, `OrganizationMember` (Tenancy & RBAC)
- **CityContext:**
  - `City` (Registry of supported locales)
- **Financial (CityPay):**
  - `Wallet`, `Transaction`
- **Logistics (CityDrive):**
  - `Task`, `GigWorkerProfile`
- **Communications:**
  - `Post`, `Comment`, `PostLike` (Community Feed)
  - `Message`, `EmailLog`, `Notice` (Universal Comms, currently mixed with EduOS)
- **Web Presence (Microsites):**
  - `Microsite`, `MicrositePage`, `MicrositeSection`, `Asset`

## 2. Vertical OS Domains

### EduOS (School Management)
- **Settings:** `SchoolSettings`
- **Academic Core:** `AcademicYear`, `Term`, `SchoolClass`, `Subject`, `Room`
- **Roles:** `Student`, `StudentParent`, `StaffProfile`, `ClassTeacher`
- **Operations:** `Attendance`, `Gradebook`, `Grade`, `ReportCard`, `TimetableSlot`
- **Financials:** `FeeType`, `FeeInvoice`, `FeePayment`

### ShopOS (Retail & Grocery)
- **Catalog:** `RetailCategory`, `RetailProduct`
- **Operations:** `RetailRegister`, `RetailShift`
- **Transactions:** `RetailOrder`, `RetailOrderItem`
- **Supply Chain:** `RetailSupplier`, `RetailPurchaseOrder`
- **Finance:** `RetailExpense`

### HotelOS (Hospitality)
- **Property:** `HotelRoom`, `InventoryItem`, `MaintenanceTicket`
- **Reservations:** `Reservation`, `RoomBlock`
- **Financials:** `FolioCharge`, `NightAuditReport`, `RateRule`
- **F&B/Outlets:** `Outlet`, `OutletItem`, `OutletOrder`

### ServiceOS (Local Services)
- **Catalog:** `ServiceCatalogItem`, `ServiceCategory`, `ServiceAddon`
- **Operations:** `ServiceAppointment`, `ServiceJob`, `ServiceJobQuote`
- **Roles:** `ServiceStaff` (Duplication of `StaffProfile`)

### EventsOS (Events & Rentals)
- **Events:** `Event`, `Ticket`
- **Rentals:** `RentalResource`, `Booking`

### Healthcare / ClinicOS (WIP)
- **Clinical:** `Appointment`, `Prescription`, `PharmacyItem`, `PharmacyOrder`

## 3. CRM & Relationships
- **Current Silos:** `OrgCustomer`, `RetailCustomer`, `Student`, `Reservation.guestName`.
- **Target:** A unified `OrganizationCustomer` or `TenantRelationship` model linking the global `User` to the `Organization`.
