import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { db } from "@/src/prisma/db";
import Link from "next/link";
import { Wrench, Plus, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "ServiceOS | 9jaLive Service",
  description: "Appointments, jobs, scheduling, and service management.",
};

export default async function ServiceOSPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const resolvedParams = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.personId) {
    redirect("/login?callbackUrl=/service");
  }

  const personId = session.user.personId;

  // If a specific organization was requested in searchParams, verify membership
  if (resolvedParams.org) {
    const membership = await db.orm.public.Membership.where({
      organizationId: resolvedParams.org,
      personId,
    }).all().first();

    if (membership) {
      redirect(`/workspaces/serviceos/${resolvedParams.org}`);
    }
  }

  // Find all service organizations the user is a member of
  const memberships = await db.orm.public.Membership.where({ personId }).all();
  const orgIds = memberships.map((m) => m.organizationId);

  let serviceOrgs: any[] = [];
  if (orgIds.length > 0) {
    const allServices = await db.orm.public.Organization.where({ type: "SERVICES" }).all();
    serviceOrgs = allServices.filter((o) => orgIds.includes(o.id));
  }

  // If the user has exactly one service organization, direct them straight into it
  if (serviceOrgs.length === 1) {
    redirect(`/workspaces/serviceos/${serviceOrgs[0].id}`);
  }

  // If the user has multiple service orgs, let them select
  if (serviceOrgs.length > 1) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Select Your Service Business</h1>
        <p className="text-sm text-slate-500 mb-6">Choose an organization to open your ServiceOS workspace.</p>
        <div className="grid gap-3">
          {serviceOrgs.map((org) => (
            <Link
              key={org.id}
              href={`/workspaces/serviceos/${org.id}`}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{org.name}</h3>
                  <p className="text-xs text-slate-500">{org.address || "Local service provider"}</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-400" />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // If the user has no service organization yet, prompt them to register
  return (
    <div className="max-w-lg mx-auto text-center py-24 px-4 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
        <Wrench size={28} />
      </div>
      <h1 className="text-2xl font-black text-slate-900">Welcome to ServiceOS</h1>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        You are not currently a member of any service business organization. Register your business to manage appointments, quotes, jobs, and customer CRM.
      </p>
      <div className="pt-2">
        <Link
          href="/business/register"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
        >
          <Plus size={16} /> Register Service Business
        </Link>
      </div>
    </div>
  );
}
