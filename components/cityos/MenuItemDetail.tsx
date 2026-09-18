'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Clock, Plus, Minus, ShoppingBag } from 'lucide-react';
import { CityCard, FallbackImg, Stars, ChipButton } from '@/components/cityos/CityUI';
import { useCart } from '@/components/cityos/CartStore';
import { getCityFoodMenuItem } from '@/app/actions/food';
import { fmtNaira } from '@/lib/format';

interface MenuItemDetailProps {
  menuItemId: string;
}

export default function MenuItemDetail({ menuItemId }: MenuItemDetailProps) {
  const [qty, setQty] = useState(1);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

  useEffect(() => {
    let active = true;
    getCityFoodMenuItem(menuItemId).then((d) => {
      if (!active) return;
      setItem(d);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [menuItemId]);

  if (loading) {
    return (
      <div className="space-y-6 py-20 flex justify-center">
        <Clock className="w-5 h-5 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center space-y-2">
        <p className="text-sm font-black text-slate-500">Dish not found.</p>
        <p className="text-xs text-slate-400">It may have been taken off the menu. Head back to CityFood.</p>
        <div className="pt-1">
          <Link href="/food" className="inline-flex items-center gap-1.5 text-xs font-black text-orange-700 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to CityFood
          </Link>
        </div>
      </div>
    );
  }

  const mi = item.menuItem;
  const org = item.org;
  const loc = item.location;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <Link href="/food" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-ink transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to CityFood
      </Link>

      <CityCard className="overflow-hidden">
        <FallbackImg
          src={mi.imageUrl}
          alt={mi.name}
          className="h-48 w-full"
          icon={<span className="text-lg font-black">{mi.name.slice(0, 1)}</span>}
        />
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-black text-ink truncate">{mi.name}</h1>
              {org ? (
                <Link href={`/food/${org.id}`} className="mt-0.5 inline-flex items-center gap-1 text-xs font-black text-orange-700 hover:underline truncate">
                  {org.name}
                </Link>
              ) : null}
            </div>
            <p className="text-lg font-black text-orange-700 shrink-0">{fmtNaira(mi.price ?? 0)}</p>
          </div>

          {loc ? (
            <p className="text-[11px] font-bold text-slate-500 line-clamp-2">
              {[loc.name, loc.address].filter(Boolean).join(' · ')}
            </p>
          ) : null}

          {mi.description ? (
            <p className="text-[13px] font-medium text-slate-600 leading-relaxed">{mi.description}</p>
          ) : null}

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{mi.category ?? 'Dish'}</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-1">
              <ChipButton active={false} onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus className="w-3.5 h-3.5" />
              </ChipButton>
              <span className="text-sm font-black text-ink w-6 text-center">{qty}</span>
              <ChipButton active={false} onClick={() => setQty((q) => q + 1)}>
                <Plus className="w-3.5 h-3.5" />
              </ChipButton>
            </div>
            <button
              onClick={() =>
                add({
                  productId: mi.id,
                  qty,
                  name: mi.name,
                  price: mi.price ?? 0,
                  image: mi.imageUrl,
                  orgId: mi.organizationId,
                  orgName: org?.name ?? '',
                  kind: 'food',
                })
              }
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 text-white text-xs font-black hover:bg-orange-700 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" /> Add {qty} to cart · {fmtNaira((mi.price ?? 0) * qty)}
            </button>
          </div>
        </div>
      </CityCard>
    </div>
  );
}
