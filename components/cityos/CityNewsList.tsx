'use client';

import { Newspaper } from 'lucide-react';

import { CityCard, FallbackImg, Pill, DemoBanner } from '@/components/cityos/CityUI';

export default function CityNewsList() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">News · Calabar City Journal</h1>
        <p className="text-xs text-slate-500 font-medium">
          City desks, business and culture — demo articles for the prototype.
        </p>
      </div>

      <DemoBanner />

      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
          <p className="text-[13px] font-black text-ink">No news</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-900 text-white p-5 flex items-center gap-4">
        <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Newspaper className="w-5 h-5" />
        </span>
        <div>
          <p className="text-sm font-black">More in the feed</p>
          <p className="text-[12px] text-teal-100/70 font-medium">City notices and offers land in the resident feed.</p>
        </div>
      </div>
    </div>
  );
}