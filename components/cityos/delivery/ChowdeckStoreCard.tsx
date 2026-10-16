'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  Star,
  Zap,
  CheckCircle2,
  Clock,
  Bike,
  Sparkles,
} from 'lucide-react';
import { FallbackImg } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

export interface StoreCardData {
  id: string;
  name: string;
  type: string;
  description?: string;
  address?: string;
  area?: string;
  image?: string;
  images?: string[];
  rating?: number | null;
  reviewCount?: number;
  deliveryEta?: string | null;
  deliveryFee?: number;
  freeDeliveryOver?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  isFastCourier?: boolean;
  isOpen?: boolean;
  badge?: string;
  cuisines?: string[];
  aisles?: string[];
  minPrice?: number;
  href?: string;
}

interface ChowdeckStoreCardProps {
  store: StoreCardData;
  className?: string;
  aspectRatio?: '16/9' | '4/3';
}

export default function ChowdeckStoreCard({
  store,
  className,
  aspectRatio = '16/9',
}: ChowdeckStoreCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const href = store.href || (store.type === 'RETAIL' ? `/org/${store.id}` : `/food/${store.id}`);
  const deliveryEta = store.deliveryEta || (store.isFastCourier ? '15 - 25 min' : '25 - 35 min');
  const deliveryFeeText = store.deliveryFee === 0 || store.deliveryFee === undefined
    ? 'Free Delivery'
    : `₦${store.deliveryFee.toLocaleString()} delivery`;

  const tagList = store.cuisines?.length
    ? store.cuisines.slice(0, 3).join(' · ')
    : store.aisles?.length
    ? store.aisles.slice(0, 3).join(' · ')
    : store.description || 'Authentic Local Specialties';

  const isClosed = store.isOpen === false;

  return (
    <div
      className={cn(
        'group flex flex-col bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-xl hover:border-slate-300 transition-all duration-300 relative',
        className
      )}
    >
      {/* Clickable Image Banner */}
      <Link href={href} className="relative block overflow-hidden bg-slate-100">
        <div
          className={cn(
            'w-full overflow-hidden transition-transform duration-500 group-hover:scale-105',
            aspectRatio === '16/9' ? 'aspect-video' : 'aspect-[4/3]'
          )}
        >
          <FallbackImg
            src={store.image || store.images?.[0]}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Gradient Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/20 pointer-events-none" />

        {/* Top-Left: Floating ETA Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          <div className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-slate-900 text-[11px] font-black shadow-md flex items-center gap-1">
            <Zap className="w-3 h-3 text-orange-500 fill-orange-500" />
            <span>{deliveryEta}</span>
          </div>

          {store.badge && (
            <div className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md uppercase tracking-wider">
              {store.badge}
            </div>
          )}
        </div>

        {/* Top-Right: Interactive Heart Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsFavorite((prev) => !prev);
          }}
          className={cn(
            'absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all z-10 shadow-sm active:scale-90',
            isFavorite
              ? 'bg-rose-500 text-white'
              : 'bg-white/80 hover:bg-white text-slate-600 hover:text-rose-500'
          )}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={cn('w-4 h-4', isFavorite ? 'fill-white' : '')} />
        </button>

        {/* Bottom Tag / Promo Banner on Image */}
        {store.isFastCourier && (
          <div className="absolute bottom-2.5 left-3 z-10 flex items-center gap-1 text-[11px] font-bold text-amber-300 drop-shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chowsmart Verified Partner</span>
          </div>
        )}

        {/* Closed Overlay */}
        {isClosed && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 p-4 text-center">
            <Clock className="w-6 h-6 text-amber-400 mb-1" />
            <span className="text-sm font-black">Currently Closed</span>
            <span className="text-xs text-slate-300 font-medium">Opens for pre-orders at 8:00 AM</span>
          </div>
        )}
      </Link>

      {/* Card Info Section */}
      <div className="p-4 flex flex-col justify-between flex-1 gap-2">
        <div>
          {/* Title & Rating */}
          <div className="flex items-start justify-between gap-2">
            <Link href={href} className="flex-1">
              <h3 className="text-base font-black text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1 flex items-center gap-1.5">
                <span>{store.name}</span>
                {store.isVerified !== false && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100 shrink-0" />
                )}
              </h3>
            </Link>

            {/* Rating Pill */}
            {typeof store.rating === 'number' && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-black shrink-0">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{store.rating.toFixed(1)}</span>
                {store.reviewCount && (
                  <span className="text-[10px] text-amber-700 font-semibold">({store.reviewCount})</span>
                )}
              </div>
            )}
          </div>

          {/* Cuisines / Description Line */}
          <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
            {tagList}
          </p>
        </div>

        {/* Delivery Metrics & Price */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
          <div className="flex items-center gap-1.5 truncate">
            <Bike className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{deliveryFeeText}</span>
            <span>·</span>
            <span className="text-slate-400 truncate">{store.area || 'Calabar'}</span>
          </div>

          {typeof store.minPrice === 'number' && (
            <span className="font-bold text-slate-900 shrink-0">
              from ₦{store.minPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
