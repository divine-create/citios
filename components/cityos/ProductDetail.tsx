'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Minus, Plus, ShoppingCart, Truck, ShieldCheck, BadgePercent, Check, ChevronRight, Loader2 } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { FallbackImg, Stars, Pill, VerifiedBadge,  PriceTag } from '@/components/cityos/CityUI';
import { useCart } from '@/components/cityos/CartStore';
import CityMismatchChip from '@/components/cityos/CityMismatchChip';
import { cn } from '@/lib/utils';
import { getCityMartProduct } from '@/app/actions/commerce';

export default function ProductDetail({ id }: { id: string }) {
  const { fmt } = useMoney();
  const router = useRouter();
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { add, count } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      const prod = await getCityMartProduct(id);
      setP(prod);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  }

  if (!p) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-3">
        <h1 className="text-lg font-black text-ink">Item unavailable</h1>
        <p className="text-sm text-slate-500">This item might be out of stock or removed by the seller.</p>
        <button onClick={() => router.back()} className="text-xs font-bold text-teal-700">Go back</button>
      </div>
    );
  }

  const handleAdd = () => {
    add({
      kind: 'retail',
      productId: p.id,
      name: p.name,
      price: p.price,
      qty,
      image: p.imageAssetId,
      orgId: p.organizationId,
      orgName: p.storeName
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const isOutOfStock = !p.isWeighed && (p.stockQuantity == null || p.stockQuantity <= 0);
  const isLowStock = !p.isWeighed && p.stockQuantity > 0 && p.stockQuantity <= 5;
  const maxQty = p.isWeighed ? 99 : Math.max(1, p.stockQuantity ?? 1);

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 animate-in fade-in duration-500">
      <div className="space-y-4">
        <div className="aspect-square w-full rounded-3xl overflow-hidden bg-slate-100 ring-1 ring-slate-200/50 relative">
          {p.imageAssetId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/assets/${p.imageAssetId}`} alt={p.name} className={cn("w-full h-full object-cover", isOutOfStock && "grayscale-[40%]")} />
          ) : (
            <FallbackImg alt={p.name} />
          )}
          {isOutOfStock && (
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-slate-900/90 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              Sold Out
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <Link href={`/org/${p.orgSlug}`} className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{p.storeName}</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-ink leading-tight">{p.name}</h1>
          <CityMismatchChip citySlug={p.citySlug} className="mt-1.5" />
          <div className="flex items-center gap-3 pt-1">
            <div className="text-2xl font-black text-teal-900">{fmt(p.price)}</div>
            {isOutOfStock ? (
              <Pill className="bg-slate-100 text-slate-500 border-0 text-[10px] font-bold">Out of Stock</Pill>
            ) : isLowStock ? (
              <Pill className="bg-amber-50 text-amber-800 border-0 text-[10px] font-bold">Only {p.stockQuantity} Left</Pill>
            ) : (
              <Pill className="bg-emerald-50 text-emerald-800 border-0 text-[10px] font-bold">
                In Stock {!p.isWeighed && p.stockQuantity ? `(${p.stockQuantity})` : ''}
              </Pill>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-700">Quantity</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 shrink-0">
              <button 
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 disabled:opacity-50"
                disabled={qty <= 1 || isOutOfStock}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-bold text-ink">{isOutOfStock ? 0 : qty}</span>
              <button 
                onClick={() => setQty(Math.min(maxQty, qty + 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 disabled:opacity-50"
                disabled={qty >= maxQty || isOutOfStock}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={cn(
                "flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all",
                isOutOfStock
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : added
                    ? "bg-emerald-500 text-white"
                    : "bg-teal-800 text-white hover:bg-teal-900 shadow-sm"
              )}
            >
              {isOutOfStock ? (
                "Sold Out"
              ) : added ? (
                <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Added to bag</span>
              ) : (
                <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Add {qty} to bag</span>
              )}
            </button>
          </div>
          {isOutOfStock && (
            <p className="text-[11px] text-slate-400 font-medium">
              This item is currently sold out in-store and online. Check back soon!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
