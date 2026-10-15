'use client';

import React, { useRef } from 'react';
import { 
  Sparkles, 
  Utensils, 
  Flame, 
  BedDouble, 
  Wine, 
  Store, 
  Coffee, 
  Wrench,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CategoryItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'soups', label: 'Calabar Soups', icon: Utensils },
  { id: 'suya', label: 'Suya & Grills', icon: Flame },
  { id: 'stays', label: 'Boutique Stays', icon: BedDouble },
  { id: 'lounges', label: 'Lounges & Bars', icon: Wine },
  { id: 'market', label: 'Watt Market', icon: Store },
  { id: 'cafes', label: 'Bites & Coffee', icon: Coffee },
  { id: 'services', label: 'Artisans', icon: Wrench },
];

export default function AirbnbCategoryRail({
  activeCategory = 'all',
  onSelectCategory,
  className,
}: {
  activeCategory?: string;
  onSelectCategory?: (id: string) => void;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -240 : 240;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className={cn('relative w-full border-b border-[#EBEBEB] bg-white py-2', className)}>
      <div className="flex items-center">
        {/* Scroll Left Button */}
        <button
          type="button"
          onClick={() => scroll('left')}
          className="hidden md:flex w-8 h-8 rounded-full border border-neutral-300 bg-white items-center justify-center text-neutral-600 hover:scale-105 hover:shadow-md transition-all shrink-0 mr-2 z-10"
          aria-label="Scroll categories left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Categories Rail */}
        <div
          ref={scrollRef}
          className="flex items-center gap-6 md:gap-8 overflow-x-auto no-scrollbar scroll-smooth px-2 py-1 flex-1 select-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory?.(cat.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 pb-2 transition-all duration-200 shrink-0 border-b-2',
                  isActive
                    ? 'border-[#222222] text-[#222222] font-bold'
                    : 'border-transparent text-[#717171] hover:text-[#222222] hover:border-neutral-300'
                )}
              >
                <Icon
                  className={cn(
                    'w-6 h-6 transition-transform',
                    isActive ? 'scale-105 stroke-[2.2]' : 'stroke-[1.8] group-hover:scale-105'
                  )}
                />
                <span className="text-[12px] whitespace-nowrap tracking-tight">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        <button
          type="button"
          onClick={() => scroll('right')}
          className="hidden md:flex w-8 h-8 rounded-full border border-neutral-300 bg-white items-center justify-center text-neutral-600 hover:scale-105 hover:shadow-md transition-all shrink-0 ml-2 z-10"
          aria-label="Scroll categories right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
