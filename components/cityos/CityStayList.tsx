'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { BedDouble, Search, Plus, User as UserIcon } from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';
import BookingHotelCard, { BookingHotelItem } from '@/components/cityos/booking/BookingHotelCard';
import { cn } from '@/lib/utils';

const STAY_FILTER_TABS = [
  { id: 'All', label: 'All Stays' },
  { id: 'Hotel', label: 'Hotels' },
  { id: 'Short-Let', label: 'Short-Lets' },
  { id: 'Serviced Suite', label: 'Serviced Suites' },
  { id: 'Guest House', label: 'Guest Houses' },
  { id: 'Entire Home', label: 'Entire Homes' },
  { id: 'Rental', label: 'Long-Term Rentals' },
];

export default function CityStayList({ hotels = [] }: { hotels?: BookingHotelItem[] }) {
  const cityName = useCity().city?.name ?? 'Calabar';
  const { data: session } = useSession();
  const { myBusinesses } = useAccountSwitcher();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [onlyMyStays, setOnlyMyStays] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'rating'>('recommended');

  const myOrgIds = useMemo(() => new Set(myBusinesses.map((b) => b.id)), [myBusinesses]);
  const myPersonId = session?.user?.personId || null;

  const filteredHotels = useMemo(() => {
    let result = hotels.filter((h) => {
      if (selectedCategory !== 'All') {
        const itemCat = h.stayCategory || (h.type === 'HOTEL' ? 'Hotel' : 'Short-Let');
        if (itemCat.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      if (onlyMyStays) {
        const isMyPersonal = myPersonId && h.hostPersonId === myPersonId;
        const isMyOrg = (h.organizationId && myOrgIds.has(h.organizationId)) || myOrgIds.has(h.id);
        if (!isMyPersonal && !isMyOrg) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const text = `${h.name} ${h.description || ''} ${h.address || ''} ${h.neighborhood || ''} ${h.stayCategory || ''} ${(h.amenities || []).join(' ')}`.toLowerCase();
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
  }, [hotels, searchQuery, selectedCategory, onlyMyStays, sortBy, myPersonId, myOrgIds]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-28">
      {/* Header & Search */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-black uppercase tracking-widest border border-white/15">
              <BedDouble className="w-3.5 h-3.5 text-teal-300" />
              Stays & Properties in {cityName}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white">
              Find a place to stay in {cityName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Browse verified hotels, short-let apartments, serviced suites, guest houses, and homes in {cityName}.
            </p>
          </div>

          <Link
            href="/stay/create"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-teal-500/20 transition-all shrink-0 self-start"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            List a Stay / Property
          </Link>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex-1 flex items-center gap-2.5 bg-white rounded-2xl px-4 py-3 text-slate-700 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search hotels, short-lets, areas (e.g. Marian, State Housing) in ${cityName}...`}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Pills & My Stays Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STAY_FILTER_TABS.map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-black transition-all shrink-0 border cursor-pointer',
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {session && (
          <button
            type="button"
            onClick={() => setOnlyMyStays((prev) => !prev)}
            className={cn(
              'px-3.5 py-2 rounded-full text-xs font-black border transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0',
              onlyMyStays
                ? 'bg-teal-800 text-white border-teal-800'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            )}
          >
            <UserIcon className="w-3.5 h-3.5" />
            My Listings
          </button>
        )}
      </div>

      {/* Results Header & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 px-1">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {selectedCategory === 'All' ? `Places to stay in ${cityName}` : `${selectedCategory}s in ${cityName}`}{' '}
            <span className="text-sm font-bold text-slate-400">({filteredHotels.length})</span>
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

      {/* Stays Feed */}
      <div className="space-y-5">
        {filteredHotels.map((hotel) => (
          <BookingHotelCard key={hotel.id} hotel={hotel} />
        ))}

        {filteredHotels.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white space-y-3">
            <BedDouble className="w-10 h-10 text-slate-400 mx-auto mb-1" />
            <h3 className="text-base font-black text-slate-900">
              {searchQuery.trim() || selectedCategory !== 'All' || onlyMyStays
                ? 'No stays match your current filters'
                : `No stays listed in ${cityName} yet`}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery.trim() || selectedCategory !== 'All' || onlyMyStays
                ? 'Try clearing your filters or list your own short-let, apartment, or hotel.'
                : 'Have a short-let apartment, guest house, or hotel in the city? List it in seconds.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {(searchQuery.trim() || selectedCategory !== 'All' || onlyMyStays) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setOnlyMyStays(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
              <Link
                href="/stay/create"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black shadow-sm"
              >
                <Plus className="w-4 h-4" /> List a Stay
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}