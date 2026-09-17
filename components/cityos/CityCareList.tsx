'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Stethoscope, ArrowRight } from 'lucide-react';
import { DEMO_CLINICS, fmtNaira } from '@/lib/demo/cityos';
import { CityCard, FallbackImg, Stars, Pill, LocationRow, ChipButton, DemoBanner, OpenBadge } from '@/components/cityos/CityUI';

const FILTERS = ['All', 'Open now', 'Free consult', 'Hospital'];

export default function CityCareList() {
  const [filter, setFilter] = useState('All');

  const clinics = DEMO_CLINICS.filter((c) => {
    if (filter === 'Open now') return c.open;
    if (filter === 'Free consult') return c.slug === 'medline-care';
    if (filter === 'Hospital') return c.type === 'Hospital';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">City Care</h1>
        <p className="text-xs text-slate-500 font-medium">
          Clinics, hospitals and pharmacy-led care around Calabar — book a slot in-app.
        </p>
      </div>

      <DemoBanner />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <ChipButton key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </ChipButton>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clinics.map((c) => (
          <CityCard key={c.slug} href={`/care/${c.slug}`} className="flex flex-col">
            <FallbackImg src={c.banner} alt={c.name} className="h-36 w-full" gradient="from-teal-900 to-teal-700" />
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-black text-ink truncate">{c.name}</p>
                  <LocationRow text={`${c.area} · ${c.type}`} className="text-[10px]" />
                </div>
                <Stars rating={c.rating} className="shrink-0" />
              </div>
              <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{c.tagline}</p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <OpenBadge open={c.open} />
                <Pill tone="blue">{`from ${fmtNaira(Math.min(...c.doctors.map((d) => d.fee)))} consult`}</Pill>
              </div>
            </div>
          </CityCard>
        ))}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-teal-900 to-teal-700 text-white p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-black text-teal-100 uppercase tracking-widest">
            <Stethoscope className="w-3.5 h-3.5" /> Pharmacy care
          </p>
          <p className="text-sm font-black mt-1">Need medicine sooner? Order from Medline Pharmacy for delivery.</p>
        </div>
        <Link href="/biz/medline-pharmacy" className="inline-flex items-center gap-1.5 self-start px-4 py-2 rounded-xl bg-white text-teal-900 text-xs font-black hover:bg-teal-50 transition-colors">
          Open pharmacy <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}