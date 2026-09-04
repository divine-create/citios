# Education & School Management Vertical (Feature List)

This document outlines the architecture and features for the "Education" vertical. This software will serve as a state-of-the-art Student Information System (SIS) and Learning Management System (LMS) for local schools and universities, fully integrated into the CityConnect Super App.

## 1. The School Admin Portal (`/admin/school`)

This is the SaaS platform that school administrators, principals, and teachers will use to run the institution.

### A. Student Information System (SIS)
*   **Centralized Student Profiles:** Track demographics, emergency contacts, medical records (allergies, medications), and disciplinary history in one secure, compliant dashboard.
*   **Live Attendance Tracking:** Replace manual roll calls with RFID badge scans or biometric tap-ins at classroom doors, automatically updating the centralized system.
*   **Automated Scheduling:** Algorithmic master schedule generation that balances teacher loads, classroom capacities, and student electives without conflicts.

### B. Learning Management System (LMS)
*   **Interactive Gradebooks:** Teachers can enter grades that instantly sync to report cards and the Parent Portal.
*   **Assignment & Curriculum Hub:** A portal for uploading syllabi, distributing digital assignments, and collecting student submissions with automated plagiarism checks.
*   **Behavioral & Academic Flags:** Automated early-warning systems that alert counselors if a student's grades or attendance suddenly drop.

### C. Logistics & Operations
*   **Live Fleet Tracking (CityDrive Integration):** GPS tracking of school buses in real-time, sending automated proximity alerts to parents' phones when the bus is approaching their stop.
*   **Cafeteria POS (CityPay Integration):** Cashless cafeteria lines where students scan their student ID, automatically deducting funds from their parents' CityWallet.

## 2. The Resident Experience (Parent & Student Portal)

This is how citizens (Parents and Students) will interact with the school via their CityConnect app.

*   **Real-Time Academic Dashboard:** Parents can open the CityConnect app to see live grades, missing assignments, and upcoming project deadlines.
*   **Instant Communication:** A secure, built-in messaging platform to chat directly with teachers, coaches, and administrators without needing personal phone numbers.
*   **Push Notifications:** Automated alerts for unexcused absences, low cafeteria balances, or emergency school closures (e.g., snow days).
*   **Digital Permission Slips & Payments:** Parents can e-sign field trip permission slips and pay for yearbooks or athletic fees directly using CityPay.

---

## 3. Database Updates Required (Prisma)

To support this, we will need to expand our current schema and add new models:
1.  **Student Model:** Link students to their respective `Organization` (School) and to a Guardian `User` account.
2.  **Course & Grade Models:** Track classes, enrolled students, assignments, and grades.
3.  **Attendance Record Model:** Track daily presence, tardiness, and absences.

---

**STATUS: AWAITING APPROVAL**
*Please review this feature list. Once approved, I will proceed to build the Education backend and frontend.*
