'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Stethoscope, ArrowRight } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { CityCard, FallbackImg, Stars, Pill, LocationRow, ChipButton,  OpenBadge } from '@/components/cityos/CityUI';
import { useCity } from '@/components/cityos/CityProvider';

const FILTERS = ['All', 'Open now', 'Free consult', 'Hospital'];

export default function CityCareList() {
  const cityName = useCity().city?.name ?? 'CityOS';
  const { fmt } = useMoney();
  const [filter, setFilter] = useState('All');

  const clinics: any[] = [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">City Care</h1>
        <p className="text-xs text-slate-500 font-medium">
          Clinics, hospitals and pharmacy-led care around {cityName} â€” book a slot in-app.
        </p>
      </div>

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
                  <LocationRow text={`${c.area} Â· ${c.type}`} className="text-[10px]" />
                </div>
                <Stars rating={c.rating} className="shrink-0" />
              </div>
              <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{c.tagline}</p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <OpenBadge open={c.open} />
                <Pill tone="blue">{`from ${fmt(Math.min(...c.doctors.map((d: any) => d.fee)))} consult`}</Pill>
              </div>
            </div>
          </CityCard>
        ))}
        {clinics.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
            <p className="text-[13px] font-black text-ink">No clinics match</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Try a different filter.</p>
          </div>
        ) : null}
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