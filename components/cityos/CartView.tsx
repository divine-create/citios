'use client';

import Link from 'next/link';
import { Trash2, ShoppingCart, ArrowLeft, ArrowRight, Store, AlertCircle } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import { useCity } from '@/components/cityos/CityProvider';
import { FallbackImg } from '@/components/cityos/CityUI';
import { QuantitySelector } from '@/components/market/MarketUI';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CartView() {
  const { lines, setQty, remove, subtotal, deliveryFee, count, cartCitySlug, isForeignCart } = useCart();
  const { city, cities } = useCity();
  const { fmt } = useMoney();
  const bagCityName = cities.find((c) => c.slug === cartCitySlug)?.name ?? null;

  if (lines.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-10">
        <EmptyState 
          icon={<ShoppingCart className="w-8 h-8" />}
          title="Your cart is empty"
          description="Looks like you haven't added anything yet. Discover local products on the marketplace."
          action={{ label: "Start Shopping", href: "/market" }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm"
        />
      </div>
    );
  }

  // The client side displays a preview. The server is always authoritative on checkout.
  const previewTotal = subtotal + deliveryFee;

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div>
        <Link href="/market" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-ink transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Continue Shopping
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Your Cart</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {count} {count === 1 ? 'item' : 'items'} ready for checkout
            </p>
          </div>
          {isForeignCart && bagCityName && (
            <div className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Note: This cart is from {bagCityName}.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        
        {/* Items List */}
        <div className="flex-1 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
            {lines.map((l) => (
              <div key={l.productId} className="p-4 md:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 relative">
                
                {/* Image */}
                <Link href={l.kind === 'food' ? `/food/item/${l.productId}` : `/product/${l.productId}`} className="shrink-0 group">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 relative">
                    <FallbackImg 
                      src={l.image ? `/api/assets/${l.image}` : undefined} 
                      alt={l.name}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-300" 
                    />
                  </div>
                </Link>

                {/* Details */}
                <div className="flex flex-col flex-grow">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div>
                      {l.orgName && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-1">
                          <Store className="w-3.5 h-3.5" /> {l.orgName}
                        </div>
                      )}
                      <Link href={l.kind === 'food' ? `/food/item/${l.productId}` : `/product/${l.productId}`} className="text-base md:text-lg font-bold text-slate-900 hover:underline leading-tight line-clamp-2">
                        {l.name}
                      </Link>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg md:text-xl font-black text-slate-900">{fmt(l.price * l.qty)}</div>
                      {l.qty > 1 && (
                        <div className="text-xs font-semibold text-slate-400 mt-0.5">{fmt(l.price)} each</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <QuantitySelector 
                      value={l.qty}
                      onChange={(newQty) => setQty(l.productId, newQty)}
                      max={99}
                    />
                    <button 
                      onClick={() => remove(l.productId)}
                      className="text-slate-400 hover:text-rose-600 p-2 -mr-2 rounded-xl hover:bg-rose-50 transition-colors flex items-center justify-center group"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-5 h-5 group-active:scale-90 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-[380px] shrink-0">
          <div className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200/60 sticky top-6">
            <h2 className="text-xl font-black text-slate-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6 text-sm font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal ({count} items)</span>
                <span className="text-slate-900">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Delivery</span>
                <span className="text-slate-900">{deliveryFee > 0 ? fmt(deliveryFee) : 'Calculated at checkout'}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes</span>
                <span className="text-slate-900">Included</span>
              </div>
            </div>

            <div className="border-t border-slate-200/80 pt-4 mb-8 flex justify-between items-end">
              <span className="font-bold text-slate-900">Estimated Total</span>
              <span className="text-2xl md:text-3xl font-black text-ink">{fmt(previewTotal)}</span>
            </div>

            <div className="bg-slate-100 text-slate-500 text-[11px] font-medium p-3 rounded-xl mb-6 leading-relaxed">
              * Final delivery pricing, taxes, and inventory availability will be authoritatively calculated by the server during checkout.
            </div>

            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 w-full py-4 bg-ink text-white rounded-2xl font-black shadow-lg shadow-ink/20 hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              Proceed to Checkout <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
