# Citios / CityConnect Architecture

## Platform Overview
Citios (CityConnect) is a multi-tenant, multi-vertical operating system for a city's economic and social infrastructure. It consolidates multiple disparate SaaS products into a single cohesive platform.

The ecosystem comprises:
- **Universal Infrastructure:** Identity, CityPay (Wallets, Transactions), CityDrive (Tasks, Logistics), Community Feed, Microsite Builder.
- **Vertical Operating Systems (OSs):**
  - **EduOS:** School management, grading, attendance, parent-teacher communication.
  - **ShopOS (Grocery/Retail):** POS, inventory, retail orders, shifts.
  - **HotelOS (Hospitality):** Property Management System (PMS), reservations, housekeeping, folios.
  - **ServiceOS:** Local service dispatch, appointments, quotes, invoicing.
  - **EventsOS:** Ticketing, events, rental resources.
- **Resident App:** A unified consumer portal where a resident manages their entire city life (wallet, child's grades, food delivery, hotel bookings, appointments).

## Target Architecture Principles
1. **One Global Identity:** A single person has one identity across the entire ecosystem. They interact with different OSs through relationship records (roles), not separate accounts.
2. **Tenant Isolation:** All business data belongs to an `Organization`. Strict boundaries enforce that one organization cannot access another's data.
3. **Decoupled Verticals:** While OSs share the global identity and financial infrastructure, their domain-specific models (e.g., `HotelRoom`, `SchoolClass`) remain independent and do not entangle.
4. **Universal CRM:** Businesses see residents through a standardized CRM lens, ensuring a consistent relationship layer regardless of the vertical OS being used.

## Current Architectural Conflicts
1. **Identity Silos:** Verticals are currently creating their own localized representations of people (e.g., `OrgCustomer`, `RetailCustomer`, `Student`, `Reservation.guestName`) leading to massive PII duplication and breaking the "One Citios Identity" rule.
2. **Hard-Coupled Auth:** Some models require a full, authenticated `User` account to exist (e.g., `Appointment.patientId`, `Task.requesterId`), failing to support walk-in or offline consumers.
3. **Multiple Customer Models:** `RetailCustomer` vs `OrgCustomer` creates confusion for organizations that use both ShopOS and ServiceOS.

## The Path Forward
The architecture must refactor identity to a unified `User` model with shadow-account capabilities for unregistered users, replacing all localized PII storage with relationship links to the global user profile.
