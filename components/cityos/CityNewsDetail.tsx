'use client';

import Link from 'next/link';
import { Newspaper } from 'lucide-react';

/**
 * News story detail. CityNews has no canonical news-source model — the
 * canonical Post model powers the resident feed, not an editorial news desk.
 * The demo news articles were removed with the demo purge; honest "not
 * connected" state until a news-source architecture exists.
 */
export default function CityNewsDetail({ id }: { id: string }) {
  void id;
  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center">
        <Newspaper className="w-7 h-7" />
      </div>
      <h1 className="text-lg font-black text-ink">News stories aren&apos;t connected yet</h1>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        CityOS doesn&apos;t carry a news desk yet. Community updates from organizations you
        follow appear in the feed.
      </p>
      <Link href="/news" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
        Back to News
      </Link>
    </div>
  );
}
