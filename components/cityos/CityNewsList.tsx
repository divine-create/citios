'use client';

import { Newspaper } from 'lucide-react';
import { DEMO_NEWS } from '@/lib/demo/cityos';
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
        {DEMO_NEWS.map((n) => (
          <CityCard key={n.slug} href={`/news/${n.slug}`} className="flex flex-col sm:flex-row overflow-hidden">
            <FallbackImg src={n.image} alt={n.title} className="h-40 sm:h-auto sm:w-64 shrink-0 w-full sm:w-64" />
            <div className="p-5 flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Pill tone="teal">{n.category}</Pill>
                <span className="text-[10px] font-bold text-slate-400">{`${n.author} · ${n.time}`}</span>
              </div>
              <h2 className="text-[16px] font-black text-ink leading-snug">{n.title}</h2>
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed">{n.excerpt}</p>
            </div>
          </CityCard>
        ))}
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