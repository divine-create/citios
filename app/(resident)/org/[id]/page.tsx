import OrgProfile from '@/components/cityos/OrgProfile';
import { getResidentOrganization } from '@/app/actions/org';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function OrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Enforce discovery visibility (handles both slugs and UUIDs)
  const resolved = await getResidentOrganization(id);
  
  if (!resolved) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">ðŸ ¢</p>
        <h1 className="text-lg font-black text-ink">That organization could not be found.</h1>
        <p className="text-sm text-slate-500">It might have been removed or is not currently public.</p>
        <Link href="/explore" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Explore City
        </Link>
      </div>
    );
  }

  // Pass the canonical orgId so OrgProfile doesn't fail looking up a slug
  return <OrgProfile id={resolved.orgId} />;
}