import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { OrgRole, OrgType } from "@/types/next-auth";

export async function resolveTenantOrg(orgType: OrgType | OrgType[]) {
  const session = await getServerSession(authOptions);
  const allowed = Array.isArray(orgType) ? orgType : [orgType];
  const membership = session?.user?.memberships?.find((m) => allowed.includes(m.organizationType));
  if (!membership?.organizationId) {
    redirect("/");
  }
  return membership.organizationId;
}

export async function requireOrgAccess(organizationId: string) {
  const session = await getServerSession(authOptions);
  const hasAccess = session?.user?.memberships?.some((m) => m.organizationId === organizationId) ?? false;
  if (!hasAccess) redirect("/");
  return session;
}

export async function requireOrgRole(organizationId: string, allowedRoles: OrgRole[]) {
  const session = await getServerSession(authOptions);
  const membership = session?.user?.memberships?.find((m) => m.organizationId === organizationId);
  const hasAccess = !!membership && (membership.role === 'OWNER' || allowedRoles.includes(membership.role));
  if (!hasAccess) redirect("/");
  return session;
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
