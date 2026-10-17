'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight } from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

export interface CitySearchBarProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  defaultQuery?: string;
}

export default function AirbnbSearchCapsule({
  placeholder,
  className,
  autoFocus = false,
  defaultQuery = '',
}: CitySearchBarProps) {
  const router = useRouter();
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';
  const [searchQuery, setSearchQuery] = useState(defaultQuery);
  const [isFocused, setIsFocused] = useState(false);

  const defaultPlaceholder = placeholder || `Search food, stays, markets in ${cityName}...`;

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      router.push('/explore');
      return;
    }
    router.push(`/explore?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className={cn('w-full flex justify-center py-1 px-1', className)}>
      <form
        onSubmit={handleSearch}
        className={cn(
          'w-full max-w-2xl bg-white rounded-full border transition-all duration-300 flex items-center p-1.5 pl-4 sm:pl-5 shadow-xs',
          isFocused
            ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-md'
            : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
        )}
      >
        <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0 mr-3" />

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus={autoFocus}
          placeholder={defaultPlaceholder}
          className="w-full bg-transparent text-xs sm:text-sm md:text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 mr-1.5 shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="submit"
          className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 shrink-0 transition-all duration-200 active:scale-95"
        >
          <span>Search</span>
          <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
        </button>
      </form>
    </div>
  );
}

export { AirbnbSearchCapsule as CitySearchBar };
