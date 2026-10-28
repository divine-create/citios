'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Store,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  MapPin,
  SlidersHorizontal,
  Building2,
  LayoutGrid,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import { getCityMarketFeed } from '@/app/actions/commerce';
import ChowdeckDeliveryHeader, { DeliveryHubOption } from '@/components/cityos/delivery/ChowdeckDeliveryHeader';
import ChowdeckCategoryBubbles, { CategoryBubbleItem } from '@/components/cityos/delivery/ChowdeckCategoryBubbles';
import ChowdeckStoreCard, { StoreCardData } from '@/components/cityos/delivery/ChowdeckStoreCard';
import GlovoProductCard, { GlovoProductItem } from '@/components/cityos/delivery/GlovoProductCard';
import ChowdeckBasketDock from '@/components/cityos/delivery/ChowdeckBasketDock';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { CANONICAL_ECOMMERCE_CATEGORIES } from '@/lib/taxonomy/retail-categorizer';

const SECTION_PREVIEW_LIMIT = 10;

// Priority order for frontpage category shelves (the 9 core categories + universal Jumia/Jiji/Amazon departments)
const CATEGORY_PRIORITY_ORDER: string[] = CANONICAL_ECOMMERCE_CATEGORIES.map((c) => c.id);

function interleaveByStore(items: GlovoProductItem[]): GlovoProductItem[] {
  const byStore = new Map<string, GlovoProductItem[]>();
  for (const item of items) {
    const key = item.organizationId || item.storeName || 'default';
    if (!byStore.has(key)) byStore.set(key, []);
    byStore.get(key)!.push(item);
  }
  if (byStore.size <= 1) return items;

  const queues = Array.from(byStore.values());
  const result: GlovoProductItem[] = [];
  let added = true;
  let idx = 0;
  while (added) {
    added = false;
    for (const q of queues) {
      if (idx < q.length) {
        result.push(q[idx]);
        added = true;
      }
    }
    idx++;
  }
  return result;
}

export default function CityMarket() {
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';

  const [stores, setStores] = useState<StoreCardData[]>([]);
  const [products, setProducts] = useState<GlovoProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryBubbleItem[]>([]);
  const [storeSectors, setStoreSectors] = useState<CategoryBubbleItem[]>([]);
  const [deliveryHubs, setDeliveryHubs] = useState<DeliveryHubOption[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);
  const [topSearchTags, setTopSearchTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Instant Client-Side Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSector, setActiveSector] = useState('all');
  const [activeAisle, setActiveAisle] = useState('all');
  const [activeArea, setActiveArea] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');
  const [viewMode, setViewMode] = useState<'sections' | 'grid'>('sections');

  const handleSelectAisle = (aisleId: string) => {
    setActiveAisle(aisleId);
    if (typeof window !== 'undefined') {
      const el = document.getElementById('market-catalog-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const feed = await getCityMarketFeed(city?.slug, 'All');
        if (!active) return;
        setStores((feed.stores || []) as unknown as StoreCardData[]);
        setProducts((feed.products || []) as unknown as GlovoProductItem[]);
        if (feed.categories) setCategories(feed.categories as CategoryBubbleItem[]);
        if ((feed as any).storeSectors) setStoreSectors((feed as any).storeSectors as CategoryBubbleItem[]);
        if (feed.deliveryHubs) setDeliveryHubs(feed.deliveryHubs as DeliveryHubOption[]);
        if (feed.defaultAddress) setDefaultAddress(feed.defaultAddress);
        if (feed.topSearchTags) setTopSearchTags(feed.topSearchTags);
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
  }, [city?.slug]);

  // Derive distinct areas/neighborhoods from stores and products
  const areaPills = useMemo(() => {
    const areaSet = new Set<string>();
    for (const s of stores) {
      const a = (s.area || s.neighborhood || '').trim();
      if (a && a.toLowerCase() !== cityName.toLowerCase()) {
        areaSet.add(a);
      }
    }
    for (const p of products) {
      const a = (p.area || p.neighborhood || '').trim();
      if (a && a.toLowerCase() !== cityName.toLowerCase()) {
        areaSet.add(a);
      }
    }
    return ['all', ...Array.from(areaSet)];
  }, [stores, products, cityName]);

  // Filter stores by sector, area, aisle, and search
  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      if (activeSector !== 'all') {
        const sCatSlug = (s.storeCategory || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (sCatSlug !== activeSector) return false;
      }
      if (activeArea !== 'all') {
        const storeArea = (s.area || s.neighborhood || '').toLowerCase();
        if (!storeArea.includes(activeArea.toLowerCase())) return false;
      }
      if (activeAisle !== 'all') {
        const aisleSlug = activeAisle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const sCat = (s.storeCategory || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const hasAisleProduct = products.some(
          (p) =>
            p.organizationId === s.id &&
            (((p as any).categoryName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === aisleSlug ||
              (p.globalCategory || p.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === aisleSlug ||
              (p.storeCategory || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === aisleSlug)
        );
        if (sCat !== aisleSlug && !hasAisleProduct) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchStore = s.name.toLowerCase().includes(q);
        const matchArea = (s.area || s.neighborhood || '').toLowerCase().includes(q);
        const matchCat = (s.storeCategory || '').toLowerCase().includes(q);
        return matchStore || matchArea || matchCat;
      }
      return true;
    });
  }, [stores, products, activeSector, activeArea, activeAisle, searchQuery]);

  // Client-side filtering across products (sector, aisle, area, stock, search, sort)
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      if (activeSector !== 'all') {
        const sCatSlug = (p.storeCategory || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (sCatSlug !== activeSector) return false;
      }
      if (activeAisle !== 'all') {
        const aisleSlug = activeAisle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const aCat = ((p as any).categoryName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const pCat = (p.globalCategory || p.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const sCat = (p.storeCategory || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (aCat !== aisleSlug && pCat !== aisleSlug && sCat !== aisleSlug) return false;
      }
      if (activeArea !== 'all') {
        const prodArea = (p.area || p.neighborhood || '').toLowerCase();
        if (!prodArea.includes(activeArea.toLowerCase())) return false;
      }
      if (inStockOnly) {
        const hasStock = p.isWeighed || (typeof p.stockQuantity === 'number' ? p.stockQuantity > 0 : true);
        if (!hasStock) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchStore = p.storeName?.toLowerCase().includes(q);
        const matchCat = ((p as any).categoryName || p.globalCategory || p.category || '').toLowerCase().includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        const matchSpec = Array.isArray(p.specTags) && p.specTags.some((t) => t.toLowerCase().includes(q));
        return matchName || matchStore || matchCat || matchBrand || matchSpec;
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return list;
  }, [products, activeSector, activeAisle, activeArea, inStockOnly, searchQuery, sortBy]);

  // Group filteredProducts into the 9 Canonical Category Sections when browsing "All Goods"
  const categorizedSections = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        label: string;
        items: GlovoProductItem[];
        storeNames: Set<string>;
      }
    >();

    for (const p of filteredProducts) {
      const rawLabel = (
        p.globalCategory ||
        (p as any).categoryName ||
        p.category ||
        'General Goods'
      ).trim();
      const id = rawLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (!map.has(id)) {
        map.set(id, { id, label: rawLabel, items: [], storeNames: new Set() });
      }
      const group = map.get(id)!;
      group.items.push(p);
      if (p.storeName) group.storeNames.add(p.storeName);
    }

    const sections = Array.from(map.values()).map((sec) => {
      const orderedItems = sortBy === 'popular' ? interleaveByStore(sec.items) : sec.items;
      return {
        id: sec.id,
        label: sec.label,
        totalCount: orderedItems.length,
        previewItems: orderedItems.slice(0, SECTION_PREVIEW_LIMIT),
        storeNames: Array.from(sec.storeNames),
      };
    });

    sections.sort((a, b) => {
      const idxA = CATEGORY_PRIORITY_ORDER.indexOf(a.id);
      const idxB = CATEGORY_PRIORITY_ORDER.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.totalCount - a.totalCount;
    });

    return sections;
  }, [filteredProducts, sortBy]);

  const showSectionedView =
    activeAisle === 'all' && !searchQuery.trim() && viewMode === 'sections' && categorizedSections.length > 1;

  const hasActiveFilters =
    activeSector !== 'all' ||
    activeAisle !== 'all' ||
    activeArea !== 'all' ||
    inStockOnly ||
    Boolean(searchQuery.trim());

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-32">
      {/* 1. Location & Search Header */}
      <ChowdeckDeliveryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder={`Search shops, laptops, gadgets & goods in ${cityName}...`}
        trendingTags={topSearchTags}
        onSelectTag={(tag) => setSearchQuery(tag)}
        vertical="market"
        deliveryHubs={deliveryHubs}
        defaultAddress={defaultAddress}
      />

      {/* WhatsApp Checkout Note */}
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <p className="text-emerald-950 text-xs font-semibold truncate">
            <strong className="font-extrabold text-emerald-900">Direct WhatsApp Orders:</strong> Every checkout routes to WhatsApp via <span className="font-extrabold text-emerald-800">+2348065373747</span>
          </p>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wider font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
          Instant Dispatch
        </span>
      </div>

      {/* 2. Shop Sectors & Product Categories */}
      <section className="space-y-3">
        {/* Shop Sectors Bar */}
        {storeSectors.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider pr-1 shrink-0">
              <Building2 className="w-3.5 h-3.5" /> Shop Sector:
            </span>
            {storeSectors.map((sector) => {
              const isActive = activeSector === sector.id;
              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => {
                    setActiveSector(sector.id);
                    setActiveAisle('all');
                  }}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5',
                    isActive
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  )}
                >
                  <span>{sector.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Product Categories / Aisles */}
        {categories.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Product Categories
              </h3>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSector('all');
                    setActiveAisle('all');
                    setActiveArea('all');
                    setInStockOnly(false);
                    setSearchQuery('');
                  }}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            <ChowdeckCategoryBubbles
              categories={categories}
              activeCategoryId={activeAisle}
              onSelectCategory={(id) => setActiveAisle(id)}
            />
          </div>
        )}

        {/* Area / Neighborhood Filter Pills */}
        {areaPills.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 -mx-1 px-1 no-scrollbar">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider pr-1 shrink-0">
              <MapPin className="w-3 h-3" /> Area:
            </span>
            {areaPills.map((area) => {
              const isActive = activeArea === area;
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => setActiveArea(area)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 border',
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {area === 'all' ? `All ${cityName}` : area}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Partner Stores Horizontal Rail */}
      {filteredStores.length > 0 && (
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-600" />
                Verified Shops & Stores
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tap a shop to browse its categorized aisles in {activeArea === 'all' ? cityName : activeArea}
              </p>
            </div>
            <Link
              href="/explore?cat=Retail"
              className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar snap-x">
            {filteredStores.map((store) => (
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

      {/* 4. MAIN PRODUCTS CATALOG */}
      <section id="market-catalog-section" className="space-y-6 pt-1 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex flex-col gap-1">
            {activeAisle !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveAisle('all')}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 w-fit"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to All Categories
              </button>
            )}
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : activeAisle === 'all'
                ? `All Products in ${activeArea === 'all' ? cityName : activeArea}`
                : `${categories.find((c) => c.id === activeAisle)?.label || 'Selected Category'}`}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {showSectionedView
                ? 'Explore products organized by category'
                : 'Browse available products'}
            </p>
          </div>

          {/* View Mode, Stock & Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {activeAisle === 'all' && !searchQuery.trim() && (
              <div className="inline-flex items-center rounded-full bg-slate-100 p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('sections')}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all',
                    viewMode === 'sections'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Sections
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all',
                    viewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  All Grid
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setInStockOnly((v) => !v)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                inStockOnly
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              In Stock Only
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort products"
                className="bg-transparent focus:outline-none cursor-pointer font-bold text-slate-800"
              >
                <option value="popular">Sort: Popular</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
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
              title={`No items found in ${activeArea === 'all' ? cityName : activeArea}`}
              description={
                searchQuery
                  ? 'Try searching for another product name, brand, or specification.'
                  : 'Reset your category or area filters to view all available products.'
              }
            />
          </div>
        ) : showSectionedView ? (
          <div className="space-y-10">
            {categorizedSections.map((section) => (
              <div
                key={section.id}
                className="space-y-4 rounded-3xl bg-white/70 border border-slate-200/80 p-4 sm:p-5 shadow-2xs"
              >
                {/* Section Header */}
                <div className="flex items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                        {section.label}
                      </h3>
                    </div>
                    {section.storeNames.length > 0 && (
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Available at {section.storeNames.join(' · ')}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectAisle(section.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shrink-0"
                  >
                    <span>View all</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Top 10 Products in this Section */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                  {section.previewItems.map((product) => (
                    <GlovoProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Section Footer CTA to View All */}
                {section.totalCount > SECTION_PREVIEW_LIMIT && (
                  <div className="pt-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleSelectAisle(section.id)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200/80 hover:border-emerald-300 text-xs font-extrabold transition-all"
                    >
                      <span>View all in {section.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {filteredProducts.map((product) => (
              <GlovoProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 5. Persistent Floating Checkout Dock */}
      <ChowdeckBasketDock label="Checkout" />
    </div>
  );
}
