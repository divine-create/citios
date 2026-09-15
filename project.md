# CityConnect (Citios) - Comprehensive Project Architecture & State

## 1. Executive Summary & Vision
**CityConnect (Citios)** is a hyper-ambitious, multi-tenant Business Operating System (BOS) and consumer super-app. It aims to digitize entire local economies by providing specialized, enterprise-grade software to different business verticals (Schools, Retail, Hotels, Field Services, Events, Healthcare), while simultaneously aggregating these businesses into a single, unified consumer-facing Super App ("Resident App").

The platform effectively eliminates the need for disparate SaaS subscriptions by offering everything from Point-of-Sale to Report Cards, Housekeeping Management, and Website Builders natively.

---

## 2. Tech Stack & Infrastructure
- **Frontend Framework**: Next.js (App Router) using React 18+.
- **Styling**: Tailwind CSS, heavily utilizing reusable UI patterns and Lucide React icons.
- **Data Layer (Contract-First)**: **Prisma Next (Prisma 8)**. The database is declared via `contract.prisma`, emitting a typed client (`db.orm.public`).
- **Database**: Supabase (PostgreSQL) handling all multi-tenant relational data.
- **Routing & White-Labeling**: Next.js dynamic wildcard routing (`app/site/[slug]`) to support infinite multi-tenant branded microsites.

---

## 3. Verticals & Implementations (The "OS" Ecosystem)

### 3.1. EduOS (Complete School Management)
A massive, fully-featured School Information System replacing traditional software.
- **Portals (Role-Based)**: Dedicated dashboards for `Admin`, `Registrar`, `Counselor`, `Finance`, `Teacher`, `Student`, and `Parent`.
- **Academic Hierarchy**: Supports nuanced localized structures (e.g., British/Nigerian systems: Class = JSS1, Section = JSS1 A).
- **Core Modules**:
  - **AcademicManager**: Complex master timetables rendered via matrix grid. Handles dynamic cell overlaps for classes and sections.
  - **ExaminationManager & Report Cards**: End-to-end grading, assessment configuration, and term-based report card generation.
  - **AccountingManager & Finance**: School fee invoicing, ledger tracking, and parent billing.
  - **Enrollment & Promotion**: Automated student progression (`PromotionPanel`) and admissions tracking (`InquiriesManager`).
  - **Setup Wizard**: Frictionless onboarding (`SchoolSetupWizard.tsx`).

### 3.2. ShopOS & Grocery (Retail & E-commerce)
An omnichannel retail engine handling physical stores and online deliveries.
- **POS Terminal**: A blazing-fast cashier interface (`POSTerminal.tsx`) supporting quick-add, barcode scanning simulation, custom taxes, receipt generation, and discount application.
- **InventoryManager**: Robust catalog tracking, supplier management, and custom unit configuration (e.g., kg, pack, crates).
- **Onboarding & Settings Engine**: 
  - An intelligent **Onboarding Widget** tracks progress (Products, Store Info, Payments, Shipping).
  - **Tabbed Settings UI**: Extensively configured to handle Payment Gateways (Stripe, Paystack, Wallet) and dynamic Shipping Zone algorithms.
- **Fulfillment Operations**: Dedicated apps for warehouse staff (`PickerApp.tsx`) and delivery drivers (`DispatchHub.tsx`).

### 3.3. HotelOS (Hospitality Property Management)
A comprehensive Property Management System (PMS) for boutique and large-scale hotels.
- **Front Desk Operations**: Features a visual `TapeChart` and `FrontDeskCalendar` for booking assignments and check-ins.
- **Folio & Billing**: Tracks guest ledgers, room charges, and checkout invoicing (`FolioBilling.tsx`).
- **Departmental Dashboards**:
  - **Housekeeping**: Real-time room status tracking (Clean, Dirty, Inspected) assigned to staff.
  - **Maintenance**: Ticketing system for broken room assets.
  - **Outlet POS**: Specialized POS for hotel restaurants, bars, and spas linked directly to guest folios.

### 3.4. ServiceOS (Field & Professional Services)
Built for plumbers, electricians, salons, and consultants.
- **Scheduling & Dispatch**: Drag-and-drop `CalendarTab` for technician assignments and route planning.
- **Catalog & Addons**: Dynamic service catalogs where each service can have configurable addons (e.g., "Deep Clean" addon to "Standard Cleaning").
- **Financial Lifecycle**: Generates Quotes -> Converts to Jobs (`JobsTab.tsx`) -> Issues Invoices -> Tracks Payments.

### 3.5. EventsOS
Event ticketing and venue management.
- **Organizer Dashboard**: Event creation, ticketing tiers, and revenue tracking.
- **Scanner App**: A mobile-optimized interface for venue bouncers/staff to scan and validate QR tickets at the door.

### 3.6. Microsite Builder (White-Label Websites)
A built-in Shopify/Squarespace competitor allowing any business on CityConnect to launch a website instantly.
- **Routing Engine**: `app/site/[slug]/[[...path]]` dynamically resolves domains to a specific tenant's data.
- **Theming & Rendering**: `themes.ts` and `MicrositeRenderer.tsx` construct a full public-facing website based on the business's inventory, bookings, or enrollment forms.

### 3.7. The Resident App (Consumer Super-App)
The consumer-facing portal (`app/(resident)`) where local citizens interact with the ecosystem.
- **Social & Discovery**: Features an interactive community feed (`FeedItem`, `PostView`) and local business discovery mechanics (`Explore`).
- **Unified Services Hub**: Citizens can browse schools (`SchoolDirectoryView`), book healthcare appointments (`HealthcareBookingView`), order groceries (`GroceryStorefrontView`), hail rides (`RideHailingView`), and browse local event tickets seamlessly using a shared wallet/identity.

---

## 4. Current State & Recent Developments

### ✅ Session — V1 Identity Canonical Model Migration (Complete)

The entire codebase has been migrated from a legacy flat `User` model to the **V1 Identity Canonical Model**. This was a sweeping multi-phase refactor touching the schema, all action files, auth layer, seed/simulation scripts, and UI components — without modifying the Prisma schema itself (only application code).

---

#### Phase 1 — Schema (`src/prisma/contract.prisma`) ✅
- Rewrote the contract to the V1 Blueprint.
- Replaced the legacy `User` model with the full identity chain: `Person` → `PersonIdentifier` → `Account`.
- Replaced `OrganizationMember` with `Membership` + `MembershipRole`.
- Introduced `Relationship` (consumer-to-org link) and tenant-scoped extensions: `CustomerData`, `StudentData`, `PatientData`, `StaffData`.
- All enum values corrected: `AppointmentStatus`, `PrescriptionStatus`, `LedgerEntry.currency`, etc.
- `npm run contract:emit` passes cleanly.

#### Phase 2 — Application Actions (`lib/actions/*.ts`) ✅
Every vertical OS action file individually migrated:

| File | Key Changes |
|---|---|
| `school.ts` | `Student` → `StudentData`; `ClassTeacher.staffId` → `membershipId`; `formTeacherId` → `formMembershipId`; `TimetableSlot.staffId` → `membershipId`; `requireMembership` import added |
| `schoolos.ts` / `shopos.ts` | `session.user.userId` → `session.user.personId` |
| `hotel.ts` | `addFolioCharge` fixed to safely fetch `orgId`; `LedgerEntry.currency` field added |
| `healthcare.ts` | `PatientData` → `Relationship` → `Person` chain; `AppointmentStatus` & `PrescriptionStatus` enums corrected |
| `microsite.ts` | Owner name resolution migrated to V1 identity chain (`Membership` → `Person`) |
| `business.ts` | `OrganizationMember` creation replaced with `Membership` + `MembershipRole` |
| `service.ts` / `services.ts` | Worker lookups via `GigWorkerProfile.personId` |
| `retail.ts` | `CustomerData` → `Relationship` chain |
| `feed.ts` / `post.ts` | `User.all()` → `Person.all()`; `userId` → `personId` on `Comment` and `PostLike` |
| `profile.ts` | `PersonIdentifier` EMAIL lookup; `ResidentProfile.personId` |
| `resident.ts` | `OrganizationMember` teacher count → `MembershipRole`; `Student` → `StudentData` |
| `tenant.ts` | `requireAuthenticatedAccount` and `requireMembership` implemented using the full V1 chain |

#### Phase 3 — Auth Layer (`lib/auth.ts`, `types/next-auth.d.ts`) ✅
- `lib/auth.ts`: Full rewrite of `signIn` and JWT/session callbacks. Now uses `PersonIdentifier` for email lookup, creates `Person` + `Account` on first sign-in, and loads `Membership` + `MembershipRole` from DB into the session token.
- `types/next-auth.d.ts`: `userId?: string` → `personId?: string` in both `Session` and `JWT` module augmentations.

#### Phase 4 — Seed & Simulation Scripts ✅
- `scripts/seed.ts` (~1300 lines): Fully migrated. All legacy `User.create` calls replaced with `Person` + `PersonIdentifier` + `Account`. All `Student` records replaced with `Relationship` + `StudentData`. `FamilyLink` replaces `StudentParent`. `ClassTeacher.staffId` → `membershipId`.
- `simulate.ts`: User identity creation migrated to `Person` + `PersonIdentifier`.

#### Phase 5 — UI Components (`app/` and `components/`) ✅
- All `session.user.userId` references in page components replaced with `session.user.personId`.
- `studentId` props updated to `studentDataId` across: `AccountingManager`, `CounselorDashboard`, `FinanceDashboard`, `RegistrarDashboard`, `PromotionPanel`, `AcademicManager`.
- `FinanceDashboard`: `staffId` → `membershipId` for `markStaffAttendance` and `requestLeave` calls.
- `POSTerminal`: `customerId` → `customerDataId`.
- `HealthcareBookingView`: `bookAppointment` call updated to match the V1 5-argument signature.

---

**Earlier session updates:**
1. **Schema Upgrades**: Migrated the Supabase production database using `npx prisma db update` to support JSON configurations for Shipping and Payment settings in ShopOS.
2. **Frontend Polishing**: Refactored monolithic settings pages into tabbed architectures, improving UX for merchants.
3. **Robust Scheduling**: Hardened EduOS Timetable rendering logic (`cellsFor`) to prevent crashes on complex overlapping schedules.
4. **Vercel CI/CD Stability**: Resolved UTF-8 compilation errors blocking edge deployments.

*Citios now has a hardened canonical identity backbone. All cross-vertical transactions — a citizen using the Resident App to pay a ShopOS invoice, book a hospital appointment, or pay an EduOS school fee — are built on a single authoritative `Person` identity.*
