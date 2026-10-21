'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import SaveButton from '@/components/cityos/SaveButton';
import type { SavedEntityType } from '@/lib/saved-items';
import { cn } from '@/lib/utils';
import { FallbackImg } from '@/components/cityos/CityUI';

export interface AirbnbCardProps {
  id: string | number;
  href: string;
  title: string;
  subtitle?: string;
  image?: string;
  images?: string[];
  rating?: number | null;
  reviewCount?: number;
  neighborhood?: string;
  badge?: string; // e.g. "Guest favorite", "Top Rated", "Authentic"
  price?: number | string;
  priceSuffix?: string; // e.g. "night", "plate", "delivery"
  metaLine?: string; // e.g. "⚡ 25-35 min · Open now"
  className?: string;
  aspectRatio?: '4/3' | '16/10' | 'square';
  /** When set, a persisted save heart is shown for this entity. */
  saveKind?: SavedEntityType;
  saveId?: string;
}

export default function AirbnbCard({
  id,
  href,
  title,
  subtitle,
  image,
  images,
  rating,
  reviewCount,
  neighborhood,
  badge,
  price,
  priceSuffix = 'avg',
  metaLine,
  className,
  aspectRatio = '4/3',
  saveKind,
  saveId,
}: AirbnbCardProps) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const displayImages = images && images.length > 0 ? images : image ? [image] : [];
  const currentImg = displayImages[activeImageIdx] || image;


  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === '16/10'
      ? 'aspect-[16/10]'
      : 'aspect-[4/3]';

  return (
    <div className={cn('group/card flex flex-col cursor-pointer select-none', className)}>
      <Link href={href} className="block relative">
        {/* Photo Container */}
        <div
          className={cn(
            'w-full rounded-2xl overflow-hidden relative bg-neutral-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-300',
            aspectClass
          )}
        >
          {currentImg ? (
            <FallbackImg
              src={currentImg}
              alt={title}
              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center text-neutral-500 font-bold text-lg">
              {title.slice(0, 2).toUpperCase()}
            </div>
          )}

          {/* Top Badge (Guest Favorite / Authentic) */}
          {badge ? (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#222222] text-[11px] font-black tracking-tight shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-black/5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF385C]" />
                {badge}
              </span>
            </div>
          ) : null}

          {/* Save (wishlist) heart: persisted via SavedItem */}
          {saveKind && saveId ? (
            <SaveButton kind={saveKind} entityId={saveId} variant="overlay" className="absolute top-3 right-3 z-10" />
          ) : null}

          {/* Dot navigation if multiple images */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 z-10 opacity-0 group-hover/card:opacity-100 transition-opacity">
              {displayImages.slice(0, 5).map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-all',
                    idx === activeImageIdx
                      ? 'bg-white scale-125'
                      : 'bg-white/60 hover:bg-white/80'
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveImageIdx(idx);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Airbnb 3-Line Metadata Block */}
        <div className="pt-3 flex flex-col gap-0.5">
          {/* Row 1: Title and Star Rating */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-[15px] text-[#222222] truncate tracking-tight group-hover/card:text-[#FF385C] transition-colors">
              {title}
            </h3>
            {rating && rating > 0 ? (
              <div className="flex items-center gap-1 shrink-0 text-[13px] font-semibold text-[#222222]">
                <Star className="w-3.5 h-3.5 fill-[#222222] text-[#222222]" />
                <span>{rating.toFixed(1)}</span>
                {reviewCount && reviewCount > 0 ? (
                  <span className="text-[#717171] font-normal">({reviewCount})</span>
                ) : null}
              </div>
            ) : (
              <span className="text-[12px] font-semibold text-[#717171] shrink-0">New</span>
            )}
          </div>

          {/* Row 2: Neighborhood / Location / Subtitle */}
          {(neighborhood || subtitle) && (
            <p className="text-[14px] text-[#717171] truncate font-normal leading-snug">
              {neighborhood || subtitle}
            </p>
          )}

          {/* Row 3: Meta line (distance / delivery / hours) */}
          {metaLine && (
            <p className="text-[13px] text-[#717171] truncate font-normal leading-snug">
              {metaLine}
            </p>
          )}

          {/* Row 4: Pricing */}
          {price !== undefined && price !== null && (
            <div className="pt-1 text-[15px] text-[#222222] font-normal">
              <span className="font-black text-[#222222]">
                {typeof price === 'number'
                  ? `₦${price.toLocaleString()}`
                  : price}
              </span>{' '}
              {priceSuffix && (
                <span className="text-[#717171] text-[14px] font-normal">
                  {priceSuffix}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
