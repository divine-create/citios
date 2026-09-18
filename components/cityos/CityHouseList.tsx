'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, BedDouble, Bath, MapPin, Wifi } from 'lucide-react';
import { fmtNaira } from '@/lib/format';
import { useCity } from '@/components/cityos/CityProvider';
import { CityCard, FallbackImg, Pill, LocationRow, ChipButton, PriceTag, DemoBanner } from '@/components/cityos/CityUI';

// Property filter chrome (UI tags only, not content).
const PROPERTY_TAGS = ['All', 'Available', 'Furnished', 'Affordable', 'New'];
import { cn } from '@/lib/utils';

export default function CityHouse() {
  const cityName = useCity().city?.name ?? 'CityOS';
  const [tag, setTag] = useState('All');
  const [query, setQuery] = useState('');

  const results: any[] = [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">CityHouse</h1>
        <p className="text-xs text-slate-500 font-medium">
          Find flats and rooms around {cityName} — deposit and rent flow through CityPay.
        </p>
      </div>

      <DemoBanner />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search area or address… e.g. Ekorinim, Goldie, garden"
            className="w-full bg-white rounded-xl py-3 pl-11 pr-4 text-[13px] font-medium text-slate-700 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/40 placeholder:text-slate-400 transition-all"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {PROPERTY_TAGS.map((t) => (
          <ChipButton key={t} active={tag === t} onClick={() => setTag(t)}>
            {t}
          </ChipButton>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((p) => (
          <CityCard key={p.id} href={`/house/${p.id}`} className="flex flex-col">
            <div className="relative">
              <FallbackImg src={p.image} alt={p.title} className="h-40 w-full" />
              <span className="absolute top-2 left-2"><Pill tone="orange">{p.type}</Pill></span>
              {p.featured ? <span className="absolute top-2 right-2"><Pill tone="teal">Featured</Pill></span> : null}
            </div>
            <div className="p-4 flex-1 flex flex-col gap-1.5">
              <p className="text-[14px] font-black text-ink leading-snug">{p.title}</p>
              <LocationRow text={`${p.area} · ${p.address}`} className="text-[11px]" />
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-teal-700" /> {p.bedrooms} bed</span>
                <span className="inline-flex items-center gap-1"><Bath className="w-3.5 h-3.5 text-teal-700" /> {p.bathrooms} bath</span>
                {p.furnished ? <Pill tone="blue" className="ml-auto">Furnished</Pill> : null}
              </div>
              <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2 mt-0.5">{p.desc}</p>
              <div className="mt-auto pt-3 flex items-end justify-between border-t border-slate-100">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">per year</p>
                  <p className="text-lg font-black text-ink">{fmtNaira(p.pricePerYear)}</p>
                  <p className="text-[10px] font-bold text-slate-400">{`≈ ${fmtNaira(p.pricePerYear / 12)} / month`}</p>
                </div>
                {p.available ? <Pill tone="green">Available</Pill> : <Pill tone="red">Occupied</Pill>}
              </div>
            </div>
          </CityCard>
        ))}
        {results.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
            <p className="text-[13px] font-black text-ink">No listings match</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Try a different area or filter.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}