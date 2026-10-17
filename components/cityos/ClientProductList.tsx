'use client';

import { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal, ShoppingBag, Layers, Tag } from 'lucide-react';
import GlovoProductCard, { GlovoProductItem } from '@/components/cityos/delivery/GlovoProductCard';
import ChowdeckBasketDock from '@/components/cityos/delivery/ChowdeckBasketDock';
import { cn } from '@/lib/utils';

type PriceRangeId = 'all' | 'under-250k' | '250k-500k' | 'over-500k';

export default function ClientProductList({
  products,
  storeName = 'this store',
}: {
  products: any[];
  storeName?: string;
}) {
  const [activeAisle, setActiveAisle] = useState('All');
  const [activePriceRange, setActivePriceRange] = useState<PriceRangeId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');
  const [groupByAisle, setGroupByAisle] = useState(true);

  // Extract unique human-readable in-store aisles with counts
  const aisleTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const catLabel = (p.categoryName || p.globalCategory || 'General Goods').trim();
      counts.set(catLabel, (counts.get(catLabel) || 0) + 1);
    }
    const sorted = Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return [{ label: 'All', count: products.length }, ...sorted];
  }, [products]);

  // Determine whether high-ticket price range filters are relevant (e.g., electronics/appliances)
  const showPriceRangePills = useMemo(() => {
    return products.some((p) => (p.price || 0) >= 50000);
  }, [products]);

  const priceRanges: Array<{ id: PriceRangeId; label: string }> = [
    { id: 'all', label: 'All Budgets' },
    { id: 'under-250k', label: 'Under ₦250k' },
    { id: '250k-500k', label: '₦250k – ₦500k' },
    { id: 'over-500k', label: '₦500k+' },
  ];

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (activeAisle !== 'All') {
        const catLabel = (p.categoryName || p.globalCategory || 'General Goods').trim();
        if (catLabel !== activeAisle) return false;
      }
      if (activePriceRange !== 'all') {
        const price = p.price || 0;
        if (activePriceRange === 'under-250k' && price >= 250000) return false;
        if (activePriceRange === '250k-500k' && (price < 250000 || price > 500000)) return false;
        if (activePriceRange === 'over-500k' && price <= 500000) return false;
      }
      if (inStockOnly) {
        const hasStock = p.isWeighed || (typeof p.stockQuantity === 'number' ? p.stockQuantity > 0 : true);
        if (!hasStock) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        const matchCat = (p.categoryName || p.globalCategory || '').toLowerCase().includes(q);
        const matchBrand = (p.brand || '').toLowerCase().includes(q);
        const matchSpec = Array.isArray(p.specTags) && p.specTags.some((t: string) => t.toLowerCase().includes(q));
        return matchName || matchDesc || matchCat || matchBrand || matchSpec;
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return list;
  }, [products, activeAisle, activePriceRange, inStockOnly, searchQuery, sortBy]);

  // Group filtered products by aisle when showing all aisles in default sort
  const groupedSections = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of filtered) {
      const catLabel = (p.categoryName || p.globalCategory || 'General Goods').trim();
      const arr = map.get(catLabel) || [];
      arr.push(p);
      map.set(catLabel, arr);
    }
    return Array.from(map.entries())
      .map(([title, items]) => ({ title, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [filtered]);

  const shouldRenderGrouped =
    groupByAisle &&
    activeAisle === 'All' &&
    !searchQuery.trim() &&
    sortBy === 'popular' &&
    groupedSections.length > 1;

  return (
    <section className="space-y-5 pb-24">
      {/* Storefront Search & Controls Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              Shop Store Aisles
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {products.length} products across {Math.max(1, aisleTabs.length - 1)} categories · Tap an aisle or search by model/spec
            </p>
          </div>

          {/* Search Input inside Store */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search model, brand, spec in ${storeName}...`}
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Primary In-Store Aisle Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar pt-1 border-t border-slate-100">
          {aisleTabs.map((tab) => {
            const active = activeAisle === tab.label;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setActiveAisle(tab.label)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5',
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span>{tab.label === 'All' ? 'All Categories' : tab.label}</span>
                <span
                  className={cn(
                    'text-[10px] font-black px-1.5 py-0.2 rounded-full',
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Bar: Price Range Pills + View Mode + Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {showPriceRangePills ? (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider pr-1 shrink-0">
                <Tag className="w-3 h-3" /> Budget:
              </span>
              {priceRanges.map((pr) => {
                const active = activePriceRange === pr.id;
                return (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setActivePriceRange(pr.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0',
                      active
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {pr.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {aisleTabs.length > 2 && activeAisle === 'All' && (
              <button
                type="button"
                onClick={() => setGroupByAisle((v) => !v)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all inline-flex items-center gap-1',
                  groupByAisle
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                )}
              >
                <Layers className="w-3 h-3" />
                <span>Group by Category</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setInStockOnly((v) => !v)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all',
                inStockOnly
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              In Stock Only
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700">
              <SlidersHorizontal className="w-3 h-3 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort store products"
                className="bg-transparent focus:outline-none cursor-pointer font-bold text-slate-800"
              >
                <option value="popular">Sort: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Product Display: Categorized Department Sections OR Flat Grid */}
      {filtered.length > 0 ? (
        shouldRenderGrouped ? (
          <div className="space-y-8">
            {groupedSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <div className="flex items-center justify-between px-1 border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {section.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black">
                      {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveAisle(section.title)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
                  >
                    Filter this category →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {section.items.map((p: any) => (
                    <GlovoProductCard
                      key={p.id}
                      product={{
                        ...(p as GlovoProductItem),
                        storeName: p.storeName || storeName,
                        categoryName: p.categoryName || section.title,
                        globalCategory: p.globalCategory,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map((p: any) => (
              <GlovoProductCard
                key={p.id}
                product={{
                  ...(p as GlovoProductItem),
                  storeName: p.storeName || storeName,
                  categoryName: p.categoryName || p.globalCategory,
                  globalCategory: p.globalCategory,
                }}
              />
            ))}
          </div>
        )
      ) : (
        <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-2">
          <p className="text-sm font-bold text-slate-800">No matching products found</p>
          <p className="text-xs text-slate-500">
            Try clearing your search or switching to another category or budget filter.
          </p>
          {(searchQuery || activeAisle !== 'All' || activePriceRange !== 'all' || inStockOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveAisle('All');
                setActivePriceRange('all');
                setInStockOnly(false);
              }}
              className="mt-2 inline-flex items-center px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Reset Store Filters
            </button>
          )}
        </div>
      )}

      {/* Persistent Chowdeck Basket Dock */}
      <ChowdeckBasketDock />
    </section>
  );
}
