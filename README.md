# CityOS

<div align="center">
  <h3>The Unified Digital Ecosystem for Modern Cities</h3>
  <p>Connecting residents, businesses, and organizations through a single, shared operational layer.</p>
</div>

---

## Overview

**CityOS** is a hyper-local platform designed to eliminate the fragmentation of urban digital services. Instead of juggling dozens of separate applications for retail, dining, local services, and municipal interactions, residents use a single unified ecosystem. 

Under the hood, every interaction is powered by a robust master architecture that securely synchronizes resident data with specialized back-office operational tools (ShopOS, ServiceOS, SchoolOS) used by city organizations.

## ✨ Features

### For Residents
* **Unified Identity:** A single, secure profile linking your payments, bookings, and history across the city.
* **CityMart & CityFood:** Integrated retail shopping and restaurant ordering.
* **CityServices & CityJobs:** Book local services and discover local employment opportunities.
* **CityHealth, CityHomes, CitySchools:** Manage your daily needs through specialized, hyper-local verticals.
* **CityCommunity & Newsfeed:** Stay connected with real-time local updates and social networks.

### For Organizations
* **ShopOS:** Complete retail operations, order fulfillment, and inventory tracking.
* **ServiceOS:** End-to-end service request management, quotes, technician dispatch, and invoicing.
* **SchoolOS:** Streamlined student management, scheduling, and administrative operations.

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL
- **ORM:** Prisma 8 (`@prisma/orm-postgres`)
- **Authentication:** NextAuth.js (JWT-based Server-Side Authentication)
- **Styling:** Tailwind CSS (v4)
- **Language:** TypeScript

## 🔒 Architecture & Security

CityOS operates on a strict data isolation and validation pattern ensuring enterprise-grade security:
- **Server-Side Authorization:** User identities and roles are cryptographically verified via JWTs; client-side payloads are never trusted.
- **Transactional Integrity:** Pricing, totals, and inventory states are calculated natively against the database.
- **Strict Tenant Isolation:** Cross-tenant access is strictly blocked through backend Role-Based Access Control (RBAC) ensuring organizations only access their own operational data.

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** (v15+)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/divine-create/citios.git
   cd citios
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the environment:**
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and provide your `DATABASE_URL` and `DIRECT_URL` pointing to your PostgreSQL instance.*

4. **Initialize the database:**
   ```bash
   npx prisma-next db push
   # OR
   npx prisma-next migrate deploy
   ```

5. **Seed the database (Optional):**
   Populate the database with initial configurations and demo catalog items.
   ```bash
   npx tsx scripts/seed.ts
   npx tsx scripts/seed-services.ts
   ```

6. **Run the development server:**
   ```bash
   npm run dev
   ```

7. **Access the platform:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

```text
├── app/                  # Next.js App Router (Pages, API routes)
├── app/actions/          # Secure Server Actions (Domain & DB logic)
├── components/cityos/    # Modular UI & Frontend Components
├── lib/                  # Utilities, config, and core logic
├── src/prisma/           # Prisma 8 Data Contract & emitted artifacts
└── scripts/              # Database seeding and utility scripts
```

## 📄 License

Proprietary / Internal CityOS. All rights reserved.
