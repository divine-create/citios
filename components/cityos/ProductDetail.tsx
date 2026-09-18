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

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 animate-in fade-in duration-500">
      <div className="space-y-4">
        <div className="aspect-square w-full rounded-3xl overflow-hidden bg-slate-100 ring-1 ring-slate-200/50 relative">
          {p.imageAssetId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/assets/${p.imageAssetId}`} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <FallbackImg alt={p.name} />
          )}
          <div className="absolute top-4 right-4">
            <Pill className="bg-white/90 backdrop-blur text-ink border-0 shadow-sm">
              <Stars rating={4.5} />
            </Pill>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <Link href={`/org/${p.orgSlug}`} className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{p.storeName}</span>
            <VerifiedBadge />
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-ink leading-tight">{p.name}</h1>
          <CityMismatchChip citySlug={p.citySlug} className="mt-1.5" />
          <div className="flex items-center gap-3 pt-1">
            <div className="text-2xl font-black text-teal-900">{fmt(p.price)}</div>
            <Pill className="bg-emerald-50 text-emerald-800 border-0 text-[10px]">In Stock</Pill>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-700">Quantity</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 shrink-0">
              <button 
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 disabled:opacity-50"
                disabled={qty <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-bold text-ink">{qty}</span>
              <button 
                onClick={() => setQty(qty + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={handleAdd}
              className={cn(
                "flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all",
                added ? "bg-emerald-500 text-white" : "bg-teal-800 text-white hover:bg-teal-900"
              )}
            >
              {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
              {added ? "Added to bag" : `Add ${qty} to bag`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
