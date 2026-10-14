import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import ClaimForm from './ClaimForm';
import { Building2, ShieldCheck, ArrowLeft } from 'lucide-react';

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string }>;
}) {
  const { orgId } = await searchParams;

  // Authentication requirement per AGENTS.md rule 5
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(orgId ? `/business/claim?orgId=${orgId}` : '/business/claim')}`);
  }

  if (!orgId) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 text-teal-700 flex items-center justify-center text-3xl">
          🏢
        </div>
        <h1 className="text-xl font-black text-ink">Claim Your Business on CityOS</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Search for your business listing in the city directory, then click <strong>"Claim Profile"</strong> to verify ownership and unlock your management workspace.
        </p>
        <div className="pt-2">
          <Link
            href="/explore"
            className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-700 transition-colors"
          >
            Find Your Business in Directory →
          </Link>
        </div>
      </div>
    );
  }

  const org = await db.orm.public.Organization.where({ id: orgId }).all().first();
  if (!org) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <h1 className="text-xl font-black text-ink">Listing Not Found</h1>
        <p className="text-sm text-slate-500">The business ID provided does not match any registered or discovered profile.</p>
        <Link href="/explore" className="inline-block text-xs font-black text-teal-800 hover:underline">
          Return to Explore
        </Link>
      </div>
    );
  }

  // Check if current user already owns or has a pending claim
  const existingClaim = await db.orm.public.OrganizationClaim.where({
    organizationId: org.id,
    claimantPersonId: session.user.personId,
    status: 'PENDING',
  }).all().first();

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6 animate-in fade-in duration-500">
      <Link
        href={`/org/${org.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Business Profile
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-ink tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-teal-600" />
          Claim Business Profile
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Verify your association with {org.name} to receive customer leads, update hours, and activate your owner tools.
        </p>
      </div>

      {existingClaim ? (
        <div className="bg-amber-50 rounded-3xl border border-amber-200 p-6 md:p-8 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-black text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            Claim Verification Under Review
          </div>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            You previously submitted a claim for <strong>{org.name}</strong>. Our city verification team is reviewing your contact and location information. You will receive an update once the review is completed.
          </p>
          <div className="pt-2">
            <Link
              href={`/org/${org.id}`}
              className="inline-block px-4 py-2 rounded-xl bg-amber-700 text-white text-xs font-black hover:bg-amber-800 transition-colors"
            >
              Back to Profile
            </Link>
          </div>
        </div>
      ) : (
        <ClaimForm
          organizationId={org.id}
          organizationName={org.name}
          organizationType={org.type}
          address={org.address || undefined}
          initialName={session.user.name || undefined}
        />
      )}
    </div>
  );
}
