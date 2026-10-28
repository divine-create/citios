'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/components/cityos/CartStore';
import { useMoney } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

interface ChowdeckBasketDockProps {
  label?: string;
  className?: string;
}

export default function ChowdeckBasketDock({
  label = 'Checkout',
  className,
}: ChowdeckBasketDockProps) {
  const { count, subtotal, lines } = useCart();
  const { fmt } = useMoney();

  if (count <= 0) return null;

  // Single-merchant or primary merchant name
  const primaryOrgName = lines[0]?.orgName || 'Store';
  const hasMultipleMerchants = new Set(lines.map((l) => l.orgId)).size > 1;

  return (
    <aside
      aria-label="Checkout Dock"
      className={cn(
        'fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 left-4 right-4 max-w-lg mx-auto z-50 animate-in slide-in-from-bottom-6 duration-300 pointer-events-auto',
        className
      )}
    >
      <Link
        href="/checkout"
        className="flex items-center justify-between bg-slate-950 text-white p-3.5 px-5 rounded-full shadow-2xl hover:bg-black transition-all group border border-white/15"
      >
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-md">
              {count}
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <span className="truncate max-w-[160px] sm:max-w-[220px]">
                {hasMultipleMerchants ? `${lines.length} items from stores` : primaryOrgName}
              </span>
            </div>
            <p className="text-sm sm:text-base font-black text-white leading-tight">
              {fmt(subtotal)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-black text-orange-400 group-hover:text-orange-300 group-hover:translate-x-1 transition-all">
          <span>Checkout</span>
          <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </Link>
    </aside>
  );
}
