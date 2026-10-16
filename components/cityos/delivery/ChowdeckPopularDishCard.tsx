'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { FallbackImg } from '@/components/cityos/CityUI';
import { useMoney } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';
import { CustomizableItem } from '@/components/cityos/ItemCustomizerModal';

export type PopularDishItem = CustomizableItem;

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
        'group flex flex-col justify-between w-40 sm:w-44 shrink-0 bg-white rounded-2xl border border-slate-200/90 p-2.5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all text-left cursor-pointer focus:outline-none',
        className
      )}
    >
      {/* Product Image & 1-Tap Plus Button */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-2">
        <FallbackImg
          src={dish.imageUrl}
          alt={dish.name}
          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-200"
        />

        {/* 1-Tap Add Plus Button */}
        <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-orange-600 group-hover:bg-orange-700 text-white flex items-center justify-center shadow-xs group-hover:scale-105 active:scale-95 transition-transform duration-150">
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </div>

        {dish.category && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-white/95 text-[10px] font-bold text-slate-800 shadow-xs">
            {dish.category}
          </span>
        )}
      </div>

      {/* Info Section */}
      <div className="px-0.5 flex flex-col justify-between flex-1 gap-1">
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            {dish.orgName || 'Kitchen'}
          </p>
          <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
            {dish.name}
          </h4>
        </div>

        <p className="text-xs sm:text-sm font-black text-slate-950 mt-1">
          {fmt(dish.price || 0)}
        </p>
      </div>
    </button>
  );
}
