'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, SlidersHorizontal, X, ArrowRight, Utensils, Bed, Store, Sparkles } from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

export default function AirbnbSearchCapsule() {
  const router = useRouter();
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVertical, setSelectedVertical] = useState('All');

  const popularAreas = [
    'Ekorinim',
    'Marian Road',
    'State Housing',
    'Watt Market',
    'Marina Resort',
    'Goldie Street',
  ];

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsOpen(false);
    if (selectedVertical === 'Food') {
      router.push(`/food?q=${encodeURIComponent(searchQuery)}`);
    } else if (selectedVertical === 'Stays') {
      router.push(`/house?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(`/explore?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      {/* Floating Capsule Bar */}
      <div className="w-full flex justify-center py-2 px-1">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full max-w-2xl bg-white rounded-full border border-[#EBEBEB] shadow-[0_3px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] transition-all duration-300 flex items-center justify-between p-2 pl-5 sm:pl-6 text-left group"
        >
          {/* Section 1: Where */}
          <div className="flex flex-col min-w-0 pr-3 sm:pr-4">
            <span className="text-[11px] font-black text-[#222222] tracking-wider uppercase">
              Where
            </span>
            <span className="text-[13px] font-semibold text-[#717171] truncate">
              {cityName}
            </span>
          </div>

          <div className="h-6 w-px bg-neutral-200 hidden sm:block" />

          {/* Section 2: What */}
          <div className="flex flex-col min-w-0 px-3 sm:px-4 hidden sm:flex">
            <span className="text-[11px] font-black text-[#222222] tracking-wider uppercase">
              Discover
            </span>
            <span className="text-[13px] font-medium text-[#717171] truncate">
              Food, Stays, Markets
            </span>
          </div>

          <div className="h-6 w-px bg-neutral-200 hidden sm:block" />

          {/* Section 3: Budget / Fast Delivery */}
          <div className="flex flex-col min-w-0 px-3 sm:px-4 hidden sm:flex">
            <span className="text-[11px] font-black text-[#222222] tracking-wider uppercase">
              Budget
            </span>
            <span className="text-[13px] font-medium text-[#717171] truncate">
              Any price
            </span>
          </div>

          {/* Search Action Icon */}
          <div className="w-10 h-10 rounded-full bg-[#FF385C] text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-200">
            <Search className="w-4 h-4 stroke-[2.5]" />
          </div>
        </button>
      </div>

      {/* Expanded Modal Overlay (Airbnb Style) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-20 px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 pb-3 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF385C]" />
                <h3 className="font-bold text-[16px] text-[#222222]">
                  Explore {cityName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleSearch} className="p-5 space-y-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search restaurants, stays, suya, supermarkets..."
                  className="w-full pl-12 pr-4 py-3.5 bg-neutral-100 rounded-2xl text-[14px] font-semibold text-[#222222] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30 focus:bg-white transition-all"
                />
              </div>

              {/* Vertical Switcher */}
              <div>
                <p className="text-[12px] font-bold text-[#717171] uppercase tracking-wider mb-2">
                  What are you looking for?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'All', icon: Sparkles },
                    { label: 'Food', icon: Utensils },
                    { label: 'Stays', icon: Bed },
                  ].map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => setSelectedVertical(v.label)}
                      className={cn(
                        'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[13px] font-bold border transition-all',
                        selectedVertical === v.label
                          ? 'border-[#222222] bg-[#222222] text-white shadow-sm'
                          : 'border-neutral-200 text-[#717171] hover:border-neutral-400'
                      )}
                    >
                      <v.icon className="w-4 h-4" />
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Neighborhood Quick Picks */}
              <div>
                <p className="text-[12px] font-bold text-[#717171] uppercase tracking-wider mb-2">
                  Popular Calabar Neighborhoods
                </p>
                <div className="flex flex-wrap gap-2">
                  {popularAreas.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => {
                        setSearchQuery(area);
                      }}
                      className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold bg-neutral-100 text-[#222222] hover:bg-neutral-200 transition-colors"
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end gap-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-full text-[13px] font-bold text-[#717171] hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-[13px] font-bold bg-[#FF385C] hover:bg-[#E00B41] text-white flex items-center gap-2 shadow-md transition-all"
                >
                  <span>Search</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
