# Identity Architecture

## Core Principle
**ONE CITIOS IDENTITY**
↓
**ONE PERSON**
↓
many relationships / memberships
↓
many organizations / businesses / schools
↓
different OS experiences

## Rules of Identity
1. A person must never need separate Citios accounts for different OSs.
2. An OS does not own a person's global identity.
3. A business/school can create or invite a person without owning their authentication.
4. A person may exist without a login account (e.g., walk-in customer, child student).
5. A person may later claim/activate their account.
6. Existing identity must be reused when a matching verified identity exists.
7. Student, Parent, Customer, Staff, Teacher, etc. are relationships/roles, not separate global user accounts.

## Current State & Conflicts
Currently, the platform suffers from identity fragmentation and PII duplication:
- **ShopOS** creates `RetailCustomer` with duplicated name/phone/email.
- **Universal CRM** creates `OrgCustomer` with duplicated PII and an optional link to `User`.
- **EduOS** creates `Student` with extensive PII, lacking a `userId` entirely (only linking to `guardianId`).
- **HotelOS** uses `guestName` on `Reservation` instead of standardizing on a global identity.
- **ServiceOS** duplicates PII in `ServiceStaff`.
- **Direct Linking:** Models like `Appointment` or `Task` hard-link to `User`, making it impossible to serve walk-in or phone-in customers who don't have a CityConnect account yet.

## Target Architecture
The system must converge on a unified global `User` (or `Person`) record.

### 1. The Global Identity (User/Person)
Stores intrinsic properties of a human being:
- Name
- Global contact info (Phone, Email - used for auth/recovery)
- Date of Birth
- Core Avatars

### 2. Shadow Accounts (Unclaimed Profiles)
If a business creates a new customer (e.g., booking an appointment over the phone), the system creates a global `User` record but **without** any linked `Account` (authentication credentials). 
When that user later downloads the Resident App and signs up using that same phone/email, the system merges the credentials into the existing `User` record.

### 3. Roles as Relationships
Instead of `RetailCustomer` or `OrgCustomer` duplicating PII, these models should be replaced by relationship edges (e.g., `OrganizationCustomer`) that link the global `User` to the `Organization`. 
- **Student:** A role linking a `User` (the student) to an `Organization` (the school), holding school-specific metadata (admission number, year level, medical notes).
- **Staff:** A role linking a `User` to an `Organization`, holding employment data.
- **Customer:** A role linking a `User` to an `Organization`, holding loyalty points, CRM notes.

### 4. Data Ownership
- **Global:** The `User` owns their global profile data and wallet.
- **Tenant:** The `Organization` owns the relationship metadata (loyalty points, student grades, staff schedules, medical history).
