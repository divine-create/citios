'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';

/**
 * Community circles list. There is no canonical community/circle model yet
 * (see the canonical architecture audit) — the demo circles were removed with
 * the demo purge. Honest "not connected" state until that architecture exists.
 */
export default function CityCommunityList() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-7 md:p-9 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[10px] font-black uppercase tracking-widest">
            <Users className="w-3 h-3" /> Communities
          </span>
          <h1 className="mt-3 text-2xl md:text-4xl font-black tracking-tight">Neighbourhoods, on the record</h1>
          <p className="mt-2 text-teal-50/85 text-[13px] font-medium max-w-2xl leading-relaxed">
            The compound WhatsApps and garden circles of the city, given a place in CityOS.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center">
          <Users className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-ink">Community circles aren&apos;t connected yet</h2>
        <p className="text-sm text-slate-500">
          Community groups aren&apos;t part of the live system yet. Follow organizations you care
          about in the feed to keep up with your area.
        </p>
        <Link href="/feed" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Open the feed
        </Link>
      </div>
    </div>
  );
}
