'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BedDouble,
  ArrowRight,
  Sparkles,
  MapPin,
  SlidersHorizontal,
  ChevronDown,
  Car,
  ShieldCheck,
} from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import BookingSearchWidget from '@/components/cityos/booking/BookingSearchWidget';
import BookingTrustBar from '@/components/cityos/booking/BookingTrustBar';
import BookingHotelCard, { BookingHotelItem } from '@/components/cityos/booking/BookingHotelCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

const HOTEL_FILTER_PILLS = [
  { id: 'all', label: 'All Stays' },
  { id: 'resorts', label: '🌴 Resorts & Waterfront' },
  { id: 'suites', label: '💼 Executive Suites' },
  { id: 'budget', label: '💰 Budget (< ₦35k)' },
  { id: 'breakfast', label: '🍳 Free Breakfast' },
  { id: 'power', label: '⚡ 24/7 Power Guaranteed' },
];

export default function CityStayList({ hotels = [] }: { hotels?: BookingHotelItem[] }) {
  const cityName = useCity().city?.name ?? 'Calabar';

  const [destination, setDestination] = useState<string>('All of Calabar, Cross River');
  const [datesText, setDatesText] = useState<string>('Thu, Oct 16 — Fri, Oct 17 · 1 night');
  const [occupancyText, setOccupancyText] = useState<string>('2 adults · 0 children · 1 room');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'rating'>('recommended');

  // Filter hotels based on destination and filter pill
  const filteredHotels = useMemo(() => {
    let result = hotels.filter((h) => {
      // Destination filter
      if (destination && !destination.includes('All of Calabar')) {
        const destLower = destination.toLowerCase();
        const addressLower = (h.address || h.neighborhood || '').toLowerCase();
        const nameLower = h.name.toLowerCase();
        if (destLower.includes('marian') && !addressLower.includes('marian') && !nameLower.includes('marian')) return false;
        if (destLower.includes('highway') && !addressLower.includes('highway') && !nameLower.includes('highway')) return false;
        if (destLower.includes('state housing') && !addressLower.includes('state housing') && !nameLower.includes('state housing')) return false;
        if (destLower.includes('tinapa') && !addressLower.includes('tinapa') && !nameLower.includes('tinapa')) return false;
      }

      // Filter pills
      if (activeFilter === 'resorts') {
        const text = `${h.name} ${h.description || ''}`.toLowerCase();
        if (!text.includes('resort') && !text.includes('lakeside') && !text.includes('waterfront')) return false;
      } else if (activeFilter === 'suites') {
        const text = `${h.name} ${h.description || ''} ${h.roomType || ''}`.toLowerCase();
        if (!text.includes('suite') && !text.includes('executive')) return false;
      } else if (activeFilter === 'budget') {
        const price = h.startingPrice || h.price || 35000;
        if (price > 35000) return false;
      } else if (activeFilter === 'breakfast') {
        if (!h.breakfastIncluded) return false;
      }

      return true;
    });

    // Sort hotels
    if (sortBy === 'price_asc') {
      result.sort((a, b) => (a.startingPrice || a.price || 0) - (b.startingPrice || b.price || 0));
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.reviewScore || b.rating || 0) - (a.reviewScore || a.rating || 0));
    }

    return result;
  }, [hotels, destination, activeFilter, sortBy]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-28">
      {/* 1. Booking.com Signature Search Widget */}
      <BookingSearchWidget
        destination={destination}
        onDestinationChange={setDestination}
        datesText={datesText}
        occupancyText={occupancyText}
        onOccupancyChange={setOccupancyText}
        onSearch={() => {}}
      />

      {/* 2. Value Proposition Trust Bar */}
      <BookingTrustBar />

      {/* 3. Filter Chips & Sort Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar select-none">
          {HOTEL_FILTER_PILLS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 border',
                activeFilter === f.id
                  ? 'border-[#003580] bg-[#003580] text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 shrink-0 self-end sm:self-auto">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="recommended">Our top picks</option>
            <option value="price_asc">Price: lowest first</option>
            <option value="rating">Top guest review score</option>
          </select>
        </div>
      </div>

      {/* 4. Results Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {destination && !destination.includes('All of Calabar')
              ? `Properties in ${destination}`
              : `Places to stay in ${cityName}`}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {filteredHotels.length} propert{filteredHotels.length === 1 ? 'y' : 'ies'} found · Verified by CityOS
          </p>
        </div>
      </div>

      {/* 5. Booking.com Hotels Feed */}
      <div className="space-y-5">
        {filteredHotels.map((hotel) => (
          <BookingHotelCard key={hotel.id} hotel={hotel} />
        ))}

        {filteredHotels.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white space-y-2">
            <BedDouble className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-base font-black text-slate-900">No properties match this filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try changing your destination or selecting &apos;All Stays&apos; to view all available accommodations in Calabar.
            </p>
            <button
              type="button"
              onClick={() => {
                setDestination('All of Calabar, Cross River');
                setActiveFilter('all');
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-[#003580] text-white text-xs font-black shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* 6. Booking.com Signature Airport Taxi & CityRide Upsell */}
      <div className="rounded-3xl bg-[#003580] text-white p-6 sm:p-7 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
            <Car className="w-6 h-6 text-[#febb02]" />
          </div>
          <div>
            <h4 className="text-base font-black">Need Calabar airport pickup or a dedicated private driver?</h4>
            <p className="text-xs text-blue-100 font-medium">
              CityRide vetted chauffeurs guarantee on-time pickup from Margaret Ekpo International Airport.
            </p>
          </div>
        </div>

        <Link
          href="/drive/ride"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#febb02] hover:bg-[#e5a800] text-slate-950 text-xs font-black shrink-0 transition-colors shadow-md"
        >
          <span>Book Airport Ride</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}