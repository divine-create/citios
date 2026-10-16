'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { StorefrontCampaign } from '@/lib/actions/storefront-management';
import { FallbackImg } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

interface ChowdeckHeroCarouselProps {
  campaigns: StorefrontCampaign[];
  autoSlideInterval?: number;
}

export default function ChowdeckHeroCarousel({
  campaigns,
  autoSlideInterval = 5500,
}: ChowdeckHeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const activeCampaigns = campaigns.filter((c) => c.isActive !== false);

  useEffect(() => {
    if (activeCampaigns.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeCampaigns.length);
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [activeCampaigns.length, autoSlideInterval, isPaused]);

  if (activeCampaigns.length === 0) return null;

  const current = activeCampaigns[currentIndex];

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div
      className="relative rounded-3xl overflow-hidden group select-none shadow-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slide Container */}
      <div className="relative aspect-[21/9] min-h-[220px] max-h-[300px] w-full overflow-hidden bg-slate-900">
        {/* Background Image with Ambient Glow */}
        <FallbackImg
          src={current.imageUrl}
          alt={current.title}
          className="absolute inset-0 w-full h-full object-cover opacity-50 scale-105 group-hover:scale-100 transition-transform duration-700"
        />

        {/* Gradient Overlay */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-r opacity-90',
            current.bgColor || 'from-slate-950 via-slate-900/90 to-transparent'
          )}
        />

        {/* Content Box */}
        <div className="relative z-10 h-full p-6 sm:p-8 flex flex-col justify-between max-w-xl text-white">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-white border border-white/30 flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {current.badge}
              </span>

              {current.code && (
                <button
                  type="button"
                  onClick={(e) => handleCopyCode(e, current.code!)}
                  className="px-2.5 py-1 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-[11px] font-mono font-black text-amber-300 border border-amber-300/40 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Click to copy code"
                >
                  <Tag className="w-3 h-3" />
                  <span>{copiedCode === current.code ? 'Copied! ✓' : `Code: ${current.code}`}</span>
                </button>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight drop-shadow-sm text-balance">
              {current.title}
            </h2>

            <p className="text-xs sm:text-sm text-white/85 line-clamp-2 max-w-md font-medium leading-relaxed">
              {current.subtitle}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={current.targetUrl}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-amber-50 text-slate-950 text-xs font-black shadow-lg transition-all hover:gap-3 group/btn"
            >
              <span>Explore Deals</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Carousel Navigation Arrows */}
        {activeCampaigns.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => (prev - 1 + activeCampaigns.length) % activeCampaigns.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-white/20"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % activeCampaigns.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-white/20"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Slide Indicators / Dots */}
      {activeCampaigns.length > 1 && (
        <div className="absolute bottom-3 right-5 z-20 flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
          {activeCampaigns.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={cn(
                'rounded-full transition-all duration-300',
                idx === currentIndex ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
