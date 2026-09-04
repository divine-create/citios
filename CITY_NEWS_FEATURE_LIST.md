# City News & Media Publisher Vertical (Feature List)

This document outlines the architecture and features for the "City News" vertical. This software will serve as a state-of-the-art Content Management System (CMS) and Publishing platform for local news outlets, city governments, and independent journalists, seamlessly integrated into the CityConnect Super App.

## 1. The Publisher Admin Portal (`/admin/news`)

This is the SaaS platform that news organizations (e.g., "The Daily Chronicle") will use to run their entire editorial operation.

### A. Editorial Workflow & CMS
*   **Rich Text Editor:** A modern block-based editor (similar to Notion or WordPress Gutenberg) supporting embedded videos, image galleries, and pull quotes.
*   **Multi-Author Collaboration:** Roles for Journalists, Editors, and Publishers. Journalists can write drafts; Editors must approve them before publication.
*   **Version Control & History:** Track changes on articles and revert to previous drafts.
*   **Categorization & Tagging:** Tag articles by local district (e.g., "Downtown", "Westside") or topic (e.g., "Politics", "Sports", "Weather").

### B. Breaking News & Dispatch
*   **Emergency Overrides:** Verified publishers (like the City Government) can mark a post as an `isEmergency` alert.
*   **Push Notifications:** Target push notifications to residents based on their configured location or interests (e.g., sending traffic updates only to commuters).

### C. Analytics & Audience Insights
*   **Engagement Metrics:** Track views, read-through rates (how far down the page users scroll), and share counts.
*   **Audience Demographics:** Anonymized data on which districts are reading which articles.

---

## 2. The Resident Experience (`/news`)

This is how citizens will consume the content on their CityConnect app.

*   **Personalized News Feed:** A dedicated tab that aggregates news from all local publishers, sorted by relevance and timestamp.
*   **Local Filtering:** A toggle to filter news strictly by the Resident's current neighborhood or district.
*   **Free & Open Access:** All local news is completely free to read, ensuring critical information is accessible to every resident regardless of income.
*   **Community Discussions:** Verified residents can leave comments on articles, fostering local civic discourse (moderated by the publishers).

---

## 3. Database Updates Required (Prisma)

To support this, we will need to expand our current `Post` model and add new ones:
1.  **Article Model:** Expand `Post` to include `status` (DRAFT, REVIEW, PUBLISHED) and `viewCount`.
2.  **Comment Model:** Allow residents to comment on articles.

---

**STATUS: AWAITING APPROVAL**
*Please review this feature list. Once approved, I will proceed to build the City News backend and frontend.*
