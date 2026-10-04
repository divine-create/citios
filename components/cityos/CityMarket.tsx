'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, ArrowRight, Loader2, Search } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { getCityMartProducts, getCityMartStores } from '@/app/actions/commerce';
import { useCity } from '@/components/cityos/CityProvider';
import { MarketSearch, ProductGrid, ProductCard, ProductRail, ShopCard, ErrorState, MarketBadge } from '@/components/market/MarketUI';
import { EmptyState } from '@/components/ui/EmptyState';
import { FallbackImg } from '@/components/cityos/CityUI';

const MARKET_CATS = ['All', 'Groceries', 'Food & Market', 'Fashion', 'Electronics', 'Books & Prints'];

export default function CityMarket() {
  const { city } = useCity();
  const cityName = city?.name ?? 'CityOS';
  const { fmt } = useMoney();
  const [cat, setCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Wait for 300ms debounce would be better here, but for now we fetch directly.
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

  // Client-side search filtering (since the backend doesn't support a search query parameter yet)
  const filteredProducts = products.filter(p => 
    searchQuery === '' || 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.storeName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-[80vh] bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-100">
      
      {/* HEADER & SEARCH */}
      <div className="mb-6 space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Marketplace</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Discover local products from verified shops in {cityName}
          </p>
        </div>
        <div className="max-w-xl">
          <MarketSearch 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Search for products or shops..." 
          />
        </div>
      </div>

      {/* CATEGORIES RAIL */}
      <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar snap-x">
        {MARKET_CATS.map((c) => (
          <button 
            key={c}
            onClick={() => { setCat(c); setSearchQuery(''); }}
            className={`shrink-0 snap-start px-4 py-2 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
              cat === c 
                ? 'bg-ink text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      {loading ? (
        <div className="flex flex-col items-center justify-center flex-grow py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-ink mb-4" />
          <p className="text-sm font-semibold animate-pulse">Discovering local goods...</p>
        </div>
      ) : (
        <div className="space-y-10 mt-2 flex-grow">
          
          {/* FEATURED SHOPS RAIL */}
          {stores.length > 0 && cat === 'All' && searchQuery === '' && (
            <ProductRail 
              title="Featured Shops" 
              action={<Link href="/explore" className="text-xs font-bold text-ink hover:underline">View all</Link>}
            >
              {stores.map((s) => (
                <ShopCard 
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  type={s.storeCategory || 'Store'}
                  href={`/org/${s.id}`}
                />
              ))}
            </ProductRail>
          )}

          {/* PRODUCTS GRID */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-black text-slate-900">
                {searchQuery ? 'Search Results' : cat === 'All' ? 'Popular Products' : `${cat} Products`}
              </h2>
              <span className="text-xs font-bold text-slate-400">{filteredProducts.length} items</span>
            </div>
            
            {filteredProducts.length === 0 ? (
              <EmptyState
                icon={<Search className="w-8 h-8" />}
                title={searchQuery ? 'No products found' : `No ${cat} products yet`}
                description={searchQuery ? 'Try adjusting your search terms.' : 'Check back later as local vendors add new items.'}
                action={searchQuery ? { label: 'Clear Search', onClick: () => setSearchQuery('') } : undefined}
                className="bg-slate-50 border border-slate-100 rounded-3xl"
              />
            ) : (
              <ProductGrid>
                {filteredProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    price={p.price}
                    compareAtPrice={p.compareAtPrice}
                    shopName={p.storeName}
                    image={p.imageAssetId ? `/api/assets/${p.imageAssetId}` : undefined}
                    inStock={p.isWeighed || (p.stockQuantity !== null && p.stockQuantity > 0)}
                    href={`/product/${p.id}`}
                  />
                ))}
              </ProductGrid>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
