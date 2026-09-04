import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { OrgType } from "@/types/next-auth";

/**
 * Gates a server component behind membership in an org of the given type(s).
 * There's one org per OrgType in the current data, so "member of an org of
 * this type" is the real-world equivalent of "works for this vertical" —
 * finer-grained per-page role checks (e.g. only OWNER can see financials)
 * can layer on top of `session.user.memberships` once the product defines
 * which roles should see which screens.
 */
export async function requireOrgAccess(orgType: OrgType | OrgType[]) {
  const session = await getServerSession(authOptions);
  const allowed = Array.isArray(orgType) ? orgType : [orgType];
  const hasAccess = session?.user?.memberships?.some((m) => allowed.includes(m.organizationType)) ?? false;

  if (!hasAccess) {
    redirect("/");
  }

  return session;
}

/** Gates a server component behind having a GigWorkerProfile (CityDrive courier). */
export async function requireCourierAccess() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isCourier) {
    redirect("/");
  }

  return session;
}
