# Comprehensive Research: Complete School Management System (SMS) Architecture

To build a truly complete, world-class School Management System (SMS) within CityConnect, we must move beyond a single "General Admin" view. A complete SMS operates through robust **Role-Based Access Control (RBAC)**, providing custom portals and specific tools tailored to the daily workflow of every stakeholder in the educational ecosystem. 

Here is the exhaustive, expanded breakdown of every functionality required for a complete SMS, categorized by the roles that use them.

---

## 1. The Super Admin / Principal Portal
*The bird's-eye view for top-level management.*
*   **Global Command Center**: Real-time metrics on school-wide attendance, enrollment targets, and financial health.
*   **Master Scheduling Engine**: Tools to generate and resolve conflicts in the school-wide timetable.
*   **RBAC Management**: The ability to invite staff and assign granular permissions (e.g., granting "Bursar" access to the accountant).
*   **Compliance & State Reporting**: Automated generation of data exports required by the Department of Education.
*   **Mass Communication Hub**: Emergency broadcasting (e.g., weather closures) across all channels (SMS, Email, CityConnect Push).

## 2. The Teacher Portal
*The daily operational workspace for educators.*
*   **My Schedule & Roster**: A personalized daily timetable with instant access to student profiles (medical alerts, IEPs, guardian contacts).
*   **The Smart Gradebook**: 
    *   Custom grading scales and weighted assignment categories (e.g., Homework 20%, Exams 80%).
    *   Automated syncing to report cards.
*   **Daily Operations**: One-click period attendance and tardy logging.
*   **Behavioral Logging**: Tools to issue demerits, commendations, or discipline referrals instantly to the administration.
*   **Classroom Communication**: A localized feed to post announcements, assignments, or message parents directly without sharing personal phone numbers.

## 3. The Student Portal
*The academic hub for enrolled students.*
*   **Academic Dashboard**: Real-time visibility into current grades, missing assignments, and GPA trajectory.
*   **Interactive Timetable**: A daily schedule showing room numbers, teachers, and period times.
*   **Digital Locker/Assignments**: Integration to view homework details and submission deadlines.
*   **Extracurriculars & Clubs**: A directory to browse and sign up for school activities, sports, or clubs.

## 4. The Parent / Guardian Portal (Consumer App)
*The tracking and engagement tool we recently built, fully integrated with the SMS.*
*   **Multi-Student Dashboard**: Seamlessly switch between children across different grade levels or even different schools in the district.
*   **Live Notifications**: Push alerts for unexcused absences, low grade warnings, or disciplinary actions.
*   **Consent & Logistics**: Digital signing for permission slips and viewing bus route/transportation info.

## 5. The Accountant / Bursar Portal
*The financial engine, deeply integrated with CityWallet.*
*   **Tuition Management**: Automated invoicing, payment plans, and scholarship/financial aid tracking.
*   **Micro-Transactions (CityWallet)**:
    *   Managing digital cafeteria "Lunch Balances".
    *   Collecting fees for field trips, AP exams, or athletic uniforms.
*   **Payroll & HR**: Tracking staff hours, leave management, and processing payroll.
*   **Reconciliation & Reporting**: General ledger exports and revenue forecasting.

## 6. The Admissions & Registrar Portal
*Managing the lifecycle from prospect to alumni.*
*   **Admissions CRM**: Tracking prospective students, managing the lottery system (if applicable), and organizing campus tours.
*   **Enrollment Workflows**: Digital document collection (birth certificates, immunization records).
*   **Transcript Generation**: Official document generation for college applications or transfers.

## 7. The Counselor / Support Staff Portal
*For mental health, college guidance, and special education.*
*   **IEP/504 Tracking**: Secure documentation of special education accommodations visible only to authorized teachers.
*   **College Counseling**: Tracking college applications, recommendation letter requests, and scholarship opportunities.
*   **Wellness Logs**: Secure counseling session notes and behavioral trend analysis.

---

## Technical Implementation Plan for CityConnect

To build this massive ecosystem, we must implement a strict RBAC (Role-Based Access Control) architecture.

1.  **Database Expansion**: Update `contract.prisma` to include distinct Roles within an `OrganizationMember` (e.g., `ADMIN`, `TEACHER`, `ACCOUNTANT`, `REGISTRAR`).
2.  **Isolated Workspaces**: 
    *   Create `/admin/school/dashboard` (Principal)
    *   Create `/admin/school/teacher` (Teacher Gradebook/Attendance)
    *   Create `/admin/school/finance` (Accountant)
    *   (Students and Parents will use the consumer-facing CityConnect app we already built).
3.  **Modular Rollout**: We cannot build this all at once. We should implement it in phases:
    *   **Phase 1**: Infrastructure (RBAC, Portals, Master Roster).
    *   **Phase 2**: The Teacher Gradebook & Attendance tracking.
    *   **Phase 3**: The Accountant/CityWallet integration.

This blueprint ensures absolutely nothing is missing and covers every possible stakeholder in a modern educational institution.
