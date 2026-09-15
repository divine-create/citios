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

  // The org must come from an authenticated membership — never from the URL
  // alone. If ?org= is omitted, fall back to the caller's first membership.
  const membership = organizationId
    ? session?.user?.memberships?.find((m) => m.organizationId === organizationId)
    : session?.user?.memberships?.[0];

  const hasAccess = !!membership && ALLOWED_ROLES.includes(membership.role);

  if (!hasAccess || !membership) {
    redirect("/");
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
