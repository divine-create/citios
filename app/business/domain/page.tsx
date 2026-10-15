import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DomainSearch from "@/components/business/DomainSearch";
import { Globe } from "lucide-react";

const ALLOWED_ROLES = ["OWNER", "MANAGER", "ADMIN"];

export default async function BusinessDomainPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org: organizationId } = await searchParams;
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

  // In a real app we'd fetch the microsite and see if it has a custom domain already
  const currentDomain = null; // Mocking no domain for now

  return (
    <div className="min-h-screen bg-[#F4F7FC]">
      <header className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><Globe size={20} /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Domain Management</h1>
            <p className="text-sm text-slate-500">Find and connect a custom web address for your organization.</p>
          </div>
        </div>
      </header>
      
      <DomainSearch organizationId={membership.organizationId} currentDomain={currentDomain} />
    </div>
  );
}
