import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/src/prisma/db";
import type { OrgRole, OrgType } from "@/types/next-auth";

/**
 * Resolve an active organization ID for a tenant vertical.
 * Checks session JWT first; if stale or newly created, falls back to querying the database directly.
 */
export async function resolveTenantOrg(orgType: OrgType | OrgType[], requestedOrgId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    redirect("/");
  }

  const allowed = Array.isArray(orgType) ? orgType : [orgType];

  // 1. If explicit orgId requested, verify access
  if (requestedOrgId) {
    const memInSession = session?.user?.memberships?.find(
      (m) => m.organizationId === requestedOrgId && allowed.includes(m.organizationType)
    );
    if (memInSession) return requestedOrgId;

    // Check DB for requestedOrgId
    const dbMem = await db.orm.public.Membership.where({
      organizationId: requestedOrgId,
      personId: session.user.personId,
    }).all().first();

    if (dbMem) {
      const org = await db.orm.public.Organization.where({ id: requestedOrgId }).all().first();
      if (org && allowed.includes(org.type as OrgType)) {
        return requestedOrgId;
      }
    }

    if (session.user.isSystemAdmin) {
      const org = await db.orm.public.Organization.where({ id: requestedOrgId }).all().first();
      if (org && allowed.includes(org.type as OrgType)) {
        return requestedOrgId;
      }
    }
  }

  // 2. Check in-memory session memberships
  const membership = session?.user?.memberships?.find((m) => allowed.includes(m.organizationType));
  if (membership?.organizationId) {
    return membership.organizationId;
  }

  // 3. Database fallback for newly created organizations not yet in the JWT cookie
  const userMemberships = await db.orm.public.Membership.where({ personId: session.user.personId }).all();
  for (const m of userMemberships) {
    const org = await db.orm.public.Organization.where({ id: m.organizationId }).all().first();
    if (org && allowed.includes(org.type as OrgType)) {
      return org.id;
    }
  }

  // 4. System Admin fallback: allow accessing any active organization of that type
  if (session.user.isSystemAdmin) {
    const allOrgs = await db.orm.public.Organization.all();
    const match = allOrgs.find((o) => allowed.includes(o.type as OrgType));
    if (match) return match.id;
  }

  redirect("/");
}

/**
 * Enforce that the user has membership/access to the requested organization.
 * Checks session JWT first; falls back to querying Postgres so newly created businesses work immediately.
 */
export async function requireOrgAccess(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    redirect("/");
  }

  // 1. In-session check
  const hasAccess = session?.user?.memberships?.some((m) => m.organizationId === organizationId) ?? false;
  if (hasAccess) return session;

  // 2. Database fallback
  const dbMembership = await db.orm.public.Membership.where({
    personId: session.user.personId,
    organizationId,
  }).all().first();
  if (dbMembership) return session;

  // 3. System admin override
  if (session.user.isSystemAdmin) {
    return session;
  }

  redirect("/");
}

/**
 * Enforce that the user holds an OWNER role or one of the allowed roles for the organization.
 * Checks session JWT first; falls back to database MembershipRole so newly created businesses work immediately.
 */
export async function requireOrgRole(organizationId: string, allowedRoles: OrgRole[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    redirect("/");
  }

  // 1. In-session check
  const membership = session?.user?.memberships?.find((m) => m.organizationId === organizationId);
  const hasAccess = !!membership && (membership.role === 'OWNER' || allowedRoles.includes(membership.role));
  if (hasAccess) return session;

  // 2. Database fallback
  const dbMembership = await db.orm.public.Membership.where({
    personId: session.user.personId,
    organizationId,
  }).all().first();

  if (dbMembership) {
    const roles = await db.orm.public.MembershipRole.where({ membershipId: dbMembership.id }).all();
    const matches = roles.some((r: any) => r.role === 'OWNER' || allowedRoles.includes(r.role as OrgRole));
    if (matches) return session;
  }

  // 3. System admin override
  if (session.user.isSystemAdmin) {
    return session;
  }

  redirect("/");
}

export async function requireCourierAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isCourier) redirect("/");
  return session;
}

export async function requireSystemAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSystemAdmin) {
    redirect("/");
  }
  return session;
}
