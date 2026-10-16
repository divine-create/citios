'use client';

import React from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { FallbackImg } from '@/components/cityos/CityUI';
import { useMoney } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

export interface PopularDishItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  organizationId: string;
  orgName?: string;
}

interface ChowdeckPopularDishCardProps {
  dish: PopularDishItem;
  onCustomize: (dish: PopularDishItem) => void;
  className?: string;
}

export default function ChowdeckPopularDishCard({
  dish,
  onCustomize,
  className,
}: ChowdeckPopularDishCardProps) {
  const { fmt } = useMoney();

  return (
    <button
      type="button"
      onClick={() => onCustomize(dish)}
      className={cn(
        'group flex flex-col justify-between w-44 sm:w-48 shrink-0 bg-white rounded-3xl border border-slate-200/80 p-2.5 shadow-2xs hover:shadow-lg hover:border-orange-300 transition-all text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/20',
        className
      )}
    >
      {/* Product Image & 1-Tap Plus Button */}
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 mb-2">
        <FallbackImg
          src={dish.imageUrl}
          alt={dish.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* 1-Tap Add Plus Button */}
        <div className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-orange-500 group-hover:bg-orange-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 active:scale-95 transition-transform duration-200">
          <Plus className="w-4 h-4 stroke-[3]" />
        </div>

        {dish.category && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-xs text-[9px] font-black uppercase tracking-wider text-white">
            {dish.category}
          </span>
        )}
      </div>

      {/* Info Section */}
      <div className="px-1 flex flex-col justify-between flex-1 gap-1">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
            {dish.orgName || 'Local Kitchen'}
          </p>
          <h4 className="text-xs sm:text-[13px] font-black text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-tight">
            {dish.name}
          </h4>
        </div>

        <p className="text-xs sm:text-sm font-black text-slate-950 mt-1">
          {dish.price != null ? fmt(dish.price) : '₦2,500'}
        </p>
      </div>
    </button>
  );
}
