# Healthcare Vertical (Feature List)

This document outlines the architecture and features for the "Healthcare" vertical in the CityConnect ecosystem. This module will serve as a unified platform for local clinics, hospitals, and pharmacies to manage patient scheduling, medical records, and prescriptions, while offering residents a seamless booking experience.

## 1. The Clinic & Hospital Admin Portal (`/admin/healthcare`)

This is the SaaS platform that healthcare providers will use to manage their operations.

### A. Patient & Appointment Management
*   **Appointment Dashboard:** A centralized calendar view showing all upcoming patient appointments, walk-in queues, and tele-health consultations.
*   **Patient Records Integration:** Fast access to a resident's basic medical info (allergies, blood type) linked securely to their CityConnect identity.
*   **Staff Scheduling:** Manage schedules for doctors, nurses, and specialists (`OrganizationMember` with role `DOCTOR` or `NURSE`).

### B. Comprehensive Pharmacy Management & POS
*   **Omnichannel POS Terminal:** A built-in Point of Sale system tailored for pharmacies to ring up over-the-counter (OTC) items, medical supplies, and prescription co-pays.
*   **E-Prescribing & Fulfillment:** Doctors can issue digital prescriptions. Pharmacists receive them in real-time, verify insurance, and prepare them for pickup.
*   **Inventory & Stock Management:** Track stock levels for medications and retail items. Alert pharmacists when drugs are running low or nearing expiration.
*   **CityPay Integration:** Seamless checkouts using the resident's CityWallet, including FSA/HSA (Flexible Spending Account) segregation.

### C. CityDrive Logistics Integration
*   **Medical Deliveries:** Automatic dispatch of CityDrive couriers for delivering prescription medications directly to residents' homes securely.

---

## 2. The Resident Experience (Book & Manage)

This is how citizens interact with healthcare services via their app.

*   **Provider Directory:** A search interface to find local doctors, specialists, and urgent care clinics based on proximity and specialty.
*   **Instant Booking:** Seamlessly book appointments without needing to call the front desk.
*   **Digital Prescriptions:** View active prescriptions and track delivery status if opted for home delivery.

---

## 3. Database Updates Required (Prisma)

To support this, we will add the following models to our Prisma schema:
1.  **Appointment Model:** To track scheduling between a Resident (`User`), a Doctor (`OrganizationMember`), and a Clinic (`Organization`), including status (SCHEDULED, COMPLETED, CANCELLED).
2.  **Prescription Model:** To track digital prescriptions, dosage instructions, and fulfillment status.
3.  **PharmacyItem Model:** To represent a medication or over-the-counter retail item available in the pharmacy's inventory, tracking stock and price.
4.  **PharmacyOrder & PharmacyOrderItem Models:** To handle the POS transaction mapping back to the resident's CityWallet.

---

**STATUS: AWAITING APPROVAL**
*Please review this feature list. Once approved, I will proceed to build the Healthcare backend and frontend.*
