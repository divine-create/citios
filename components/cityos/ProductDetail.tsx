'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Minus, Plus, ShoppingCart, Truck, ShieldCheck, BadgePercent, Check, ChevronRight } from 'lucide-react';
import { getProduct, getBusiness, DEMO_PRODUCTS, fmtNaira } from '@/lib/demo/cityos';
import { FallbackImg, Stars, Pill, VerifiedBadge, DemoBanner, PriceTag } from '@/components/cityos/CityUI';
import { useCart } from '@/components/cityos/CartStore';
import { cn } from '@/lib/utils';

export default function ProductDetail({ id }: { id: string }) {
  const router = useRouter();
  const p = getProduct(id);
  const { add, count } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!p) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🛍️</p>
        <h1 className="text-lg font-black text-ink">That product is not in the demo city.</h1>
        <p className="text-sm text-slate-500">It may have sold out or left the demo dataset.</p>
        <Link href="/explore" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Keep exploring
        </Link>
      </div>
    );
  }

  const biz = getBusiness(p.bizSlug);
  const similar = DEMO_PRODUCTS.filter((x) => x.id !== p.id && x.category === p.category).slice(0, 3);

  const addToBag = () => {
    add(p.id, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const buyNow = () => {
    add(p.id, qty);
    router.push('/checkout');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Link href="/explore" className="hover:text-teal-800">Explore</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/biz/${p.bizSlug}`} className="hover:text-teal-800 truncate">{biz?.name}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 truncate">{p.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative rounded-3xl overflow-hidden">
            <FallbackImg src={p.image} alt={p.name} className="h-72 md:h-96 w-full" gradient="from-teal-800 to-teal-600" />
            {p.tag ? (
              <span className="absolute top-3 left-3">
                <Pill tone={p.tag === 'promo' ? 'orange' : p.tag === 'local' ? 'green' : 'teal'}>
                  {p.tag === 'best' ? 'Best seller' : p.tag === 'promo' ? 'On promo' : p.tag === 'local' ? 'Made local' : 'New arrival'}
                </Pill>
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[p.image].map((src, i) => (
              <FallbackImg key={i} src={src} alt={p.name} className="h-16 rounded-xl ring-1 ring-slate-200" />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <Link href={`/biz/${p.bizSlug}`} className="flex items-center gap-2 text-[13px] font-bold text-teal-800 hover:underline">
            {biz?.name} <VerifiedBadge label="Verified business" /> <ChevronRight className="w-3 h-3" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-ink mt-1.5">{p.name}</h1>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Stars rating={p.rating} className="scale-110 origin-left" />
            <span className="text-[11px] font-bold text-slate-400">{`${p.reviews} verified reviews`}</span>
            <span className="text-[11px] font-bold text-emerald-600">{`${p.stock} in stock`}</span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <PriceTag amount={p.price} old={p.oldPrice} className="text-[28px]" />
            <span className="text-[12px] font-bold text-slate-400">per {p.unit}</span>
          </div>

          <p className="mt-4 text-[13px] text-slate-600 leading-relaxed">{p.desc}</p>

          {/* qty + actions */}
          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5 text-slate-500 hover:text-teal-800">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center text-sm font-black text-ink tabular-nums">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="p-2.5 text-slate-500 hover:text-teal-800">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span className="text-[11px] font-bold text-slate-400">{`${p.unit} · ${fmtNaira(p.price * qty)} total`}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={addToBag}
              className={cn(
                'inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black transition-all ring-1',
                added
                  ? 'bg-emerald-600 text-white ring-emerald-600'
                  : 'bg-white text-teal-900 ring-teal-800 hover:bg-teal-50',
              )}
            >
              {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
              {added ? 'Added to bag' : 'Add to bag'}
            </button>
            <button
              onClick={buyNow}
              className="inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black transition-all shadow-sm shadow-teal-800/20"
            >
              <BadgePercent className="w-4 h-4" />
              Buy now · CityPay
            </button>
          </div>

          {/* trust row */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { icon: Truck, label: `Arrives in ${biz?.deliveryEta ?? 30} min`, sub: 'with CityDrive' },
              { icon: ShieldCheck, label: 'CityPay protected', sub: 'instant settlement' },
              { icon: BadgePercent, label: biz?.offers[0]?.title ?? 'Daily offers', sub: biz?.offers[0]?.note ?? 'check the store' },
            ].map((t, i) => (
              <div key={i} className="rounded-xl bg-white border border-slate-100 p-3 text-center">
                <t.icon className="w-4.5 h-4.5 mx-auto text-teal-800" />
                <p className="text-[11px] font-black text-ink mt-1.5 leading-tight">{t.label}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{t.sub}</p>
              </div>
            ))}
          </div>

          {count > 0 ? (
            <Link href="/cart" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-teal-800 hover:text-teal-900">
              <ShoppingCart className="w-4 h-4" />
              {`View bag (${count} item${count > 1 ? 's' : ''})`} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : null}
        </div>
      </div>

      {similar.length ? (
        <section>
          <h2 className="text-base font-black text-ink mb-3">More from {p.category}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {similar.map((s) => {
              const sbiz = getBusiness(s.bizSlug);
              return (
                <Link key={s.id} href={`/product/${s.id}`} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <FallbackImg src={s.image} alt={s.name} className="h-28 w-full" icon={<span className="text-base font-black">{s.name.slice(0, 1)}</span>} />
                  <div className="p-3">
                    <p className="text-[10px] font-bold text-slate-400 truncate">{sbiz?.name}</p>
                    <p className="text-[12px] font-black text-ink leading-snug line-clamp-2 mt-0.5">{s.name}</p>
                    <PriceTag amount={s.price} old={s.oldPrice} className="text-[13px] mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <DemoBanner />
    </div>
  );
}