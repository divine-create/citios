'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ChevronDown,
  Search,
  X,
  Bike,
  ShoppingBag,
  Check,
} from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

export interface DeliveryHubOption {
  id: string;
  name: string;
  address?: string;
}

export interface AreaOption {
  id: string;
  name: string;
  shortName?: string;
  description?: string;
  count?: number;
}

interface ChowdeckDeliveryHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  trendingTags?: string[];
  onSelectTag?: (tag: string) => void;
  placeholder?: string;
  vertical?: 'food' | 'market';
  areas?: AreaOption[];
  activeAreaId?: string;
  onSelectArea?: (areaId: string) => void;
  deliveryHubs?: DeliveryHubOption[];
  defaultAddress?: string | null;
}

export default function ChowdeckDeliveryHeader({
  searchQuery,
  onSearchChange,
  trendingTags = [],
  onSelectTag,
  placeholder = 'Search restaurants, dishes, or cuisines...',
  vertical = 'food',
  areas = [],
  activeAreaId = 'all',
  onSelectArea,
  deliveryHubs = [],
  defaultAddress,
}: ChowdeckDeliveryHeaderProps) {
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';

  const currentAreaObj = areas.find((a) => a.id === activeAreaId);
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedHub, setSelectedHub] = useState<string>(() => {
    if (currentAreaObj && currentAreaObj.id !== 'all') return currentAreaObj.name;
    return defaultAddress || (deliveryHubs[0]?.name ? `${deliveryHubs[0].name}, ${cityName}` : `All ${cityName} Areas`);
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    if (activeAreaId && activeAreaId !== 'all') {
      const match = areas.find((a) => a.id === activeAreaId);
      if (match) setSelectedHub(match.name);
    } else if (defaultAddress) {
      setSelectedHub(defaultAddress);
    } else {
      setSelectedHub(`All ${cityName} Areas`);
    }
  }, [activeAreaId, defaultAddress, areas, cityName]);

  // Combine default address and database locations for picker
  const availableOptions = React.useMemo(() => {
    const list: { id: string; name: string; subtitle?: string }[] = [];
    if (defaultAddress) {
      list.push({ id: 'saved-default', name: defaultAddress, subtitle: 'Saved Default Address' });
    }
    if (deliveryHubs.length > 0) {
      for (const h of deliveryHubs) {
        if (h.name !== defaultAddress) {
          list.push({ id: h.id, name: h.name, subtitle: h.address || `${cityName} Area` });
        }
      }
    } else {
      list.push({ id: 'city-center', name: `${cityName} Central Hub`, subtitle: `${cityName} Delivery Zone` });
    }
    return list;
  }, [defaultAddress, deliveryHubs, cityName]);

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <div className="space-y-3">
      {/* Top Location & Fulfillment Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Location Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-2.5 text-left group hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/60 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span>Deliver to</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-700 font-extrabold text-[10px]">Active</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-slate-900 leading-tight">
                <span className="truncate max-w-[220px] sm:max-w-[320px]">{selectedHub}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
              </div>
            </div>
          </button>

          {/* Location Picker Modal */}
          {isLocationModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Choose Area in {cityName}</h3>
                    <p className="text-xs text-slate-500">Filter local kitchens, cuisines & courier dispatch times</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {/* Canonical Areas */}
                  {areas.length > 0 ? (
                    areas.map((opt) => {
                      const isSelected = activeAreaId === opt.id || (activeAreaId === 'all' && opt.id === 'all');
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedHub(opt.name);
                            if (onSelectArea) onSelectArea(opt.id);
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
                              <p className="text-xs font-bold">{opt.name}</p>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {typeof opt.count === 'number'
                                  ? `${opt.count} kitchen${opt.count === 1 ? '' : 's'} available`
                                  : opt.description || `${cityName} Area`}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    availableOptions.map((opt) => {
                      const isSelected = selectedHub === opt.name;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedHub(opt.name);
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
                              <p className="text-xs font-bold">{opt.name}</p>
                              {opt.subtitle && (
                                <span className="text-[10px] text-slate-500 font-medium">{opt.subtitle}</span>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delivery vs Pickup Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setDeliveryMode('delivery')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all',
              deliveryMode === 'delivery'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Bike className="w-3.5 h-3.5 text-orange-600" />
            <span>Delivery</span>
          </button>

          <button
            type="button"
            onClick={() => setDeliveryMode('pickup')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all',
              deliveryMode === 'pickup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-slate-600" />
            <span>Pickup</span>
          </button>
        </div>
      </div>

      {/* Google/Glovo Search Bar with contextual on-focus suggestions */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => {
              // Delay slightly to allow onMouseDown on tags to fire
              setTimeout(() => setIsSearchFocused(false), 200);
            }}
            placeholder={placeholder}
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white border border-slate-200/90 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 shadow-2xs transition-all"
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

        {/* On-focus contextual suggestions dropdown */}
        {isSearchFocused && trendingTags.length > 0 && !searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-30 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
              Popular in {cityName}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trendingTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (onSelectTag) onSelectTag(tag);
                    else onSearchChange(tag);
                    setIsSearchFocused(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200/70 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
