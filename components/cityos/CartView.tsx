'use client';

import Link from 'next/link';
import { Trash2, ShoppingCart, ArrowLeft, ArrowRight, Store, AlertCircle, Minus, Plus, Zap, CheckCircle2 } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import { useCity } from '@/components/cityos/CityProvider';
import { FallbackImg } from '@/components/cityos/CityUI';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

const FREE_DELIVERY_THRESHOLD = 10000;

export default function CartView() {
  const { lines, setQty, remove, subtotal, deliveryFee, count, cartCitySlug, isForeignCart } = useCart();
  const { cities } = useCity();
  const { fmt } = useMoney();
  const bagCityName = cities.find((c) => c.slug === cartCitySlug)?.name ?? null;

  if (lines.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-10">
        <EmptyState 
          icon={<ShoppingCart className="w-8 h-8" />}
          title="Your basket is empty"
          description="Looks like you haven't added anything yet. Discover authentic Calabar meals and local goods."
          action={{ label: "Explore Food & Market", href: "/food" }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm"
        />
      </div>
    );
  }

  const previewTotal = subtotal + deliveryFee;
  const hasUnavailableItems = lines.some((l) => l.isAvailable === false);
  const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const freeDeliveryProgress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* Header */}
      <div>
        <Link href="/food" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-ink transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Continue Ordering
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Your Basket</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {count} {count === 1 ? 'item' : 'items'} ready for express checkout
            </p>
          </div>
          {isForeignCart && bagCityName && (
            <div className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Note: This basket is from {bagCityName}.
            </div>
          )}
        </div>
      </div>

      {/* Glovo-Style Free Delivery Milestone Bar */}
      <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs font-black mb-2">
          <span className="flex items-center gap-1.5 text-orange-950">
            <Zap className="w-4 h-4 text-orange-600 fill-orange-600" />
            {remainingForFreeDelivery === 0 ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> You unlocked Free Express Delivery!
              </span>
            ) : (
              <span>Add {fmt(remainingForFreeDelivery)} more to unlock Free Delivery!</span>
            )}
          </span>
          <span className="text-orange-700">{freeDeliveryProgress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-orange-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              remainingForFreeDelivery === 0 ? "bg-emerald-500" : "bg-gradient-to-r from-orange-500 to-amber-500"
            )}
            style={{ width: `${freeDeliveryProgress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        {/* Items Grouped by Store */}
        <div className="flex-1 space-y-6">
          {Object.entries(lines.reduce((acc, l) => {
            const orgKey = l.orgName || 'Store';
            if (!acc[orgKey]) acc[orgKey] = [];
            acc[orgKey].push(l);
            return acc;
          }, {} as Record<string, typeof lines>)).map(([orgName, orgLines]) => (
            <div key={orgName} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-orange-600" />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">{orgName}</h2>
                </div>
                <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                  ⚡ 25 - 35 min delivery
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {orgLines.map((l) => {
                  const itemHref = l.kind === 'food' ? `/food/item/${l.productId}` : l.kind === 'service' ? `/service/${l.productId}` : `/product/${l.productId}`;
                  const imgSrc = l.image ? (l.image.startsWith('http') || l.image.startsWith('/') ? l.image : `/api/assets/${l.image}`) : null;
                  return (
                    <div key={l.productId} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4 sm:gap-6 relative items-center">
                      <Link href={itemHref} className="shrink-0 group">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 relative">
                          {imgSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgSrc} alt={l.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <FallbackImg alt={l.name} className="w-full h-full" />
                          )}
                        </div>
                      </Link>

                      <div className="flex flex-col flex-grow w-full">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <div>
                            {l.isAvailable === false && (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md mb-1 inline-block">Unavailable</span>
                            )}
                            <Link href={itemHref} className="text-base font-bold text-slate-900 hover:text-orange-700 transition-colors line-clamp-1">
                              {l.name}
                            </Link>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base md:text-lg font-black text-slate-900">{fmt(l.price * l.qty)}</div>
                            {l.qty > 1 && (
                              <div className="text-xs font-semibold text-slate-400 mt-0.5">{fmt(l.price)} each</div>
                            )}
                          </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-2">
                          <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                            <button 
                              onClick={() => setQty(l.productId, l.qty - 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-9 text-center text-xs font-bold text-slate-900">{l.qty}</span>
                            <button 
                              onClick={() => setQty(l.productId, l.qty + 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button 
                            onClick={() => remove(l.productId)} 
                            className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary & Delivery Breakdown */}
        <div className="w-full lg:w-[380px] shrink-0">
          <div className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200/60 sticky top-6 space-y-6">
            <h2 className="text-xl font-black text-slate-900">Order Summary</h2>
            
            <div className="space-y-4 text-sm font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal ({count} items)</span>
                <span className="text-slate-900 font-bold">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  Express Delivery
                  {deliveryFee === 0 && subtotal > 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded">FREE</span>
                  )}
                </span>
                <span className={cn("font-bold", deliveryFee === 0 && subtotal > 0 ? "text-emerald-600" : "text-slate-900")}>
                  {deliveryFee > 0 ? fmt(deliveryFee) : (subtotal > 0 ? '₦0' : 'Calculated at checkout')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Service & Packaging</span>
                <span className="text-slate-900 font-bold">Included</span>
              </div>
            </div>

            <div className="border-t border-slate-200/80 pt-4 flex justify-between items-end">
              <span className="font-bold text-slate-900">Estimated Total</span>
              <span className="text-2xl md:text-3xl font-black text-orange-700">{fmt(previewTotal)}</span>
            </div>

            {hasUnavailableItems && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium leading-relaxed">
                Some items in your basket are currently out of stock. Please remove them to proceed.
              </div>
            )}

            <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
              <span className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900">Delivery Guarantee</p>
                <p className="text-[11px] text-slate-500 font-medium">Dispatched via Calabar City Courier Network</p>
              </div>
            </div>

            <Link 
              href={hasUnavailableItems ? '#' : '/checkout'}
              className={cn(
                "flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-black shadow-lg shadow-orange-600/25 transition-all",
                hasUnavailableItems
                  ? "opacity-50 cursor-not-allowed pointer-events-none"
                  : "hover:brightness-105 active:scale-[0.98]"
              )}
            >
              Proceed to Checkout <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
