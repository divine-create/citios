'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingCart, ChevronRight, ArrowLeft } from 'lucide-react';
import { getProduct, getBusiness, fmtNaira } from '@/lib/demo/cityos';
import { useCart } from '@/components/cityos/CartStore';
import { FallbackImg, Money, DemoBanner } from '@/components/cityos/CityUI';

export default function CartView() {
  const { lines, setQty, remove, subtotal, deliveryFee, count } = useCart();

  if (lines.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 text-teal-800 flex items-center justify-center">
          <ShoppingCart className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-black text-ink">Your bag is empty</h1>
        <p className="text-sm text-slate-500">Fresh ogbono, palm oil and party trays are a tap away.</p>
        <div className="flex gap-3 justify-center pt-2">
          <Link href="/biz/calabar-fresh" className="px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
            Shop Calabar Fresh
          </Link>
          <Link href="/explore" className="px-5 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 text-xs font-black hover:ring-teal-300 transition-colors">
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
          <h1 className="text-xl font-black text-ink">Your bag</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{`${count} item${count > 1 ? 's' : ''} · ready for CityPay`}</p>
        </div>
        <DemoBanner className="hidden sm:flex !py-2 max-w-sm" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Lines */}
        <div className="flex-1 space-y-3">
          {lines.map((l) => {
            const p = getProduct(l.productId);
            if (!p) return null;
            const biz = getBusiness(p.bizSlug);
            return (
              <div key={l.productId} className="bg-white rounded-2xl border border-slate-100 p-3.5 flex gap-4 items-center">
                <Link href={`/product/${p.id}`}>
                  <FallbackImg src={p.image} alt={p.name} className="w-16 h-16 rounded-xl shrink-0" icon={<span className="text-base font-black">{p.name.slice(0, 1)}</span>} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${p.id}`} className="text-[13px] font-black text-ink truncate block hover:text-teal-900">
                    {p.name}
                  </Link>
                  <p className="text-[11px] font-bold text-slate-400 truncate">{biz?.name}</p>
                  <p className="text-[15px] font-black text-teal-900 mt-1">
                    {fmtNaira(p.price * l.qty)}
                    <span className="text-[10px] text-slate-400 font-bold ml-1">{`· ${p.unit}`}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="inline-flex items-center rounded-lg border border-slate-200">
                    <button onClick={() => setQty(p.id, l.qty - 1)} className="p-1.5 text-slate-500 hover:text-teal-800">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center text-[13px] font-black text-ink tabular-nums">{l.qty}</span>
                    <button onClick={() => setQty(p.id, l.qty + 1)} className="p-1.5 text-slate-500 hover:text-teal-800">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={() => remove(p.id)} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 sticky top-24 space-y-3">
            <p className="text-xs font-black text-ink uppercase tracking-widest">Order summary</p>
            <div className="flex justify-between text-[13px] font-medium text-slate-600">
              <span>Subtotal</span>
              <span className="font-black text-ink tabular-nums">{fmtNaira(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-medium text-slate-600">
              <span>CityDrive delivery</span>
              {deliveryFee ? <span className="font-black text-ink tabular-nums">{fmtNaira(deliveryFee)}</span> : <span className="text-emerald-600 font-bold">FREE</span>}
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-black text-ink">Total</span>
              <Money amount={total} className="text-xl" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Paid instantly with CityPay at checkout.</p>
            <Link
              href="/checkout"
              className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black transition-colors"
            >
              Checkout with CityPay <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/biz/calabar-fresh" className="block text-center text-[11px] font-bold text-slate-400 hover:text-teal-800 transition-colors">
              or add more from Calabar Fresh
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}