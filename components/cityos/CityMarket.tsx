'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Store, 
  ArrowRight, 
  ShoppingBag, 
  Sparkles, 
  Clock, 
  Star, 
  SlidersHorizontal,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { useMoney, useCity } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import { getCityMarketFeed } from '@/app/actions/commerce';
import ChowdeckDeliveryHeader from '@/components/cityos/delivery/ChowdeckDeliveryHeader';
import ChowdeckHeroCarousel from '@/components/cityos/delivery/ChowdeckHeroCarousel';
import ChowdeckCategoryBubbles, { MARKET_CATEGORY_BUBBLES } from '@/components/cityos/delivery/ChowdeckCategoryBubbles';
import ChowdeckStoreCard, { StoreCardData } from '@/components/cityos/delivery/ChowdeckStoreCard';
import GlovoProductCard, { GlovoProductItem } from '@/components/cityos/delivery/GlovoProductCard';
import ChowdeckBasketDock from '@/components/cityos/delivery/ChowdeckBasketDock';
import { StorefrontCampaign } from '@/lib/actions/storefront-management';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

export default function CityMarket() {
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';
  const { fmt } = useMoney();
  const { count } = useCart();

  const [stores, setStores] = useState<StoreCardData[]>([]);
  const [products, setProducts] = useState<GlovoProductItem[]>([]);
  const [campaigns, setCampaigns] = useState<StorefrontCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAisle, setActiveAisle] = useState('All');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const feed = await getCityMarketFeed(city?.slug, activeAisle);
        if (!active) return;
        setStores((feed.stores || []) as unknown as StoreCardData[]);
        setProducts((feed.products || []) as unknown as GlovoProductItem[]);
        if (feed.campaigns) setCampaigns(feed.campaigns as StorefrontCampaign[]);
      } catch (err) {
        console.error('Failed to load market storefront feed', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [activeAisle, city?.slug]);

  // Client-side search filtering across products and stores
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchStore = p.storeName?.toLowerCase().includes(q);
      const matchCat = p.globalCategory?.toLowerCase().includes(q);
      return matchName || matchStore || matchCat;
    });
  }, [products, searchQuery]);

  // Flash deals / essential staples (for horizontal quick-commerce rail)
  const flashDeals = useMemo(() => {
    return products.slice(0, 10);
  }, [products]);

  // Dynamically compute trending tags from real products and store aisles
  const trendingTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach((p) => {
      if (p.name) tags.add(p.name);
    });
    stores.forEach((s) => {
      s.aisles?.forEach((a) => tags.add(a));
    });
    return Array.from(tags).slice(0, 6);
  }, [products, stores]);

  return (
    <div className="space-y-7 animate-in fade-in duration-500 pb-32">
      {/* 1. Chowdeck Delivery Header with Address Selector & Mode Switcher */}
      <ChowdeckDeliveryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder={`Search supermarket groceries and market produce in ${cityName}...`}
        trendingTags={trendingTags}
        onSelectTag={(tag) => setSearchQuery(tag)}
        vertical="market"
      />

      {/* 2. Hero Promotional Carousel */}
      {!searchQuery && campaigns.length > 0 && (
        <ChowdeckHeroCarousel campaigns={campaigns} />
      )}

      {/* 3. Glovo Circular Aisle Bubbles */}
      {!searchQuery && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Explore Supermarkets & Aisles
            </h3>
            {activeAisle !== 'All' && (
              <button
                type="button"
                onClick={() => setActiveAisle('All')}
                className="text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                Reset to All
              </button>
            )}
          </div>

          <ChowdeckCategoryBubbles
            categories={MARKET_CATEGORY_BUBBLES}
            activeCategoryId={activeAisle}
            onSelectCategory={(id) => {
              setActiveAisle(id);
            }}
          />
        </section>
      )}

      {/* 4. Partner Supermarkets & Watt Market Stalls Horizontal Rail */}
      {!searchQuery && activeAisle === 'All' && stores.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-600" />
                Top Supermarkets & Markets in {cityName}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Verified supermarket partners with shelf-price guarantee
              </p>
            </div>
            <Link
              href="/explore"
              className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              <span>View all ({stores.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar snap-x">
            {stores.map((store) => (
              <div key={store.id} className="w-72 sm:w-80 shrink-0 snap-start">
                <ChowdeckStoreCard
                  store={{
                    ...store,
                    href: `/org/${store.id}`,
                  }}
                  aspectRatio="16/9"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. QUICK-COMMERCE RAIL: Pantry Essentials (With Instant Inline Steppers) */}
      {!searchQuery && activeAisle === 'All' && flashDeals.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Popular Supermarket Essentials
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tap + to rapidly build your grocery basket in seconds
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 overflow-x-auto pb-3 -mx-1 px-1 no-scrollbar snap-x">
            {flashDeals.map((prod) => (
              <div key={prod.id} className="w-44 sm:w-48 shrink-0 snap-start">
                <GlovoProductCard product={prod} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. MAIN PRODUCTS CATALOG: Multi-Aisle Grid with Instant Steppers */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : activeAisle === 'All'
                ? `All Supermarket Goods in ${cityName}`
                : `${activeAisle} Items`}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {filteredProducts.length} item{filteredProducts.length === 1 ? '' : 's'} available for delivery
            </p>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={n} className="flex flex-col gap-2 p-3 bg-white rounded-3xl border border-slate-100">
                <div className="aspect-square w-full rounded-2xl bg-slate-200" />
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/2 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<ShoppingBag className="w-8 h-8 text-emerald-500" />}
              title={`No items found in this aisle in ${cityName}`}
              description={searchQuery ? 'Try searching for generic terms like rice, oil, soap or bread.' : "Select 'All Aisles' to view all available products."}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {filteredProducts.map((product) => (
              <GlovoProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 7. Persistent Floating Grocery Basket Dock */}
      <ChowdeckBasketDock label="View Grocery Basket" />
    </div>
  );
}
