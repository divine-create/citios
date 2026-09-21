'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Pill, ChipButton } from '@/components/cityos/CityUI';
import { useMoney } from '@/components/cityos/CityProvider';

export default function ClientProductList({ products }: { products: any[] }) {
  const { fmt } = useMoney();
  const [cat, setCat] = useState('All');
  
  // Extract unique categories (using categoryId or globalCategory, or fallback)
  const categories = ['All', ...Array.from(new Set(products.map(p => p.categoryId || 'Uncategorized')))];
  
  const filtered = cat === 'All' ? products : products.filter(p => (p.categoryId || 'Uncategorized') === cat);

  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-black text-ink flex items-center gap-2">
          Products
          <span className="text-[11px] font-bold text-slate-400">{products.length} items in store</span>
        </h2>
        {categories.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <ChipButton key={c} active={cat === c} onClick={() => setCat(c)}>
                {c === 'Uncategorized' ? 'Other' : c}
              </ChipButton>
            ))}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p: any) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col justify-between">
            <div>
              {p.imageAssetId && (
                <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-slate-100">
                  <img src={`/api/assets/${p.imageAssetId}`} alt={p.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-black text-ink leading-snug">{p.name}</p>
                <Pill tone="blue">Product</Pill>
              </div>
              <p className="text-[12px] text-slate-500 font-medium mt-1 line-clamp-2">{p.description || 'No description provided.'}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-[13px] font-black text-teal-900">{fmt(p.price)}</span>
              <Link href={`/product/${p.id}`} className="text-[11px] font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1">
                View <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="py-10 text-center text-sm text-slate-500">No products found in this category.</div>
      )}
    </section>
  );
}
