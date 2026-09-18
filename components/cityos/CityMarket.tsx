'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, ArrowRight, Loader2 } from 'lucide-react';
import { fmtNaira } from '@/lib/format';
import { CityCard, FallbackImg, Stars, LocationRow, OpenBadge, ChipButton, DemoBanner } from '@/components/cityos/CityUI';
import { getCityMartProducts, getCityMartStores } from '@/app/actions/commerce';
import { useCity } from '@/components/cityos/CityProvider';

const MARKET_CATS = ['All', 'Groceries', 'Food & Market', 'Fashion', 'Electronics', 'Books & Prints'];

export default function CityMarket() {
  const { city } = useCity();
  const [cat, setCat] = useState('All');
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [fetchedProducts, fetchedStores] = await Promise.all([
        getCityMartProducts(city?.slug, cat),
        getCityMartStores(city?.slug)
      ]);
      setProducts(fetchedProducts);
      setStores(fetchedStores);
      setLoading(false);
    }
    load();
  }, [cat, city?.slug]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Market</h1>
        <p className="text-xs text-slate-500 font-medium">
          Shop the city — marketplaces, stalls and stores sold through CityOS.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
        {MARKET_CATS.map((c) => (
          <ChipButton key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </ChipButton>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Featured Products</h2>
            </div>
            
            {products.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No products found for this category.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {products.map((p) => (
                  <Link key={p.id} href={`/product/${p.id}`} className="group flex flex-col gap-2 relative">
                    <div className="aspect-[4/5] w-full rounded-2xl overflow-hidden bg-slate-100 ring-1 ring-slate-200/50">
                      {p.imageAssetId ? (
                         // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/assets/${p.imageAssetId}`} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <FallbackImg alt={p.name} />
                      )}
                    </div>
                    <div className="space-y-0.5 px-1">
                      <div className="flex items-center gap-1.5 opacity-80">
                        <Store className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider line-clamp-1">{p.storeName}</span>
                      </div>
                      <h3 className="text-xs font-bold text-ink leading-tight line-clamp-2">{p.name}</h3>
                      <div className="text-sm font-black text-teal-900 pt-0.5">{fmtNaira(p.price)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Participating Stores</h2>
              <Link href="/explore" className="text-xs font-bold text-teal-700 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-4 -mx-1 px-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
              {stores.map((s) => (
                <Link key={s.id} href={`/org/${s.id}`} className="snap-start shrink-0 w-64 block">
                  <CityCard>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 ring-1 ring-slate-200/50 flex items-center justify-center">
                        <Store className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-ink text-sm leading-tight line-clamp-1">{s.name}</h3>
                        <p className="text-xs text-slate-500 font-medium line-clamp-1">{s.storeCategory || 'Store'}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <Stars rating={4} />
                          <span className="text-[10px] font-bold text-slate-400">4.0</span>
                        </div>
                      </div>
                    </div>
                  </CityCard>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
