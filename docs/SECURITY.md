# Security Architecture

## Core Security Boundaries
1. **Tenant Boundary:** An organization must absolutely never be able to access data belonging to another organization.
2. **Identity Boundary:** An organization does not own the user. They only own the relationship data. They cannot reset a user's global password or access the user's data across other organizations.
3. **Financial Boundary:** Transactions and wallet balances must be cryptographically or structurally protected against tampering.

## Authentication
- Handled via NextAuth / Supabase Auth.
- Tokens (JWT) must contain claims identifying the user globally.
- Session invalidation must be global.

## Authorization & RLS
- All API endpoints must authenticate the user.
- If an endpoint accesses tenant data, it must verify the user's `OrganizationMember` role.
- Supabase Row-Level Security (RLS) acts as a safety net. If backend code accidentally queries `prisma.hotelRoom.findMany()`, RLS should prevent it from returning rooms outside the current execution context's allowed organizations.

## PII and Privacy
- Consolidating identity into the `User` model improves privacy by reducing the surface area of stored PII.
- When an Organization views a User, they only see the globally permitted profile fields (Name, Avatar) and their tenant-specific relationship data. 
- Shadow accounts (users created without logging in) must not expose a security vector. They have no credentials, so they cannot be logged into until properly claimed via email/SMS verification.
