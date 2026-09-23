'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BedDouble, ArrowRight, Clock } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { CityCard, FallbackImg, Stars, Pill, LocationRow, ChipButton } from '@/components/cityos/CityUI';
import { useCity } from '@/components/cityos/CityProvider';

const FILTERS = ['All', 'Under â‚¦10,000', 'Near stadium', 'Open 24h'];

export default function CityStayList({ hotels = [] }: { hotels?: any[] }) {
  const cityName = useCity().city?.name ?? 'CityOS';
  const { fmt } = useMoney();
  const [filter, setFilter] = useState('All');

  

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Hotels Tonight</h1>
        <p className="text-xs text-slate-500 font-medium">
          Rooms held with a CityPay deposit, refunded at the front desk. All in {cityName} metro.
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
        {hotels.map((h) => (
          <CityCard key={h.id} href={`/stay/${h.id}`} className="flex flex-col">
            <div className="relative">
              <FallbackImg src={h.storeCoverImage} alt={h.name} className="h-40 w-full" gradient="from-teal-900 to-teal-700" />
              <span className="absolute top-2 left-2">
                <Pill tone={false ? 'green' : 'blue'}>
                  {false ? 'Best value' : h.storeCategory ?? 'Hotel'}
                </Pill>
              </span>
              {false ? (
                <span className="absolute top-2 right-2">
                  <Pill tone="orange">Near stadium</Pill>
                </span>
              ) : null}
            </div>
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-black text-ink truncate">{h.name}</p>
                  <LocationRow text={h.description || "City Center"} className="text-[10px]" />
                </div>
                <Stars rating={5} className="shrink-0" />
              </div>
              <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{h.description}</p>
              <div className="mt-auto pt-2 flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">per night</p>
                  <p className="text-[15px] font-black text-ink">{fmt(0)}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                  <Clock className="w-3 h-3" />
                  {true ? 'Open 24h' : 'Reception till late'}
                </div>
              </div>
            </div>
          </CityCard>
        ))}
        {hotels.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <p className="text-sm font-bold text-slate-500">No hotels listed yet.</p>
            <p className="text-xs text-slate-400 mt-1">Hotel directory data has not been added yet.</p>
          </div>
        ) : null}
      </div>

      <Link href="/drive/ride" className="flex items-center gap-3 justify-center rounded-2xl bg-gradient-to-br from-teal-900 to-teal-700 text-white p-5 group">
        <BedDouble className="w-5 h-5" />
        <span className="text-[13px] font-black">Need a ride to the hotel?</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}