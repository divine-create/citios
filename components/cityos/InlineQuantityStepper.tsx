'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { useCart, CartKind } from '@/components/cityos/CartStore';
import { cn } from '@/lib/utils';

export interface StepperProduct {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  orgId: string;
  orgName?: string;
  kind?: CartKind;
  maxQty?: number;
}

export default function InlineQuantityStepper({
  product,
  className,
  size = 'md',
}: {
  product: StepperProduct;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { lines, add, setQty, remove } = useCart();
  const line = lines.find((l) => l.productId === product.id);
  const qty = line?.qty ?? 0;
  const isOutOfStock = typeof product.maxQty === 'number' && product.maxQty <= 0;
  const isAtMax = typeof product.maxQty === 'number' && qty >= product.maxQty;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    add({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty: 1,
      image: product.image,
      orgId: product.orgId || 'org-general',
      orgName: product.orgName || 'Store',
      kind: product.kind || 'retail',
    });
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAtMax) return;
    setQty(product.id, qty + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (qty <= 1) {
      remove(product.id);
    } else {
      setQty(product.id, qty - 1);
    }
  };

  if (isOutOfStock && qty === 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center font-bold rounded-full bg-slate-100 text-slate-400 border border-slate-200/80 select-none cursor-not-allowed',
          size === 'sm' && 'h-7 px-2.5 text-[10px]',
          size === 'md' && 'h-8 px-3 text-[11px]',
          size === 'lg' && 'h-9 px-4 text-[12px]',
          className
        )}
      >
        Sold out
      </span>
    );
  }

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        className={cn(
          'inline-flex items-center justify-center gap-1 font-bold rounded-full transition-all duration-200 select-none shadow-sm',
          size === 'sm' && 'h-7 px-2.5 text-[11px] bg-white border border-[#EBEBEB] text-[#222222] hover:border-[#FF385C] hover:text-[#FF385C]',
          size === 'md' && 'h-8 px-3 text-[12px] bg-white border border-[#EBEBEB] text-[#222222] hover:border-[#FF385C] hover:text-[#FF385C] hover:shadow-md',
          size === 'lg' && 'h-9 px-4 text-[13px] bg-[#FF385C] text-white hover:bg-[#E00B41]',
          className
        )}
      >
        <Plus className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
        <span>Add</span>
      </button>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={cn(
        'inline-flex items-center justify-between rounded-full bg-[#222222] text-white shadow-md select-none transition-all duration-200',
        size === 'sm' && 'h-7 px-1 min-w-[76px]',
        size === 'md' && 'h-8 px-1.5 min-w-[88px]',
        size === 'lg' && 'h-9 px-2 min-w-[104px]',
        className
      )}
    >
      <button
        type="button"
        onClick={handleDecrement}
        aria-label="Decrease quantity"
        className="w-6 h-6 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 active:scale-90 transition-all"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <span className={cn('font-black text-white text-center px-1', size === 'sm' ? 'text-[11px]' : 'text-[12px]')}>
        {qty}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={isAtMax}
        aria-label="Increase quantity"
        title={isAtMax ? `Max available stock (${product.maxQty})` : 'Increase quantity'}
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center transition-all',
          isAtMax
            ? 'text-white/30 cursor-not-allowed'
            : 'text-white/80 hover:text-white hover:bg-white/20 active:scale-90'
        )}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
