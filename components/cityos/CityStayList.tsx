'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BedDouble, ArrowRight, Sparkles } from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import AirbnbCard from '@/components/cityos/AirbnbCard';
import AirbnbSearchCapsule from '@/components/cityos/AirbnbSearchCapsule';
import { cn } from '@/lib/utils';

const FILTERS = ['All Stays', 'Boutique Hotels', 'Lakeside & Resorts', 'Budget Friendly', 'Executive Suites'];

export default function CityStayList({ hotels = [] }: { hotels?: any[] }) {
  const cityName = useCity().city?.name ?? 'Calabar';
  const [filter, setFilter] = useState('All Stays');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Floating Capsule Search Bar */}
      <AirbnbSearchCapsule />

      {/* Header Info */}
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-black uppercase tracking-wider text-[#FF385C] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Boutique Living & Stays
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#222222] tracking-tight">
          Places to stay in {cityName}
        </h1>
        <p className="text-sm text-[#717171] font-medium">
          Verified hotels, luxury suites, and serviced apartments in {cityName}. Book with CityPay protection.
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-full text-[13px] font-semibold transition-all shrink-0 border',
              filter === f
                ? 'border-[#222222] bg-[#222222] text-white shadow-sm'
                : 'border-[#EBEBEB] bg-white text-[#717171] hover:border-neutral-400 hover:text-[#222222]'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Airbnb Stays Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
        {hotels.map((h, idx) => {
          // Provide realistic hospitality pricing based on hotel tier or name
          const basePrice = h.name.toLowerCase().includes('resort') || h.name.toLowerCase().includes('suites')
            ? 35000 + (idx % 5) * 5000
            : 22000 + (idx % 4) * 3000;

          return (
            <AirbnbCard
              key={h.id}
              id={h.id}
              href={`/stay/${h.id}`}
              title={h.name}
              subtitle={h.description || 'Modern comfort & room service'}
              neighborhood={h.neighborhood || h.address || `${cityName} Metro`}
              image={h.storeCoverImage || h.image || h.logoAssetId}
              images={h.images}
              rating={h.rating}
              reviewCount={h.reviewCount}
              badge={h.badge}
              price={h.price || basePrice}
              priceSuffix="night"
              metaLine="Free cancellation · Verified host"
              aspectRatio="4/3"
            />
          );
        })}

        {hotels.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-neutral-300 p-12 text-center bg-white">
            <BedDouble className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
            <p className="text-base font-bold text-[#222222]">No stays listed in this area yet</p>
            <p className="text-xs text-[#717171] mt-1">Check back soon as more local hosts join CityOS.</p>
          </div>
        )}
      </div>

      {/* CityDrive Upsell */}
      <Link
        href="/drive/ride"
        className="flex items-center justify-between rounded-3xl bg-[#222222] text-white p-6 shadow-lg hover:bg-black transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
            <BedDouble className="w-6 h-6 text-[#FF385C]" />
          </div>
          <div>
            <p className="text-base font-bold">Need airport pickup or a ride to your hotel?</p>
            <p className="text-xs text-neutral-400">Book trusted CityRide drivers across {cityName}</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-white text-[#222222] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <ArrowRight className="w-5 h-5" />
        </div>
      </Link>
    </div>
  );
}