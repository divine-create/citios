# Authorization & RBAC

## Role-Based Access Control (RBAC)
Authorization in Citios is tenant-scoped. A global `User` has no intrinsic permissions. Permissions are derived from their relationship with an `Organization` via the `OrganizationMember` table.

## The OrganizationMember Model
```prisma
model OrganizationMember {
  userId         String
  organizationId String
  role           OrgRole
}
```

### Roles (`OrgRole`)
Roles define the level of access a user has *within that specific organization*:
- **Universal Roles:** `OWNER`, `MANAGER`, `STAFF`, `ADMIN`, `FINANCE`
- **Vertical-Specific Roles:** 
  - EduOS: `TEACHER`, `REGISTRAR`, `COUNSELOR`, `LIBRARIAN`
  - HotelOS: `HOTEL_MANAGER`, `HOTEL_FRONT_DESK`, `HOTEL_HOUSEKEEPER`
  - ShopOS: `CASHIER`, `INVENTORY_STAFF`
  - ClinicOS: `DOCTOR`

## Target Architecture Guidelines
1. **Vertical Roles:** Defining hardcoded roles in the `OrgRole` enum is brittle. As new OSs are added, this enum will grow infinitely. 
   *Recommendation:* Transition to a permission-based system (capabilities) or composite roles (e.g., `STAFF` + JSON array of capabilities like `["pos:checkout", "inventory:edit"]`) rather than adding a new enum value for every job title.
2. **Contextual Authorization:** Application endpoints must check permissions using `(userId, organizationId)`. Just knowing a user is a `TEACHER` is insufficient; they must be a `TEACHER` at `organizationId = X`.
3. **Consumers vs Members:** A resident consuming a service (e.g., a patient, a shopper, a parent) is **NOT** an `OrganizationMember`. Members are the workforce/admins. Consumers interact via relationship models (e.g., `OrganizationCustomer`).

## Security Enforcement
- **Middleware / API Layer:** API routes must verify the user's session, extract the requested `organizationId` from the route/body, and validate the `OrganizationMember` role before proceeding.
- **Database Level (RLS):** RLS policies in Supabase must rely on the user's JWT containing their `organizationId` claims (or querying the member table) to prevent cross-tenant data leaks.
