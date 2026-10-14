'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Truck, ShieldCheck, BadgePercent, Check, ChevronLeft, Loader2, Store } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import CityMismatchChip from '@/components/cityos/CityMismatchChip';
import { cn } from '@/lib/utils';
import { getCityMartProduct } from '@/app/actions/commerce';
import { QuantitySelector, VariantSelector, MarketBadge, ErrorState } from '@/components/market/MarketUI';
import { FallbackImg } from '@/components/cityos/CityUI';

export default function ProductDetail({ id }: { id: string }) {
  const { fmt } = useMoney();
  const router = useRouter();
  const [p, setP] = useState<any>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const { add, count } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const prod = await getCityMartProduct(id);
        setP(prod);
        if (prod && prod.variants && prod.variants.length > 0) {
          // Select first available variant, or just the first one
          const available = prod.variants.find((v:any) => v.stockQuantity > 0 || prod.isWeighed);
          setSelectedVariantId((available || prod.variants[0]).id as string);
        }
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-ink mb-4" />
      </div>
    );
  }

  if (error || !p) {
    return (
      <div className="max-w-md mx-auto pt-10">
        <ErrorState 
          title="Product Unavailable" 
          message="This item might be out of stock, removed by the seller, or there was a network issue."
          retry={() => router.back()}
        />
      </div>
    );
  }

  const hasVariants = p?.variants?.length > 0;
  const activeProduct = hasVariants ? (p.variants.find((v:any) => v.id === selectedVariantId) || p.variants[0]) : p;
  
  const isOutOfStock = !p.isWeighed && (activeProduct.stockQuantity == null || activeProduct.stockQuantity <= 0);
  const discount = activeProduct.compareAtPrice && activeProduct.compareAtPrice > activeProduct.price 
    ? Math.round(((activeProduct.compareAtPrice - activeProduct.price) / activeProduct.compareAtPrice) * 100) 
    : 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    
    add({
      kind: 'retail',
      productId: activeProduct.id, // For Retail, the cart expects the authoritative ID (which might be the variant ID or product ID depending on the backend, assuming variant ID here if variants exist)
      name: hasVariants ? `${p.name} - ${activeProduct.variantName}` : p.name,
      price: activeProduct.price,
      qty,
      image: p.imageAssetId,
      orgId: p.organizationId,
       
      orgName: p.storeName || 'Store'
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    handleAdd();
    router.push('/cart');
  };

  const variantOptions = hasVariants ? p.variants.map((v:any) => ({
    id: v.id,
    name: v.variantName,
    available: p.isWeighed || (v.stockQuantity !== null && v.stockQuantity > 0),
    price: v.price
  })) : [];

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
      
      {/* Mobile Back Header */}
      <div className="md:hidden flex items-center p-4 border-b border-slate-100">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-500 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-bold text-slate-800 ml-2 truncate">Product Details</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
        
        {/* IMAGE SECTION */}
        <div className="relative aspect-square md:aspect-auto md:h-full bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100">
          <FallbackImg 
            src={p.imageAssetId ? `/api/assets/${p.imageAssetId}` : undefined} 
            alt={p.name} 
            className="w-full h-full object-cover"
          />
          {discount > 0 && (
            <div className="absolute top-4 left-4">
              <MarketBadge variant="danger" className="px-3 py-1 text-xs">-{discount}% OFF</MarketBadge>
            </div>
          )}
          <div className="absolute top-4 right-4 md:hidden">
            <CityMismatchChip />
          </div>
        </div>

        {/* DETAILS SECTION */}
        <div className="p-6 md:p-10 flex flex-col">
          
          <div className="hidden md:block mb-4">
            <button onClick={() => router.back()} className="text-sm font-bold text-slate-400 hover:text-ink inline-flex items-center">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Market
            </button>
          </div>

          <div className="space-y-1 mb-6">
            <Link href={`/org/${p.organizationId}`} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 hover:text-teal-900 transition-colors">
              <Store className="w-3.5 h-3.5" />
              {p.storeName}
            </Link>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">{p.name}</h1>
          </div>
          
          {/* PRICE BLOCK */}
          <div className="flex items-end gap-3 mb-8">
            <span className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              {fmt(activeProduct.price)}
            </span>
            {activeProduct.compareAtPrice && activeProduct.compareAtPrice > activeProduct.price && (
              <span className="text-lg font-bold text-slate-400 line-through mb-1">
                {fmt(activeProduct.compareAtPrice)}
              </span>
            )}
          </div>

          {/* VARIANTS */}
          {hasVariants && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Select Option</h3>
              <VariantSelector 
                options={variantOptions}
                selectedId={selectedVariantId!}
                onChange={setSelectedVariantId}
              />
            </div>
          )}

          {/* DESCRIPTION */}
          {p.description && (
            <div className="mb-8 prose prose-sm prose-slate max-w-none">
              <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wider">About this item</h3>
              <p className="text-slate-600 leading-relaxed">{p.description}</p>
            </div>
          )}

          {/* ACTION AREA */}
          <div className="mt-auto pt-6 border-t border-slate-100">
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isOutOfStock ? (
                  <MarketBadge variant="danger">Out of Stock</MarketBadge>
                ) : (
                  <MarketBadge variant="success">In Stock</MarketBadge>
                )}
                {!p.isWeighed && activeProduct.stockQuantity > 0 && activeProduct.stockQuantity <= 5 && (
                  <span className="text-xs font-semibold text-amber-600">Only {activeProduct.stockQuantity} left</span>
                )}
              </div>
              {!isOutOfStock && (
                <QuantitySelector 
                  value={qty} 
                  onChange={setQty} 
                  max={p.isWeighed ? 99 : activeProduct.stockQuantity} 
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={isOutOfStock}
                onClick={handleAdd}
                className={cn(
                  "flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  added 
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500" 
                    : isOutOfStock
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-900"
                )}
              >
                {added ? (
                  <><Check className="w-5 h-5" /> Added to Cart</>
                ) : (
                  <><ShoppingCart className="w-5 h-5" /> Add to Cart</>
                )}
              </button>

              <button
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className={cn(
                  "flex items-center justify-center py-4 rounded-2xl font-black text-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  isOutOfStock
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed hidden sm:flex"
                    : "bg-ink text-white shadow-lg shadow-ink/20 hover:bg-slate-800 hover:shadow-xl focus-visible:ring-ink hover:-translate-y-0.5"
                )}
              >
                Buy Now
              </button>
            </div>
            
          </div>
          
          {/* TRUST BADGES */}
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-slate-400" /> Fast Delivery</div>
            <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-slate-400" /> Secure Payment</div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
