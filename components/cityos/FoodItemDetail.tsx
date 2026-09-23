'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Minus, Plus, ShoppingCart, ArrowLeft, Loader2 } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { FallbackImg, PriceTag } from '@/components/cityos/CityUI';
import { useCart } from '@/components/cityos/CartStore';
import { getCityFoodMenuItem } from '@/app/actions/food';

export default function FoodItemDetail({ id }: { id: string }) {
  const { fmt } = useMoney();
  const router = useRouter();
  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { add, count } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      const prod = await getCityFoodMenuItem(id);
      setM(prod);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!m) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">Menu item not found.</p>
        <Link href="/food" className="mt-4 text-orange-600 font-bold inline-block">Return to CityFood</Link>
      </div>
    );
  }

  const handleAdd = () => {
    add({
      kind: 'food',
      productId: m.id,
      name: m.name,
      price: m.price,
      qty: qty,
      orgId: m.org?.id || 'unknown',
      orgName: m.org?.name || 'Restaurant'
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href={`/food/${m.org?.id}`} className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-500 hover:text-ink transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to {m.org?.name || 'Menu'}
      </Link>
      
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
        <div className="aspect-[4/3] w-full relative bg-slate-100">
          <FallbackImg 
            src={m.imageUrl} 
            alt={m.name}
            className="w-full h-full object-cover"
            icon={<span className="text-6xl font-black text-slate-300">{m.name.slice(0,1)}</span>}
          />
        </div>
        
        <div className="p-6 md:p-8 space-y-8">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-ink leading-tight">{m.name}</h1>
                <p className="text-sm text-slate-500 mt-1.5 font-medium">{m.org?.name}</p>
              </div>
              <div className="shrink-0">
                <PriceTag amount={m.price} />
              </div>
            </div>
            
            {m.description && (
              <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl">{m.description}</p>
            )}
          </div>
          
          <div className="pt-6 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl w-fit">
                <button 
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-10 rounded-xl bg-white text-slate-600 shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-50"
                  disabled={qty <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-black text-lg">{qty}</span>
                <button 
                  onClick={() => setQty(qty + 1)}
                  className="w-10 h-10 rounded-xl bg-white text-slate-600 shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 flex gap-3">
                <button
                  onClick={handleAdd}
                  disabled={!m.isAvailable}
                  className="flex-1 py-4 px-6 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] transition-all text-white font-black rounded-2xl shadow-md shadow-orange-900/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                >
                  {added ? (
                    'Added to Order'
                  ) : !m.isAvailable ? (
                    'Unavailable'
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add to Order - {fmt(m.price * qty)}
                    </>
                  )}
                </button>
                <Link href="/cart" className="relative shrink-0 flex items-center justify-center w-14 h-14 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors">
                  <ShoppingCart className="w-5 h-5" />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                      {count}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
