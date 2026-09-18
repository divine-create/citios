'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';

/**
 * Community circle detail. There is no canonical community/circle model yet
 * (see the canonical architecture audit) — the demo circle profiles with
 * simulated posts, joins and likes were removed with the demo purge. Honest
 * "not connected" state until that architecture exists.
 */
export default function CityCommunityDetail({ id }: { id: string }) {
  void id;
  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center">
        <Users className="w-7 h-7" />
      </div>
      <h1 className="text-lg font-black text-ink">Community circles aren&apos;t connected yet</h1>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        Community groups aren&apos;t part of the live system yet, so this circle can&apos;t be
        shown. Follow organizations in the feed to keep up with your area.
      </p>
      <Link href="/community" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
        Back to communities
      </Link>
    </div>
  );
}
