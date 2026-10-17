'use client';

import React from 'react';
import Link from 'next/link';
import {
  Star,
  CheckCircle2,
  Clock,
  Bike,
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
  neighborhood?: string;
  storeCategory?: string;
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
  category?: string;
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
  const href = store.href || (store.type === 'RETAIL' ? `/org/${store.id}` : `/food/${store.id}`);
  const deliveryEta = store.deliveryEta || (store.isFastCourier ? '15 - 25 min' : null);
  const deliveryFeeText = typeof store.deliveryFee === 'number'
    ? (store.deliveryFee === 0 ? 'Free Delivery' : `₦${store.deliveryFee.toLocaleString()} delivery`)
    : null;

  const tagList = store.cuisines?.length
    ? store.cuisines.slice(0, 3).join(' · ')
    : store.aisles?.length
    ? store.aisles.slice(0, 3).join(' · ')
    : store.description || '';

  const isClosed = store.isOpen === false;

  return (
    <div
      className={cn(
        'group flex flex-col bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 relative',
        className
      )}
    >
      {/* Clickable Image Banner */}
      <Link href={href} className="relative block overflow-hidden bg-slate-100">
        <div
          className={cn(
            'w-full overflow-hidden transition-transform duration-300 group-hover:scale-103',
            aspectRatio === '16/9' ? 'aspect-video' : 'aspect-[4/3]'
          )}
        >
          <FallbackImg
            src={store.image || store.images?.[0]}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Top-Left: ETA & Badge */}
        {(deliveryEta || store.badge) && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
            {deliveryEta && (
              <div className="px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-slate-800 text-[11px] font-bold shadow-xs flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{deliveryEta}</span>
              </div>
            )}

            {store.badge && (
              <div className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold shadow-xs">
                {store.badge}
              </div>
            )}
          </div>
        )}

        {/* Closed Overlay */}
        {isClosed && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-2xs flex flex-col items-center justify-center text-white z-20 p-3 text-center">
            <Clock className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-xs font-bold">Currently Closed</span>
            <span className="text-[11px] text-slate-300">Opens for pre-orders later</span>
          </div>
        )}
      </Link>

      {/* Card Info Section */}
      <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
        <div>
          {/* Title & Rating */}
          <div className="flex items-start justify-between gap-2">
            <Link href={href} className="flex-1">
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1 flex items-center gap-1.5">
                <span>{store.name}</span>
                {store.isVerified !== false && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
              </h3>
            </Link>

            {/* Rating */}
            {typeof store.rating === 'number' && store.rating > 0 ? (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-amber-950 text-xs font-bold shrink-0">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{store.rating.toFixed(1)}</span>
                {store.reviewCount ? (
                  <span className="text-[10px] text-amber-700 font-normal">({store.reviewCount})</span>
                ) : null}
              </div>
            ) : (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider shrink-0">
                New
              </span>
            )}
          </div>

          {/* Cuisines / Description Line */}
          {tagList && (
            <p className="text-xs text-slate-500 font-normal line-clamp-1 mt-0.5">
              {tagList}
            </p>
          )}
        </div>

        {/* Delivery Metrics & Price */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1.5 truncate">
            <Bike className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {deliveryFeeText ? (
              <>
                <span className="truncate">{deliveryFeeText}</span>
                {store.area && <span>·</span>}
              </>
            ) : null}
            <span className="text-slate-400 truncate">{store.area || ''}</span>
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
