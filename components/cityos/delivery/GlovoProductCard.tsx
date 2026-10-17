'use client';

import React from 'react';
import Link from 'next/link';
import { FallbackImg } from '@/components/cityos/CityUI';
import { useMoney } from '@/components/cityos/CityProvider';
import InlineQuantityStepper from '@/components/cityos/InlineQuantityStepper';
import { cn } from '@/lib/utils';

export interface GlovoProductItem {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  description?: string;
  imageAssetId?: string;
  imageUrl?: string;
  storeName?: string;
  storeCategory?: string;
  orgSlug?: string;
  organizationId: string;
  globalCategory?: string;
  categoryName?: string;
  category?: string;
  brand?: string | null;
  specTags?: string[];
  stockQuantity?: number;
  isWeighed?: boolean;
  unit?: string;
  area?: string;
  neighborhood?: string;
}

interface GlovoProductCardProps {
  product: GlovoProductItem;
  className?: string;
}

export default function GlovoProductCard({
  product,
  className,
}: GlovoProductCardProps) {
  const { fmt } = useMoney();

  const productImg = product.imageAssetId
    ? product.imageAssetId.startsWith('http') || product.imageAssetId.startsWith('/')
      ? product.imageAssetId
      : `/api/assets/${product.imageAssetId}`
    : product.imageUrl || undefined;

  const isOutOfStock =
    !product.isWeighed &&
    typeof product.stockQuantity === 'number' &&
    product.stockQuantity <= 0;
  const isLowStock =
    !product.isWeighed &&
    typeof product.stockQuantity === 'number' &&
    product.stockQuantity > 0 &&
    product.stockQuantity <= 5;

  const discountPct =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;

  // Infer unit or category badge from product properties
  let unitBadge: string | null =
    product.brand ||
    (product.unit && product.unit !== 'ea' ? product.unit : null);
  if (!unitBadge) {
    const lower = product.name.toLowerCase();
    if (lower.includes('1kg') || lower.includes('1 kg')) unitBadge = '1 kg';
    else if (lower.includes('2kg') || lower.includes('2 kg')) unitBadge = '2 kg';
    else if (lower.includes('500g')) unitBadge = '500g';
    else if (lower.includes('pack')) unitBadge = 'Pack';
    else if (lower.includes('crate')) unitBadge = 'Crate';
    else if (lower.includes('tin')) unitBadge = 'Tin';
    else if (lower.includes('bottle') || lower.includes('750ml')) unitBadge = 'Bottle';
  }

  const aisleBadge = product.categoryName || product.globalCategory || product.storeName || 'Store';

  return (
    <div
      className={cn(
        'group flex flex-col justify-between bg-white rounded-3xl border border-slate-200/80 p-3 shadow-2xs hover:shadow-lg hover:border-slate-300 transition-all duration-200',
        isOutOfStock && 'opacity-75',
        className
      )}
    >
      <Link href={`/product/${product.id}`} className="block">
        {/* Product Image */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 mb-2.5">
          <FallbackImg
            src={productImg}
            alt={product.name}
            className={cn(
              'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300',
              isOutOfStock && 'grayscale'
            )}
          />

          {unitBadge && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-[9px] font-black uppercase tracking-wider text-white">
              {unitBadge}
            </span>
          )}

          {discountPct > 0 && !isOutOfStock && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-600 text-[9px] font-black uppercase tracking-wider text-white shadow-xs">
              -{discountPct}%
            </span>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px] flex items-center justify-center">
              <span className="px-2.5 py-1 rounded-full bg-slate-900/90 text-white text-[10px] font-black uppercase tracking-wider">
                Out of Stock
              </span>
            </div>
          )}

          {isLowStock && (
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-amber-500/95 text-white text-[9px] font-black tracking-wide shadow-xs">
              Only {product.stockQuantity} left
            </span>
          )}
        </div>

        {/* Category / Store & Title */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">
            {aisleBadge}
          </span>
          <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
            {product.name}
          </h4>
          {product.specTags && product.specTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {product.specTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-bold tracking-tight"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Price & Glovo Stepper */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <div className="flex flex-col leading-tight">
          <span className="text-xs sm:text-sm font-black text-slate-950">
            {fmt(product.price)}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-[10px] font-bold text-slate-400 line-through">
              {fmt(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* Rapid Inline Stepper */}
        <InlineQuantityStepper
          product={{
            id: product.id,
            name: product.name,
            price: product.price,
            image: productImg,
            orgId: product.organizationId,
            orgName: product.storeName,
            kind: 'retail',
            maxQty: product.isWeighed
              ? 99
              : typeof product.stockQuantity === 'number'
              ? product.stockQuantity
              : undefined,
          }}
          size="sm"
        />
      </div>
    </div>
  );
}
