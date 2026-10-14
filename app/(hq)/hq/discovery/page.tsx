import Link from 'next/link';
import { requireSystemAdmin } from '@/lib/rbac';
import { getScrapedDiscoveryListings } from '@/lib/actions/discovery-admin';
import DiscoveryReviewManager from './DiscoveryReviewManager';
import { Map } from 'lucide-react';

const TABS = [
  { id: 'PENDING_REVIEW', label: 'Pending Review' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'REJECTED', label: 'Rejected' },
] as const;

export default async function HQDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireSystemAdmin();

  const { status } = await searchParams;
  const active = (TABS.find((t) => t.id === status)?.id ?? 'PENDING_REVIEW') as
    | 'PENDING_REVIEW'
    | 'PUBLISHED'
    | 'REJECTED';

  const listings = await getScrapedDiscoveryListings({ status: active });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Map className="w-7 h-7 text-teal-400" />
          Discovery Review
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review businesses collected from scrapers and feeds. Edit details, then publish them to the live city directory.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/hq/discovery?status=${t.id}`}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              active === t.id
                ? 'bg-teal-600 border-teal-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t.label}
          </Link>
        ))}
        <span className="ml-auto px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
          Showing: <strong className="text-teal-400 font-mono">{listings.length}</strong>
        </span>
      </div>

      <DiscoveryReviewManager key={active} initialListings={listings} mode={active} />
    </div>
  );
}
