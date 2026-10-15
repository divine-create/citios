'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Star } from 'lucide-react';
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
}

export default function AirbnbCard({
  id,
  href,
  title,
  subtitle,
  image,
  images,
  rating = 4.8,
  reviewCount,
  neighborhood,
  badge,
  price,
  priceSuffix = 'avg',
  metaLine,
  className,
  aspectRatio = '4/3',
}: AirbnbCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const displayImages = images && images.length > 0 ? images : image ? [image] : [];
  const currentImg = displayImages[activeImageIdx] || image;

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked((prev) => !prev);
  };

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

          {/* Wishlist Heart Button */}
          <button
            type="button"
            onClick={toggleLike}
            aria-label={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-white hover:scale-110 active:scale-90 transition-transform duration-150 focus:outline-none"
          >
            <Heart
              className={cn(
                'w-6 h-6 stroke-[2px] transition-colors duration-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]',
                isLiked
                  ? 'fill-[#FF385C] stroke-[#FF385C]'
                  : 'fill-black/25 stroke-white hover:fill-black/40'
              )}
            />
          </button>

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
            {rating ? (
              <div className="flex items-center gap-1 shrink-0 text-[13px] font-semibold text-[#222222]">
                <Star className="w-3.5 h-3.5 fill-[#222222] text-[#222222]" />
                <span>{rating.toFixed(1)}</span>
                {reviewCount ? (
                  <span className="text-[#717171] font-normal">({reviewCount})</span>
                ) : null}
              </div>
            ) : null}
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
