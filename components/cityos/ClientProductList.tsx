'use client';

import { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal, ShoppingBag } from 'lucide-react';
import GlovoProductCard, { GlovoProductItem } from '@/components/cityos/delivery/GlovoProductCard';
import ChowdeckBasketDock from '@/components/cityos/delivery/ChowdeckBasketDock';
import { cn } from '@/lib/utils';

export default function ClientProductList({
  products,
  storeName = 'this store',
}: {
  products: any[];
  storeName?: string;
}) {
  const [activeAisle, setActiveAisle] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc'>('popular');

  // Extract unique human-readable categories with counts
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

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (activeAisle !== 'All') {
        const catLabel = (p.categoryName || p.globalCategory || 'General Goods').trim();
        if (catLabel !== activeAisle) return false;
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
        return matchName || matchDesc || matchCat;
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return list;
  }, [products, activeAisle, inStockOnly, searchQuery, sortBy]);

  return (
    <section className="space-y-4 pb-24">
      {/* Storefront Search & Controls Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              Shop Store Aisles
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {products.length} items available · Add items directly to your basket
            </p>
          </div>

          {/* Search Input inside Store */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search inside ${storeName}...`}
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

        {/* Aisle Filter Pills + Sort Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
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
                  <span>{tab.label === 'All' ? 'All Aisles' : tab.label}</span>
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

          <div className="flex items-center gap-2 shrink-0">
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
                <option value="popular">Sort: Popular</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* High-Density Glovo Product Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map((p: any) => (
            <GlovoProductCard
              key={p.id}
              product={{
                ...(p as GlovoProductItem),
                storeName: p.storeName || storeName,
                globalCategory: p.categoryName || p.globalCategory,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-2">
          <p className="text-sm font-bold text-slate-800">No matching products found</p>
          <p className="text-xs text-slate-500">
            Try clearing your search or switching to another aisle.
          </p>
          {(searchQuery || activeAisle !== 'All' || inStockOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveAisle('All');
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
