'use client';

import { useState, useMemo } from 'react';
import { BedDouble, Search } from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import BookingHotelCard, { BookingHotelItem } from '@/components/cityos/booking/BookingHotelCard';

export default function CityStayList({ hotels = [] }: { hotels?: BookingHotelItem[] }) {
  const cityName = useCity().city?.name ?? 'Calabar';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'rating'>('recommended');

  const filteredHotels = useMemo(() => {
    let result = hotels.filter((h) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const text = `${h.name} ${h.description || ''} ${h.address || ''} ${h.neighborhood || ''}`.toLowerCase();
      return text.includes(q);
    });

    if (sortBy === 'price_asc') {
      result = [...result].sort(
        (a, b) => (a.startingPrice || a.price || 0) - (b.startingPrice || b.price || 0)
      );
    } else if (sortBy === 'rating') {
      result = [...result].sort(
        (a, b) => (b.reviewScore || b.rating || 0) - (a.reviewScore || a.rating || 0)
      );
    }

    return result;
  }, [hotels, searchQuery, sortBy]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-28">
      {/* Header & Search */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-black uppercase tracking-widest border border-white/15">
            <BedDouble className="w-3.5 h-3.5 text-teal-300" />
            Stays in {cityName}
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white">
            Find a place to stay in {cityName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            Browse verified hotels, short-let apartments, and guest houses in {cityName}.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex-1 flex items-center gap-2.5 bg-white rounded-2xl px-4 py-3 text-slate-700 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search hotels, apartments, or areas in ${cityName}...`}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Results Header & Sort */}
      {hotels.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 px-1">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Places to stay in {cityName}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 shrink-0">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-700 cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: lowest first</option>
              <option value="rating">Top review score</option>
            </select>
          </div>
        </div>
      )}

      {/* Hotels Feed */}
      <div className="space-y-5">
        {filteredHotels.map((hotel) => (
          <BookingHotelCard key={hotel.id} hotel={hotel} />
        ))}

        {filteredHotels.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white space-y-2">
            <BedDouble className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-base font-black text-slate-900">
              {searchQuery.trim()
                ? 'No stays match your search'
                : `No stays listed in ${cityName} yet`}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery.trim()
                ? 'Try clearing your search query to see available stays.'
                : 'Verified hotels, short-lets, and guest houses will appear here as they are published.'}
            </p>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black shadow-sm"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}