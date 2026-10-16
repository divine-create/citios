'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Search,
  Check,
  ChevronDown,
  X,
  Plus,
  Minus,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

const CALABAR_HOTEL_ZONES = [
  { id: 'all', name: 'All of Calabar, Cross River', count: 'All Stays' },
  { id: 'marian', name: 'Marian Road (City Center)', count: 'Boutique & Lounges' },
  { id: 'highway', name: 'Murtala Mohammed Highway', count: 'Luxury & Airport Shuttle' },
  { id: 'state-housing', name: 'State Housing Estate', count: 'Quiet Executive Suites' },
  { id: 'tinapa', name: 'Tinapa Lakeside & Resort', count: 'Waterfront & Leisure' },
  { id: 'marina', name: 'Marina Resort / Old Calabar', count: 'Historic & Tourism' },
];

interface BookingSearchWidgetProps {
  destination: string;
  onDestinationChange: (dest: string) => void;
  datesText: string;
  onDatesChange?: (dates: string) => void;
  occupancyText: string;
  onOccupancyChange?: (occ: string) => void;
  onSearch: () => void;
}

export default function BookingSearchWidget({
  destination,
  onDestinationChange,
  datesText,
  onDatesChange,
  occupancyText,
  onOccupancyChange,
  onSearch,
}: BookingSearchWidgetProps) {
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';

  const [isDestOpen, setIsDestOpen] = useState(false);
  const [isGuestOpen, setIsGuestOpen] = useState(false);

  // Guest counts
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [forWork, setForWork] = useState(false);

  const applyGuests = () => {
    const text = `${adults} adult${adults === 1 ? '' : 's'} · ${children} child${children === 1 ? '' : 'ren'} · ${rooms} room${rooms === 1 ? '' : 's'}`;
    if (onOccupancyChange) onOccupancyChange(text);
    setIsGuestOpen(false);
  };

  return (
    <div className="bg-[#003580] text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Headline */}
      <div className="relative z-10 space-y-2 max-w-2xl">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-black tracking-wide border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Booking.com Standard Stays
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
          Find your next stay in {cityName}
        </h1>
        <p className="text-xs sm:text-sm text-blue-100/90 font-medium leading-relaxed">
          Search verified hotel rooms, luxury suites, and lakeside resorts across Calabar with 24/7 power guarantee.
        </p>
      </div>

      {/* Booking.com Yellow Segmented Floating Search Bar */}
      <div className="relative z-20 bg-[#febb02] p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 bg-white rounded-xl sm:rounded-2xl p-1.5 text-slate-900">
          
          {/* 1. Destination / Hotel Name (md:col-span-4) */}
          <div className="relative md:col-span-4 flex items-center border-b md:border-b-0 md:border-r border-slate-200 px-3 py-2.5 sm:py-3">
            <MapPin className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
            <button
              type="button"
              onClick={() => setIsDestOpen(!isDestOpen)}
              className="flex-1 text-left flex items-center justify-between"
            >
              <div className="truncate pr-1">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none">
                  Where are you going?
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
                  {destination || `${cityName}, Nigeria`}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Destination Dropdown */}
            {isDestOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in duration-150">
                <div className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Popular Calabar Destinations
                </div>
                <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                  {CALABAR_HOTEL_ZONES.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => {
                        onDestinationChange(zone.name);
                        setIsDestOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors',
                        destination === zone.name
                          ? 'bg-blue-50 font-bold text-blue-900'
                          : 'hover:bg-slate-50 text-slate-800'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>{zone.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{zone.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Check-in — Check-out Dates (md:col-span-4) */}
          <div className="relative md:col-span-4 flex items-center border-b md:border-b-0 md:border-r border-slate-200 px-3 py-2.5 sm:py-3">
            <Calendar className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
            <div className="flex-1">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none">
                Check-in — Check-out
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
                {datesText || 'Thu, Oct 16 — Fri, Oct 17 · 1 night'}
              </span>
            </div>
          </div>

          {/* 3. Occupancy & Guests (md:col-span-3) */}
          <div className="relative md:col-span-3 flex items-center px-3 py-2.5 sm:py-3">
            <Users className="w-5 h-5 text-slate-400 shrink-0 mr-2.5" />
            <button
              type="button"
              onClick={() => setIsGuestOpen(!isGuestOpen)}
              className="flex-1 text-left flex items-center justify-between"
            >
              <div className="truncate pr-1">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none">
                  Occupancy
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
                  {occupancyText || `${adults} adults · ${rooms} room`}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Occupancy Stepper Popover */}
            {isGuestOpen && (
              <div className="absolute top-full right-0 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Adults</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={adults <= 1}
                      onClick={() => setAdults((a) => Math.max(1, a - 1))}
                      className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults((a) => a + 1)}
                      className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Children</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={children <= 0}
                      onClick={() => setChildren((c) => Math.max(0, c - 1))}
                      className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren((c) => c + 1)}
                      className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Rooms</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={rooms <= 1}
                      onClick={() => setRooms((r) => Math.max(1, r - 1))}
                      className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{rooms}</span>
                    <button
                      type="button"
                      onClick={() => setRooms((r) => r + 1)}
                      className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applyGuests}
                  className="w-full py-2 bg-[#003580] hover:bg-[#00224f] text-white text-xs font-black rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* 4. Booking.com Signature Yellow Action Button (md:col-span-1) */}
          <div className="md:col-span-1 flex items-center justify-center p-1">
            <button
              type="button"
              onClick={onSearch}
              className="w-full h-full min-h-[44px] rounded-xl bg-[#006ce4] hover:bg-[#0057b8] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span className="md:hidden">Search Deals</span>
            </button>
          </div>

        </div>
      </div>

      {/* Booking.com Work & Deals Checkboxes */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-blue-100">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={forWork}
            onChange={(e) => setForWork(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
          />
          <span>I&apos;m traveling for work</span>
        </label>

        <span className="text-blue-300/40">·</span>

        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
          <Zap className="w-3.5 h-3.5 fill-amber-300" />
          <span>All stays include 24/7 uninterrupted power guarantee</span>
        </div>
      </div>
    </div>
  );
}
