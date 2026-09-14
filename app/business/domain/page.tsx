import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DomainSearch from "@/components/business/DomainSearch";
import { Globe } from "lucide-react";

const ALLOWED_ROLES = ["OWNER", "MANAGER", "ADMIN"];

export default async function BusinessDomainPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org: organizationId } = await searchParams;
  const session = await getServerSession(authOptions);

  const membership = organizationId
    ? session?.user?.memberships?.find((m) => m.organizationId === organizationId)
    : session?.user?.memberships?.[0];

  const hasAccess = !!membership && ALLOWED_ROLES.includes(membership.role);
  if (!hasAccess || !membership) {
    redirect("/");
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
