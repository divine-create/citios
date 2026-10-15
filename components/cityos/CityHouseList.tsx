'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Sparkles, BedDouble } from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import AirbnbCard from '@/components/cityos/AirbnbCard';
import AirbnbSearchCapsule from '@/components/cityos/AirbnbSearchCapsule';
import { cn } from '@/lib/utils';

const PROPERTY_TAGS = ['All Homes', 'Furnished Apartments', 'Serviced Suites', 'Guest Houses', 'Monthly Stays'];

export default function CityHouse({ stays = [] }: { stays?: any[] }) {
  const cityName = useCity().city?.name ?? 'Calabar';
  const [tag, setTag] = useState('All Homes');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Floating Capsule Search Bar */}
      <AirbnbSearchCapsule />

      {/* Header Info */}
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-black uppercase tracking-wider text-[#FF385C] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            CityHomes & Living
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#222222] tracking-tight">
          Homes & Serviced Apartments in {cityName}
        </h1>
        <p className="text-sm text-[#717171] font-medium">
          Verified short-lets, executive flats, and serviced residences in {cityName}. Protected by CityPay escrow.
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {PROPERTY_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={cn(
              'px-4 py-2 rounded-full text-[13px] font-semibold transition-all shrink-0 border',
              tag === t
                ? 'border-[#222222] bg-[#222222] text-white shadow-sm'
                : 'border-[#EBEBEB] bg-white text-[#717171] hover:border-neutral-400 hover:text-[#222222]'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Airbnb 4-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
        {stays.map((p, idx) => {
          const price = 25000 + (idx % 5) * 5000;
          return (
            <AirbnbCard
              key={p.id}
              id={p.id}
              href={`/stay/${p.id}`}
              title={p.name}
              subtitle={p.description || 'Furnished serviced flat with backup power'}
              neighborhood={p.neighborhood || p.address || `${cityName} Metro`}
              image={p.storeCoverImage || p.image || p.logoAssetId}
              images={p.images}
              rating={p.rating || 4.88}
              reviewCount={15 + ((idx * 6) % 30)}
              badge={idx % 3 === 0 ? 'Guest favorite' : undefined}
              price={price}
              priceSuffix="night"
              metaLine="2 bedrooms · Wifi · 24/7 Power"
              aspectRatio="4/3"
            />
          );
        })}

        {stays.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-neutral-300 p-12 text-center bg-white">
            <Home className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
            <p className="text-base font-bold text-[#222222]">No homes listed yet</p>
            <p className="text-xs text-[#717171] mt-1">Check back soon or explore boutique stays.</p>
          </div>
        )}
      </div>
    </div>
  );
}