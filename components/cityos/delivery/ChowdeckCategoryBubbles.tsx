'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { STANDARDIZED_FOOD_CATEGORIES } from '@/lib/food-categories';
import RealisticIcon from '@/components/ui/RealisticIcon';

export interface CategoryBubbleItem {
  id: string;
  label: string;
  shortLabel?: string;
  emoji?: string;
  bgGradient?: string;
  count?: number;
}

export const FOOD_CATEGORY_BUBBLES: CategoryBubbleItem[] = [
  { id: 'all', label: 'All Cuisines', shortLabel: 'All Places', emoji: '🍽️' },
  ...STANDARDIZED_FOOD_CATEGORIES.filter((c) => c.id !== 'other').map((c) => ({
    id: c.id,
    label: c.label,
    shortLabel: c.shortLabel,
    emoji: c.emoji,
  })),
];

export const MARKET_CATEGORY_BUBBLES: CategoryBubbleItem[] = [
  { id: 'All', label: 'All Aisles', shortLabel: 'All Goods' },
  { id: 'Food & Market', label: 'Local Market Produce', shortLabel: 'Market Produce' },
  { id: 'Groceries', label: 'Supermarket & Pantry', shortLabel: 'Supermarket' },
  { id: 'Bakery', label: 'Fresh Bread & Bakery', shortLabel: 'Bakery' },
  { id: 'Drinks', label: 'Cold Drinks & Beverages', shortLabel: 'Beverages' },
  { id: 'Pharmacy', label: 'Health & Pharmacy', shortLabel: 'Pharmacy' },
  { id: 'Fashion', label: 'Fashion & Wear', shortLabel: 'Fashion' },
  { id: 'Electronics', label: 'Tech & Gadgets', shortLabel: 'Electronics' },
];

const DEFAULT_EMOJIS: Record<string, string> = {
  all: '🍽️',
  'soups-swallow': '🍲',
  soups: '🍲',
  'rice-jollof': '🍚',
  jollof: '🍚',
  'chicken-meat': '🍗',
  chicken: '🍗',
  'suya-grills': '🍢',
  suya: '🍢',
  'fast-food-shawarma': '🌯',
  shawarma: '🌯',
  'pizza-pasta': '🍕',
  pizza: '🍕',
  'pastries-bakery': '🥐',
  pastries: '🥐',
  'drinks-beverages': '🥤',
  drinks: '🥤',
  'breakfast-cafe': '☕',
  breakfast: '☕',
  'healthy-salads': '🥗',
  salads: '🥗',
  'local-specialties': '🥘',
  local: '🥘',
  other: '🍽️',
  'food & market': '🥬',
  groceries: '🛒',
  bakery: '🍞',
  pharmacy: '💊',
  fashion: '👕',
  electronics: '📱',
};

interface ChowdeckCategoryBubblesProps {
  categories: CategoryBubbleItem[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  className?: string;
  variant?: 'capsule' | 'bubbles';
}

export default function ChowdeckCategoryBubbles({
  categories,
  activeCategoryId,
  onSelectCategory,
  className,
  variant = 'capsule',
}: ChowdeckCategoryBubblesProps) {
  // Capsule text-only variant (default): clean, modern pill buttons without heavy icons
  if (variant === 'capsule') {
    return (
      <div className={cn('relative select-none py-1', className)}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar scroll-smooth snap-x">
          {categories.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            const label = cat.shortLabel || cat.label;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs sm:text-[13px] font-bold transition-all shrink-0 border flex items-center gap-1.5 focus:outline-none snap-start active:scale-95 whitespace-nowrap',
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs scale-[1.02]'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <span>{label}</span>
                {typeof cat.count === 'number' && cat.count > 0 && cat.id !== 'all' && (
                  <span
                    className={cn(
                      'text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0',
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Legacy icon-bubbles variant
  return (
    <div className={cn('relative select-none py-1', className)}>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar scroll-smooth snap-x">
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          const key = cat.id.toLowerCase();
          const emoji = cat.emoji || DEFAULT_EMOJIS[key] || '🍽️';

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none snap-start transition-transform active:scale-95"
            >
              <div
                className={cn(
                  'w-13 h-13 sm:w-15 sm:h-15 rounded-2xl flex items-center justify-center p-2 transition-all duration-200 border shadow-2xs',
                  isActive
                    ? 'bg-slate-900 border-slate-900 text-white scale-105 shadow-md shadow-slate-900/15'
                    : 'bg-white border-slate-200/80 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <RealisticIcon
                  name={cat.id}
                  size={36}
                  fallback={emoji}
                  className="transition-transform group-hover:scale-110"
                />
              </div>
              <div className="flex items-center gap-1 max-w-[76px] sm:max-w-[84px] justify-center">
                <span
                  className={cn(
                    'text-[11px] font-bold leading-tight truncate text-center',
                    isActive ? 'text-slate-900 font-black' : 'text-slate-600 group-hover:text-slate-900'
                  )}
                >
                  {cat.shortLabel || cat.label}
                </span>
                {typeof cat.count === 'number' && cat.count > 0 && cat.id !== 'all' && (
                  <span
                    className={cn(
                      'text-[9px] font-extrabold px-1 rounded-full shrink-0',
                      isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {cat.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
