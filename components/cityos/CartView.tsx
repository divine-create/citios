'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingCart, ChevronRight, ArrowLeft } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import { useCity } from '@/components/cityos/CityProvider';
import { FallbackImg, Money } from '@/components/cityos/CityUI';

export default function CartView() {
  const { lines, setQty, remove, subtotal, deliveryFee, count, cartCitySlug, isForeignCart } = useCart();
  const { city, cities } = useCity();
  const { fmt } = useMoney();
  const bagCityName = cities.find((c) => c.slug === cartCitySlug)?.name ?? null;

  if (lines.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 text-teal-800 flex items-center justify-center">
          <ShoppingCart className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-black text-ink">Your bag is empty</h1>
        <p className="text-sm text-slate-500">Fresh items are a tap away.</p>
        <div className="flex gap-3 justify-center pt-2">
          <Link href="/explore" className="px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
            Explore more
          </Link>
        </div>
      </div>
    );
  }

  const total = subtotal + deliveryFee;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href="/explore" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-800 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Keep shopping
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink">Your Bag ({count})</h1>
          {bagCityName ? (
            <p className="text-[11px] font-bold text-slate-500 mt-1">
              {`Bag city: ${bagCityName}`}
              {isForeignCart && city ? ` â€” you're browsing ${city.name}` : ''}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-3">
          {lines.map((l) => (
            <div key={l.productId} className="bg-white rounded-2xl border border-slate-100 p-3.5 flex gap-4 items-center">
              <Link href={l.kind === 'food' ? `/food/item/${l.productId}` : `/product/${l.productId}`}>
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 ring-1 ring-slate-200/50 relative">
                  {l.image ? (
                     // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/assets/${l.image}`} alt={l.name} className="w-full h-full object-cover" />
                  ) : (
                    <FallbackImg alt={l.name} className="absolute inset-0" />
                  )}
                </div>
              </Link>
              
              <div className="flex-1 space-y-2">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{l.orgName}</div>
                  <Link href={l.kind === 'food' ? `/food/item/${l.productId}` : `/product/${l.productId}`} className="text-sm font-black text-ink hover:text-teal-700 transition-colors">{l.name}</Link>
                  <div className="text-xs font-bold text-teal-800 pt-0.5">{fmt(l.price)}</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                    <button 
                      onClick={() => setQty(l.productId, l.qty - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-slate-500"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold">{l.qty}</span>
                    <button 
                      onClick={() => setQty(l.productId, l.qty + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-slate-500"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => remove(l.productId)} className="text-slate-400 hover:text-rose-500 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="font-black text-sm text-ink text-right min-w-[80px]">
                {fmt(l.price * l.qty)}
              </div>
            </div>
          ))}
        </div>

        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-slate-50 rounded-3xl p-5 space-y-5 sticky top-24">
            <h2 className="text-sm font-black text-ink">Order summary</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-ink"><Money amount={subtotal} /></span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Delivery</span>
                <span className="font-bold text-ink"><Money amount={deliveryFee} /></span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-black text-ink">Total</span>
                <span className="text-xl font-black text-teal-900"><Money amount={total} /></span>
              </div>
            </div>

            <Link 
              href="/checkout"
              className="w-full h-12 flex items-center justify-between px-5 bg-teal-800 text-white rounded-xl text-sm font-black hover:bg-teal-900 transition-all active:scale-[0.98]"
            >
              <span>Checkout</span>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
