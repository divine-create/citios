# CityConnect Implementation Plan

This document outlines a phased approach to turning the current CityConnect UI prototype into a fully functional, production-ready application.

## Phase 1: Architecture & Routing Refactor
Currently, the application relies on a single `page.tsx` using a state variable (`view`) to render different components. We need to leverage Next.js App Router for better performance, SEO, and maintainability.

- [x] **Refactor to Next.js App Router**
  - [x] Move `HomeView` to `/app/(resident)/page.tsx`
  - [x] Move `SearchView` to `/app/(resident)/explore/page.tsx`
  - [x] Move `ProfileView` to `/app/(resident)/profile/page.tsx`
  - [x] Create routes for services: `/app/(resident)/services/healthcare`, `/app/(resident)/services/education`, etc.
  - [x] Extract a generic Admin Dashboard Layout and move `SchoolAdminView` to `/app/(admin)/school/page.tsx`
  - [x] Create specialized admin pages for other verticals (e.g., `/app/(admin)/healthcare`, `/app/(admin)/retail`).
- [x] **Layouts**
  - [x] Extract the sidebar and top navigation into `layout.tsx` files for the `(resident)` and `(admin)` route groups.

## Phase 2: Authentication & Role Management
To support different portals (Resident vs. Admin), we need robust authentication and Role-Based Access Control (RBAC).

- [ ] **Setup Authentication** (e.g., using Auth.js / NextAuth or Firebase Auth).
- [ ] **Define User Roles**: Setup roles such as `RESIDENT`, `BUSINESS_OWNER`, `INSTITUTION_ADMIN` (e.g., School Admin), `CITY_PLANNER`, `COURIER`, etc.
- [ ] **Route Protection**: Implement middleware to protect `/app/(admin)/*` routes so only authorized users can access them.
- [ ] **User Onboarding**: Create sign-up and login pages.

## Phase 3: Database & API Setup
Replace hardcoded mock data with a real database setup.

- [ ] **Choose Database & ORM** (e.g., PostgreSQL + Prisma, or Supabase).
- [ ] **Define Schema models**:
  - [ ] `User` (id, name, email, role, location)
  - [ ] `Post` (for the community feed: author, content, category, likes)
  - [ ] `School` & `Student` (linked to Guardian/User)
  - [ ] `Service` (businesses, healthcare facilities)
  - [ ] `CityPay_Transaction` (unified payments, wallet balances, split-payouts)
  - [ ] `CityDrive_Task` (delivery dispatches, driver routes, statuses)
- [ ] **Setup Server Actions / API Routes**: Create Next.js server actions to fetch and mutate data.

## Phase 4: Core Features (Resident Portal)
Bring the resident-facing features to life.

- [ ] **Community Feed** (`HomeView`)
  - [ ] Fetch real posts from the database.
  - [ ] Implement like/comment functionality.
- [ ] **Search & Discovery** (`SearchView`)
  - [ ] Implement a global search across local services, events, and news.
- [ ] **Service Verticals**
  - [ ] Connect `HealthcareView`, `EducationView`, `GroceryView`, etc., to dynamic data.
- [ ] **User Profile** (`ProfileView`)
  - [ ] Implement profile editing, family plan management, and saved preferences.

## Phase 5: Admin Features (Multi-Vertical Business & Institution Portals)
Expand the admin capabilities so business owners and institution admins across all verticals can manage their operations.

**🚨 REQUIRED WORKFLOW FOR ALL VERTICALS 🚨**
> *Before writing code for any vertical, we must conduct deep research on state-of-the-art software currently used in that industry (e.g., analyzing leading Hotel Management Systems or Restaurant POS systems). We will generate a comprehensive feature list and gain user approval before building.*

- [ ] **Universal Admin Core**
  - [ ] **Overview & Broadcasts**: Allow all business/institution admins to publish updates and alerts directly to the resident Community Feed.
  - [ ] **Staff & HR**: Directory and schedule management for employees.
  - [ ] **Finances & Analytics**: Real-time mock integration for tracking revenue, bookings, and expenses.
- [ ] **Vertical-Specific Modules (Pending Research & Approval)**
  - [ ] **Schools**: (To be researched vs. PowerSchool/Blackbaud)
  - [ ] **Healthcare**: (To be researched vs. Epic/AthenaHealth)
  - [ ] **Hospitality / Hotels**: (To be researched vs. Oracle OPERA/Cloudbeds)
  - [ ] **Groceries/Retail**: (To be researched vs. Toast/Square)
  - [ ] **Events & Rentals**: (To be researched vs. AppFolio/Eventbrite)
  - [ ] **Local Services**: (To be researched vs. ServiceTitan)

## Phase 6: Core Platforms (CityPay & CityDrive)
Implement the central financial and logistics engines.

- [ ] **CityPay Integration (Unified Wallet & Payments)**
  - [ ] Develop the Resident Wallet UI for holding balances and linking payment methods.
  - [ ] Implement 1-click checkout flows across all verticals (tuition, dining, rent).
  - [ ] Create automated split-payment escrow systems (routing X% to Business, Y% to Courier, Z% to Platform).
  - [ ] Enable B2B instant vendor payments within the admin dashboard.
- [ ] **CityDrive Integration (Last-Mile Logistics)**
  - [ ] Build the `(courier)` route group for the driver mobile interface.
  - [ ] Implement unified dispatch logic: when a retailer marks an order "Ready", ping nearby couriers.
  - [ ] Live GPS tracking integration for the Resident `Activity` view.
  - [ ] Smart routing integration (re-routing based on City Planner road closures).

## Phase 7: Polish & Deployment
- [ ] **Testing**: Write unit tests and end-to-end tests (e.g., Jest, Cypress).
- [ ] **Accessibility**: Ensure high contrast, screen reader compatibility, and keyboard navigation.
- [ ] **Deployment**: Deploy the application (e.g., to Vercel or Firebase Hosting).
