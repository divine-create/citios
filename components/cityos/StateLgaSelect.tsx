'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Check, ChevronDown, X, Building } from 'lucide-react';
import { NIGERIAN_STATES } from '@/lib/data/nigeria';

export interface CityOption {
  id: string;
  name: string;
  state: string | null;
  country: string;
  slug?: string;
}

interface StateLgaSelectProps {
  cities: CityOption[];
  value: string; // selected cityId
  onChange: (cityId: string) => void;
  required?: boolean;
  label?: string;
}

export default function StateLgaSelect({
  cities,
  value,
  onChange,
  required = true,
  label = 'State & Local Government Area (LGA)',
}: StateLgaSelectProps) {
  const [selectedState, setSelectedState] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Determine current selection
  const currentCity = useMemo(() => {
    return cities.find((c) => c.id === value) || null;
  }, [cities, value]);

  // Sync state if city is preselected
  useEffect(() => {
    if (currentCity?.state && currentCity.state !== selectedState) {
      setSelectedState(currentCity.state);
    }
  }, [currentCity]);

  // Unique list of all available states
  const allStates = useMemo(() => {
    const statesSet = new Set<string>();
    // Add states from predefined data
    Object.keys(NIGERIAN_STATES).forEach((s) => statesSet.add(s));
    // Add any state from active DB cities
    cities.forEach((c) => {
      if (c.state) statesSet.add(c.state);
    });
    return Array.from(statesSet).sort();
  }, [cities]);

  // LGAs available for the chosen state
  const stateLgas = useMemo(() => {
    if (!selectedState) return [];
    return cities
      .filter((c) => c.state?.toLowerCase() === selectedState.toLowerCase())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cities, selectedState]);

  // Search results across ALL cities
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return cities
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.state && c.state.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [cities, searchQuery]);

  const handleStateChange = (stateName: string) => {
    setSelectedState(stateName);
    // If the currently selected city isn't in this state, clear value
    if (currentCity && currentCity.state?.toLowerCase() !== stateName.toLowerCase()) {
      onChange('');
    }
  };

  const handleCitySelect = (city: CityOption) => {
    if (city.state) {
      setSelectedState(city.state);
    }
    onChange(city.id);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-teal-700" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        {currentCity && (
          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 flex items-center gap-1">
            <Check className="w-3 h-3" />
            {currentCity.name}, {currentCity.state || currentCity.country}
          </span>
        )}
      </div>

      {/* Quick Search Bar */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/10 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search state or local government area..."
            className="w-full bg-transparent text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Dropdown */}
        {isSearchOpen && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-1">
            {searchResults.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">
                No location found for &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              searchResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCitySelect(c)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    c.id === value
                      ? 'bg-teal-700 text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building className={`w-3.5 h-3.5 ${c.id === value ? 'text-white' : 'text-slate-400'}`} />
                    <span>{c.name}</span>
                  </div>
                  <span className={`text-[11px] font-medium ${c.id === value ? 'text-teal-100' : 'text-slate-400'}`}>
                    {c.state || c.country}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Two-Level Hierarchy Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* State Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500">1. Select State</label>
          <div className="relative">
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
            >
              <option value="">-- Choose State --</option>
              {allStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* LGA Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500">2. Select Local Government</label>
          <div className="relative">
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={!selectedState}
              className="w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {selectedState ? `-- Choose Local Government in ${selectedState} --` : '-- Select a State first --'}
              </option>
              {stateLgas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
