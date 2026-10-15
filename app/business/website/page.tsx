import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import MicrositeBuilder from "@/components/microsite/MicrositeBuilder";
import { Globe } from "lucide-react";

// Cross-vertical: reachable from any org's admin dashboard as
// `/business/website?org=<organizationId>`. Not nested under any single
// vertical's `(admin)` route group since the feature itself isn't
// vertical-specific — deliberately its own top-level surface.
const ALLOWED_ROLES = ["OWNER", "MANAGER", "ADMIN"];

export default async function BusinessWebsitePage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org: searchOrgId } = await searchParams;
  const organizationId = searchOrgId === "null" ? undefined : searchOrgId;
  const session = await getServerSession(authOptions);

  if (!session?.user?.personId) {
    redirect("/login");
  }

  let targetOrgId = organizationId;
  if (!targetOrgId && session.user.memberships?.length) {
    targetOrgId = session.user.memberships[0].organizationId;
  }

  if (!targetOrgId) {
    redirect("/business");
  }

  const { db } = await import("@/src/prisma/db");
  const membership = await db.orm.public.Membership.where({
    personId: session.user.personId,
    organizationId: targetOrgId,
  }).all().first();

  if (!membership) {
    redirect("/business");
  }

  const roles = await db.orm.public.MembershipRole.where({ membershipId: membership.id }).all();
  const hasAccess = roles.some((r: any) => ALLOWED_ROLES.includes(r.role));

  if (!hasAccess) {
    redirect("/business");
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC]">
      <header className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Globe size={20} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Website Builder</h1>
            <p className="text-sm text-slate-500">Build a dedicated, professional website for your organization.</p>
          </div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-6">
        <MicrositeBuilder organizationId={membership.organizationId} />
      </div>
    </div>
  );
}
