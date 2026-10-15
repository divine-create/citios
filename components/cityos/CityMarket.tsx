'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Store, 
  ArrowRight, 
  Loader2, 
  Search, 
  ShoppingBag, 
  Apple, 
  Shirt, 
  Laptop, 
  BookOpen, 
  Sparkles,
  CheckCircle2,
  Clock,
  Star
} from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { getCityMartProducts, getCityMartStores } from '@/app/actions/commerce';
import { useCity } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import { FallbackImg } from '@/components/cityos/CityUI';
import InlineQuantityStepper from '@/components/cityos/InlineQuantityStepper';
import AirbnbSearchCapsule from '@/components/cityos/AirbnbSearchCapsule';
import { cn } from '@/lib/utils';

const AISLES = [
  { id: 'All', label: 'All Aisles', icon: ShoppingBag },
  { id: 'Groceries', label: 'Groceries & Pantry', icon: Apple },
  { id: 'Food & Market', label: 'Watt Market Produce', icon: Store },
  { id: 'Fashion', label: 'Fashion & Wear', icon: Shirt },
  { id: 'Electronics', label: 'Tech & Gadgets', icon: Laptop },
  { id: 'Books & Prints', label: 'Stationery & Books', icon: BookOpen },
];

export default function CityMarket() {
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';
  const { fmt } = useMoney();
  const { count, subtotal } = useCart();
  const [activeAisle, setActiveAisle] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [fetchedProducts, fetchedStores] = await Promise.all([
          getCityMartProducts(city?.slug, activeAisle),
          getCityMartStores(city?.slug),
        ]);
        setProducts(fetchedProducts);
        setStores(fetchedStores);
      } catch (err) {
        console.error('Failed to load market data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeAisle, city?.slug]);

  const filteredProducts = products.filter(
    (p) =>
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.storeName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-28">
      {/* Floating Capsule Search Bar */}
      <AirbnbSearchCapsule />

      {/* Header Info */}
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-black uppercase tracking-wider text-[#FF385C] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Supermarket & Quick Mart
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#222222] tracking-tight">
          Supermarkets & Stalls in {cityName}
        </h1>
        <p className="text-sm text-[#717171] font-medium">
          Fresh produce from Watt Market, supermarket groceries, and tech delivered in 30 - 45 mins.
        </p>
      </div>

      {/* Glovo Visual Aisle Navigation Rail */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar select-none">
        {AISLES.map((aisle) => {
          const Icon = aisle.icon;
          const isActive = activeAisle === aisle.id;
          return (
            <button
              key={aisle.id}
              type="button"
              onClick={() => {
                setActiveAisle(aisle.id);
                setSearchQuery('');
              }}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-[13px] font-bold transition-all shrink-0 border',
                isActive
                  ? 'border-[#222222] bg-[#222222] text-white shadow-sm'
                  : 'border-[#EBEBEB] bg-white text-[#717171] hover:border-neutral-400 hover:text-[#222222]'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-neutral-500')} />
              <span>{aisle.label}</span>
            </button>
          );
        })}
      </div>

      {/* Featured Stores & Supermarkets (Glovo store rail) */}
      {stores.length > 0 && activeAisle === 'All' && searchQuery === '' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-[#222222]">
              Top Supermarkets & Markets
            </h2>
            <Link
              href="/explore"
              className="text-xs font-bold text-[#717171] hover:text-[#222222] flex items-center gap-1 transition-colors"
            >
              <span>View all ({stores.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            {stores.slice(0, 8).map((store) => (
              <Link
                key={store.id}
                href={`/org/${store.id}`}
                className="group flex flex-col w-56 shrink-0 bg-white rounded-2xl border border-[#EBEBEB] p-3 shadow-xs hover:shadow-md hover:border-neutral-300 transition-all"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-100 mb-2.5">
                  <FallbackImg
                    src={store.image || store.storeCoverImage}
                    alt={store.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-black text-[#222222] shadow-xs flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#FF385C]" />
                    <span>{store.deliveryEta || '30 - 45 min'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-[14px] font-bold text-[#222222] truncate group-hover:text-[#FF385C] transition-colors">
                    {store.name}
                  </h3>
                  {store.rating && (
                    <div className="flex items-center gap-0.5 text-[11px] font-bold text-[#222222] shrink-0">
                      <Star className="w-3 h-3 fill-[#222222] text-[#222222]" />
                      <span>{store.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <p className="text-[12px] text-[#717171] truncate mt-0.5">
                  {store.neighborhood || 'Supermarket & Retail'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Products Catalog with Glovo Inline Stepper */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl font-black text-[#222222] tracking-tight">
              {searchQuery
                ? `Search results for "${searchQuery}"`
                : activeAisle === 'All'
                ? 'Popular supermarket essentials'
                : `${activeAisle} items`}
            </h2>
            <p className="text-xs text-[#717171] font-medium">
              Tap + to build your basket rapidly. Real-time courier dispatch.
            </p>
          </div>
          <span className="text-xs font-bold text-neutral-400">
            {filteredProducts.length} item{filteredProducts.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={n} className="flex flex-col gap-2 p-3 bg-white rounded-2xl border border-neutral-100">
                <div className="aspect-square w-full rounded-xl bg-neutral-200" />
                <div className="h-4 w-3/4 bg-neutral-200 rounded" />
                <div className="h-3 w-1/2 bg-neutral-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 p-12 text-center bg-white">
            <ShoppingBag className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
            <p className="text-base font-bold text-[#222222]">
              {searchQuery ? `No goods found matching "${searchQuery}"` : 'No products available in this aisle right now.'}
            </p>
            <p className="text-xs text-[#717171] mt-1">
              Try choosing another aisle or searching for a specific grocery item.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((p) => {
              const productImg = p.imageAssetId
                ? `/api/assets/${p.imageAssetId}`
                : p.imageUrl || undefined;

              return (
                <div
                  key={p.id}
                  className="group flex flex-col justify-between bg-white rounded-2xl border border-[#EBEBEB] p-3 shadow-xs hover:shadow-md hover:border-neutral-300 transition-all duration-200"
                >
                  <Link href={`/product/${p.id}`} className="block">
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-50 mb-2.5">
                      <FallbackImg
                        src={productImg}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate">
                        {p.storeName}
                      </span>
                      <h3 className="text-[13px] font-bold text-[#222222] leading-snug line-clamp-2 group-hover:text-[#FF385C] transition-colors">
                        {p.name}
                      </h3>
                    </div>
                  </Link>

                  {/* Price & Glovo Inline Stepper */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-1">
                    <span className="text-[14px] font-black text-[#222222]">
                      {fmt(p.price)}
                    </span>

                    <InlineQuantityStepper
                      product={{
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        image: productImg,
                        orgId: p.organizationId,
                        orgName: p.storeName,
                        kind: 'retail',
                      }}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Bottom Supermarket Basket Bar (Glovo style) */}
      {count > 0 && (
        <aside 
          aria-label="Supermarket Basket"
          className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-6 duration-300"
        >
          <Link
            href="/cart"
            className="flex items-center justify-between bg-[#222222] text-white p-3.5 px-5 rounded-full shadow-2xl hover:bg-black transition-all group border border-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#FF385C] text-white text-xs font-black flex items-center justify-center">
                {count}
              </span>
              <div>
                <p className="text-xs font-bold text-neutral-300 leading-none">Supermarket Basket</p>
                <p className="text-[14px] font-black text-white leading-tight mt-0.5">{fmt(subtotal)}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black text-[#FF385C] group-hover:translate-x-0.5 transition-transform">
              <span>View Basket</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </aside>
      )}
    </div>
  );
}
