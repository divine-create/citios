'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getNews } from '@/lib/demo/cityos';
import { FallbackImg, Pill, DemoBanner } from '@/components/cityos/CityUI';

export default function CityNewsDetail({ id }: { id: string }) {
  const n = getNews(id);

  if (!n) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <h1 className="text-lg font-black text-ink">That story is not in the demo news desk.</h1>
        <Link href="/news" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">Back to News</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Link href="/news" className="hover:text-teal-800">News</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 truncate">{n.category}</span>
      </nav>

      <div className="relative rounded-3xl overflow-hidden">
        <FallbackImg src={n.image} alt={n.title} className="h-56 md:h-72 w-full" />
        <div className="absolute bottom-3 left-3">
          <Pill tone="teal">{n.category}</Pill>
        </div>
      </div>

      <article className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8">
        <p className="text-[11px] font-bold text-slate-400">{`${n.author} · ${n.time}`}</p>
        <h1 className="text-xl md:text-2xl font-black text-ink leading-tight mt-2">{n.title}</h1>
        <div className="h-px bg-slate-100 my-5" />
        <div className="space-y-4">
          {n.content.map((p, i) => (
            <p key={i} className="text-[14px] text-slate-600 leading-relaxed">{p}</p>
          ))}
        </div>
      </article>

      <DemoBanner />
    </div>
  );
}