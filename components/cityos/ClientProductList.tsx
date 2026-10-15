'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Pill, ChipButton } from '@/components/cityos/CityUI';
import { useMoney } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import InlineQuantityStepper from '@/components/cityos/InlineQuantityStepper';

export default function ClientProductList({ products }: { products: any[] }) {
  const { fmt } = useMoney();
  const { count, subtotal } = useCart();
  const [cat, setCat] = useState('All');
  
  // Extract unique categories (using categoryId or globalCategory, or fallback)
  const categories = ['All', ...Array.from(new Set(products.map(p => p.categoryId || 'Uncategorized')))];
  
  const filtered = cat === 'All' ? products : products.filter(p => (p.categoryId || 'Uncategorized') === cat);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-black text-[#222222] flex items-center gap-2">
            Store Products
          </h2>
          <p className="text-xs text-[#717171]">{products.length} items in stock · Instant dispatch</p>
        </div>
        {categories.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {categories.map((c) => (
              <ChipButton key={c} active={cat === c} onClick={() => setCat(c)}>
                {c === 'Uncategorized' ? 'Other' : c}
              </ChipButton>
            ))}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p: any) => {
          const productImg = p.imageAssetId
            ? `/api/assets/${p.imageAssetId}`
            : p.imageUrl || undefined;

          return (
            <div key={p.id} className="bg-white rounded-2xl border border-[#EBEBEB] p-4 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-neutral-300 transition-all">
              <Link href={`/product/${p.id}`} className="block group">
                {productImg && (
                  <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-neutral-100">
                    <img src={productImg} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[14px] font-bold text-[#222222] leading-snug group-hover:text-[#FF385C] transition-colors">{p.name}</h3>
                </div>
                <p className="text-[12px] text-[#717171] font-normal mt-1 line-clamp-2">{p.description || 'Verified in-store inventory.'}</p>
              </Link>
              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                <span className="text-[15px] font-black text-[#222222]">{fmt(p.price)}</span>
                
                <div className="flex items-center gap-2">
                  <InlineQuantityStepper
                    product={{
                      id: p.id,
                      name: p.name,
                      price: p.price,
                      image: productImg,
                      orgId: p.organizationId,
                      kind: 'retail',
                    }}
                    size="sm"
                  />
                  <Link href={`/product/${p.id}`} className="text-[11px] font-bold text-neutral-400 hover:text-[#222222] flex items-center gap-0.5 ml-1">
                    Details <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-10 text-center text-sm text-[#717171] bg-white rounded-2xl border border-dashed border-neutral-300">
          No products found in this category.
        </div>
      )}

      {/* Floating Bottom Basket Bar for Store Profile */}
      {count > 0 && (
        <aside 
          aria-label="Store Basket"
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
                <p className="text-xs font-bold text-neutral-300 leading-none">Your Basket</p>
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
    </section>
  );
}
