'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface CategoryBubbleItem {
  id: string;
  label: string;
  shortLabel?: string;
  emoji?: string;
  bgGradient?: string;
  count?: number;
}

export const FOOD_CATEGORY_BUBBLES: CategoryBubbleItem[] = [
  { id: 'all', label: 'All Cuisines', shortLabel: 'All Places' },
  { id: 'soups', label: 'Soups & Swallow', shortLabel: 'Soups & Swallow' },
  { id: 'jollof', label: 'Jollof & Rice', shortLabel: 'Jollof & Rice' },
  { id: 'chicken', label: 'Chicken & Turkey', shortLabel: 'Chicken' },
  { id: 'suya', label: 'Suya & Street Grills', shortLabel: 'Suya & Grills' },
  { id: 'shawarma', label: 'Shawarma & Fast Eats', shortLabel: 'Shawarma' },
  { id: 'pizza', label: 'Pizza & Pasta', shortLabel: 'Pizza' },
  { id: 'pastries', label: 'Pastries & Bakeries', shortLabel: 'Pastries' },
  { id: 'drinks', label: 'Smoothies & Drinks', shortLabel: 'Drinks' },
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
  soups: '🍲',
  jollof: '🍚',
  chicken: '🍗',
  suya: '🍢',
  shawarma: '🌯',
  pizza: '🍕',
  pastries: '🥐',
  drinks: '🥤',
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
}

export default function ChowdeckCategoryBubbles({
  categories,
  activeCategoryId,
  onSelectCategory,
  className,
}: ChowdeckCategoryBubblesProps) {
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
                  'w-13 h-13 sm:w-15 sm:h-15 rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-all duration-200 border shadow-2xs',
                  isActive
                    ? 'bg-slate-900 border-slate-900 text-white scale-105 shadow-md shadow-slate-900/15'
                    : 'bg-white border-slate-200/80 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span>{emoji}</span>
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
