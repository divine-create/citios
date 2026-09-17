'use client';

import Link from 'next/link';
import { Users, MapPin, ArrowRight, Plus } from 'lucide-react';
import { COMMUNITIES } from '@/lib/demo/universe/orgs';
import { SectionHead, Pill, DemoBanner } from '@/components/cityos/CityUI';

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
            The compound WhatsApps and garden circles of Calabar, given a place in the city. Join a circle, follow the board, or start your own.
          </p>
        </div>
      </div>

      <section>
        <SectionHead title="Circles in the demo" sub="Every community shares one map, one identity, one dataset" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COMMUNITIES.map((c) => (
            <Link
              key={c.id}
              href={`/community/${c.id}`}
              className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col"
            >
              <div className="flex items-start justify-between">
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-800 to-teal-500 text-white flex items-center justify-center text-xl shadow-md">
                  {c.id === 'c1' ? '🏠' : c.id === 'c2' ? '🌿' : '🎨'}
                </span>
                <Pill tone="teal">{`${c.members.toLocaleString()} members`}</Pill>
              </div>
              <p className="mt-4 text-[15px] font-black text-ink leading-snug">{c.name}</p>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-teal-700" /> {c.area}
              </p>
              <p className="text-[12px] text-slate-500 font-medium leading-relaxed mt-2 line-clamp-3">{c.about}</p>
              <div className="mt-auto pt-4 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">{`Admin · ${c.admin}`}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-teal-800">
                  Open board <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}

          <Link
            href="/create"
            className="rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/40 hover:bg-teal-50/70 p-6 flex flex-col items-center justify-center gap-2 text-center min-h-[220px]"
          >
            <span className="w-12 h-12 rounded-2xl bg-teal-800 text-white flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </span>
            <p className="text-[13px] font-black text-teal-900">Start a community</p>
            <p className="text-[11px] text-teal-700/70 font-medium max-w-[200px]">From the Create hub — a new circle gets its own board.</p>
          </Link>
        </div>
      </section>

      <DemoBanner />
    </div>
  );
}