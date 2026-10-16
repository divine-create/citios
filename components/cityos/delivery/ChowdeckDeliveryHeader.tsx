'use client';

import React, { useState } from 'react';
import {
  MapPin,
  ChevronDown,
  Search,
  X,
  Bike,
  ShoppingBag,
  Sparkles,
  Check,
} from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

const CALABAR_HUBS = [
  { id: 'marian', name: 'Marian Road, Calabar', tag: 'Fast Delivery Zone' },
  { id: 'state-housing', name: 'State Housing Estate, Calabar', tag: 'Express Couriers' },
  { id: 'watt-market', name: 'Watt Market Commercial Hub', tag: 'Fresh Produce Direct' },
  { id: 'calabar-mall', name: 'Calabar Mall & Cultural Centre', tag: 'Supermarket Central' },
  { id: 'highway', name: 'Murtala Mohammed Highway', tag: 'City Arterial' },
  { id: 'satellite', name: 'Satellite Town / Marina Resort', tag: 'Scenic & Waterfront' },
];

interface ChowdeckDeliveryHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  trendingTags?: string[];
  onSelectTag?: (tag: string) => void;
  placeholder?: string;
  vertical?: 'food' | 'market';
}

export default function ChowdeckDeliveryHeader({
  searchQuery,
  onSearchChange,
  trendingTags = ['Afang Soup', 'Party Jollof', 'Beef Suya', 'Chicken Shawarma', 'Smoothies', 'Ekpang'],
  onSelectTag,
  placeholder = 'What are you craving? Search meals, Bukás, dishes...',
  vertical = 'food',
}: ChowdeckDeliveryHeaderProps) {
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';

  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedHub, setSelectedHub] = useState<string>('Marian Road, Calabar');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Top Location & Fulfillment Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Location Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-2.5 text-left group hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Deliver to</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 font-extrabold text-[10px]">Now</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-slate-900 leading-tight">
                <span className="truncate max-w-[220px] sm:max-w-[320px]">{selectedHub}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
              </div>
            </div>
          </button>

          {/* Quick Location Picker Modal */}
          {isLocationModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Choose Delivery Area</h3>
                    <p className="text-xs text-slate-500">Pick your neighborhood in {cityName} for precise courier ETAs</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {CALABAR_HUBS.map((hub) => {
                    const isSelected = selectedHub === hub.name;
                    return (
                      <button
                        key={hub.id}
                        type="button"
                        onClick={() => {
                          setSelectedHub(hub.name);
                          setIsLocationModalOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all border',
                          isSelected
                            ? 'bg-orange-50 border-orange-500 text-orange-950'
                            : 'bg-slate-50/70 border-slate-200/60 hover:bg-slate-100 text-slate-800'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className={cn('w-4 h-4', isSelected ? 'text-orange-600' : 'text-slate-400')} />
                          <div>
                            <p className="text-xs font-bold">{hub.name}</p>
                            <span className="text-[10px] text-slate-500 font-medium">{hub.tag}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delivery vs Pickup Toggle (Chowdeck signature switcher) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setDeliveryMode('delivery')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all',
              deliveryMode === 'delivery'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Bike className="w-3.5 h-3.5 text-orange-500" />
            <span>Delivery</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              20-35m
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDeliveryMode('pickup')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all',
              deliveryMode === 'pickup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
            <span>Pickup</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              10% OFF
            </span>
          </button>
        </div>
      </div>

      {/* Prominent Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white border border-slate-200/90 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Clickable Trending Search Tags */}
      {trendingTags.length > 0 && !searchQuery && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-orange-500" /> Popular:
          </span>
          {trendingTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onSelectTag ? onSelectTag(tag) : onSearchChange(tag)}
              className="px-3 py-1 rounded-full text-xs font-bold bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 shrink-0 transition-colors shadow-2xs"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
