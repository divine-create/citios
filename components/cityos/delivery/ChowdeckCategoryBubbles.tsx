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
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar scroll-smooth">
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 shrink-0 border focus:outline-none',
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:text-slate-950 hover:border-slate-300'
              )}
            >
              <span>{cat.shortLabel || cat.label}</span>
              {typeof cat.count === 'number' && cat.count > 0 && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold',
                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
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
