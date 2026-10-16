'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface CategoryBubbleItem {
  id: string;
  label: string;
  shortLabel?: string;
  emoji: string;
  bgGradient: string;
  count?: number;
}

export const FOOD_CATEGORY_BUBBLES: CategoryBubbleItem[] = [
  {
    id: 'all',
    label: 'All Cuisines',
    shortLabel: 'All Places',
    emoji: '🍽️',
    bgGradient: 'from-slate-700 to-slate-900',
  },
  {
    id: 'soups',
    label: 'Calabar Soups & Swallow',
    shortLabel: 'Soups & Swallow',
    emoji: '🍲',
    bgGradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'jollof',
    label: 'Party Jollof & Rice',
    shortLabel: 'Jollof & Rice',
    emoji: '🍛',
    bgGradient: 'from-orange-500 to-red-600',
  },
  {
    id: 'chicken',
    label: 'Chicken & Turkey',
    shortLabel: 'Chicken',
    emoji: '🍗',
    bgGradient: 'from-yellow-500 to-amber-600',
  },
  {
    id: 'suya',
    label: 'Suya & Street Grills',
    shortLabel: 'Suya & Grills',
    emoji: '🍢',
    bgGradient: 'from-rose-600 to-red-700',
  },
  {
    id: 'shawarma',
    label: 'Shawarma & Fast Eats',
    shortLabel: 'Shawarma',
    emoji: '🌯',
    bgGradient: 'from-red-500 to-rose-600',
  },
  {
    id: 'pizza',
    label: 'Pizza & Pasta',
    shortLabel: 'Pizza',
    emoji: '🍕',
    bgGradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'pastries',
    label: 'Pastries & Bakeries',
    shortLabel: 'Pastries',
    emoji: '🥐',
    bgGradient: 'from-amber-600 to-yellow-700',
  },
  {
    id: 'drinks',
    label: 'Smoothies & Cold Drinks',
    shortLabel: 'Drinks',
    emoji: '🥤',
    bgGradient: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'fast',
    label: '⚡ Under 25 mins',
    shortLabel: '⚡ Express',
    emoji: '⚡',
    bgGradient: 'from-blue-600 to-indigo-700',
  },
];

export const MARKET_CATEGORY_BUBBLES: CategoryBubbleItem[] = [
  {
    id: 'All',
    label: 'All Aisles',
    shortLabel: 'All Goods',
    emoji: '🏪',
    bgGradient: 'from-slate-700 to-slate-900',
  },
  {
    id: 'Food & Market',
    label: 'Watt Market Produce',
    shortLabel: 'Watt Market',
    emoji: '🥦',
    bgGradient: 'from-emerald-500 to-green-600',
  },
  {
    id: 'Groceries',
    label: 'Supermarket & Pantry',
    shortLabel: 'Supermarket',
    emoji: '🛒',
    bgGradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'Bakery',
    label: 'Fresh Bread & Bakery',
    shortLabel: 'Bakery',
    emoji: '🍞',
    bgGradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'Drinks',
    label: 'Cold Drinks & Beverages',
    shortLabel: 'Drinks',
    emoji: '🍷',
    bgGradient: 'from-purple-500 to-pink-600',
  },
  {
    id: 'Pharmacy',
    label: 'Health & Wellness',
    shortLabel: 'Pharmacy',
    emoji: '💊',
    bgGradient: 'from-red-500 to-rose-600',
  },
  {
    id: 'Fashion',
    label: 'Fashion & Wear',
    shortLabel: 'Fashion',
    emoji: '👕',
    bgGradient: 'from-pink-500 to-rose-600',
  },
  {
    id: 'Electronics',
    label: 'Tech, Cables & Gadgets',
    shortLabel: 'Electronics',
    emoji: '🔌',
    bgGradient: 'from-cyan-500 to-teal-600',
  },
];

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
    <div className={cn('relative select-none', className)}>
      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar scroll-smooth">
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className="flex flex-col items-center gap-2 shrink-0 group focus:outline-none"
            >
              {/* Circular Bubble Icon */}
              <div
                className={cn(
                  'w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-2xl sm:text-3xl shadow-sm transition-all duration-300 relative',
                  cat.bgGradient ? `bg-gradient-to-br ${cat.bgGradient}` : 'bg-slate-100',
                  isActive
                    ? 'ring-4 ring-orange-500 scale-105 shadow-md shadow-orange-500/20'
                    : 'group-hover:scale-105 group-hover:shadow-md'
                )}
              >
                <span className="filter drop-shadow-xs transform group-hover:scale-110 transition-transform">
                  {cat.emoji}
                </span>

                {typeof cat.count === 'number' && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black border border-white">
                    {cat.count}
                  </span>
                )}
              </div>

              {/* Bubble Label */}
              <span
                className={cn(
                  'text-xs font-bold transition-colors text-center max-w-[72px] sm:max-w-[80px] leading-tight line-clamp-2',
                  isActive
                    ? 'text-orange-600 font-black'
                    : 'text-slate-700 group-hover:text-slate-950'
                )}
              >
                {cat.shortLabel || cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
