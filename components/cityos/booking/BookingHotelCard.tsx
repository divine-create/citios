'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  Star,
  MapPin,
  Check,
  Zap,
  Coffee,
  ArrowRight,
  Camera,
} from 'lucide-react';
import { FallbackImg } from '@/components/cityos/CityUI';
import { useMoney } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

export interface BookingHotelItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  address?: string;
  neighborhood?: string;
  area?: string;
  image?: string;
  imageUrl?: string;
  images?: string[];
  rating?: number | null;
  reviewScore?: number;
  reviewText?: string;
  reviewCount?: number;
  stars?: number;
  price?: number;
  startingPrice?: number;
  compareAtPrice?: number;
  roomsCount?: number;
  roomType?: string;
  bedType?: string;
  freeCancellation?: boolean;
  breakfastIncluded?: boolean;
  hasPowerGuarantee?: boolean;
  distanceFromCenter?: string;
  badge?: string;
}

interface BookingHotelCardProps {
  hotel: BookingHotelItem;
  className?: string;
}

export default function BookingHotelCard({ hotel, className }: BookingHotelCardProps) {
  const { fmt } = useMoney();
  const [isFavorite, setIsFavorite] = useState(false);

  const price = hotel.startingPrice || hotel.price || null;
  const compareAtPrice =
    typeof hotel.compareAtPrice === 'number' && price && hotel.compareAtPrice > price
      ? hotel.compareAtPrice
      : null;
  const discountPercent =
    compareAtPrice && price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const reviewScore =
    typeof hotel.reviewScore === 'number'
      ? hotel.reviewScore
      : typeof hotel.rating === 'number' && hotel.rating > 0
      ? Number((hotel.rating * 2).toFixed(1))
      : null;
  const reviewCount = typeof hotel.reviewCount === 'number' ? hotel.reviewCount : 0;
  const reviewText =
    hotel.reviewText ||
    (reviewScore
      ? reviewScore >= 9.0
        ? 'Superb'
        : reviewScore >= 8.5
        ? 'Fabulous'
        : 'Very Good'
      : null);
  const starsCount = typeof hotel.stars === 'number' && hotel.stars > 0 ? hotel.stars : null;

  const coverPhoto = hotel.image || hotel.imageUrl || hotel.images?.[0];
  const photosCount = hotel.images?.length || 0;

  return (
    <div
      className={cn(
        'group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col md:flex-row relative',
        className
      )}
    >
      {/* 1. Photo Section */}
      <div className="relative md:w-72 lg:w-80 shrink-0 aspect-video md:aspect-auto overflow-hidden bg-slate-100">
        <Link href={`/stay/${hotel.id}`} className="block w-full h-full">
          <FallbackImg
            src={coverPhoto}
            alt={hotel.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsFavorite(!isFavorite);
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

        {discountPercent > 0 && (
          <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-md tracking-wider uppercase">
            {discountPercent}% OFF
          </div>
        )}

        {photosCount > 1 && (
          <div className="absolute bottom-3 right-3 z-10 px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
            <Camera className="w-3 h-3" />
            <span>1/{photosCount}</span>
          </div>
        )}
      </div>

      {/* 2. Middle & Right Content Grid */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/stay/${hotel.id}`}>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-teal-800 transition-colors">
                  {hotel.name}
                </h3>
              </Link>

              {starsCount ? (
                <div className="flex items-center text-amber-400">
                  {Array.from({ length: starsCount }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>
              ) : null}
            </div>

            {(hotel.neighborhood || hotel.address) && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span className="text-slate-700 font-bold">
                  {hotel.neighborhood || hotel.address}
                </span>
                {hotel.distanceFromCenter && (
                  <>
                    <span>·</span>
                    <span className="text-slate-400">{hotel.distanceFromCenter}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {reviewScore !== null && (
            <div className="flex items-center sm:items-end gap-2.5 shrink-0 self-start sm:self-auto">
              <div className="text-right hidden sm:block">
                {reviewText && (
                  <p className="text-xs font-black text-slate-900 leading-none">{reviewText}</p>
                )}
                {reviewCount > 0 && (
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {reviewCount} reviews
                  </p>
                )}
              </div>

              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-sm">
                {reviewScore.toFixed(1)}
              </div>
            </div>
          )}
        </div>

        {hotel.description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {hotel.description}
          </p>
        )}

        {(hotel.roomType ||
          hotel.bedType ||
          hotel.freeCancellation ||
          hotel.breakfastIncluded ||
          hotel.hasPowerGuarantee) && (
          <div className="space-y-2 border-l-2 border-slate-200 pl-3">
            {hotel.roomType && (
              <p className="text-xs font-black text-slate-900">{hotel.roomType}</p>
            )}
            {hotel.bedType && (
              <p className="text-[11px] text-slate-500 font-medium">{hotel.bedType}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-bold text-emerald-700">
              {hotel.freeCancellation && (
                <span className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  Free cancellation
                </span>
              )}

              {hotel.breakfastIncluded && (
                <span className="flex items-center gap-1 text-slate-700">
                  <Coffee className="w-3.5 h-3.5 text-amber-600" />
                  Breakfast included
                </span>
              )}

              {hotel.hasPowerGuarantee && (
                <span className="flex items-center gap-1 text-amber-700">
                  <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  24/7 Power
                </span>
              )}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            {price ? (
              <>
                <span className="text-[11px] text-slate-500 font-medium">Starting from</span>
                <div className="flex items-baseline gap-2">
                  {compareAtPrice && compareAtPrice > price && (
                    <span className="text-xs text-rose-500 line-through font-bold">
                      {fmt(compareAtPrice)}
                    </span>
                  )}
                  <span className="text-xl sm:text-2xl font-black text-slate-950">
                    {fmt(price)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ night</span>
                </div>
              </>
            ) : (
              <span className="text-sm font-bold text-slate-700">Contact for room rates</span>
            )}
          </div>

          <Link
            href={`/stay/${hotel.id}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black shadow-md transition-all"
          >
            <span>View Rooms</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
