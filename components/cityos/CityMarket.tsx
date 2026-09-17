'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Store, ArrowRight } from 'lucide-react';
import { DEMO_BUSINESSES, DEMO_PRODUCTS, getBusiness, fmtNaira, type Product, type Business } from '@/lib/demo/cityos';
import { getOrg } from '@/lib/demo/universe/orgs';
import { CityCard, FallbackImg, Stars, LocationRow, OpenBadge, ChipButton, DemoBanner } from '@/components/cityos/CityUI';

const MARKET_CATS = ['All', 'Groceries', 'Food & Market', 'Fashion', 'Electronics', 'Books & Prints'];

const MARKET_BIZ = DEMO_BUSINESSES.filter((b) => MARKET_CATS.includes(b.category));

export default function CityMarket() {
  const [cat, setCat] = useState('All');

  const bizs = MARKET_BIZ.filter((b) => cat === 'All' || b.category === cat);

  const products: Product[] = DEMO_PRODUCTS.filter((p) => {
    const biz = getBusiness(p.bizSlug);
    if (!biz) return false;
    if (cat !== 'All' && biz.category !== cat) return false;
    return MARKET_CATS.includes(biz.category);
  }).slice(0, 8);

  const shops = bizs.filter((b) => getOrg(b.slug)?.os === 'shopos');
  const orgBiz = (b: Business) => (getOrg(b.slug)?.os ? getOrg(b.slug) : undefined);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Market</h1>
        <p className="text-xs text-slate-500 font-medium">
          Shop the city — marketplaces, stalls and stores sold through CityOS.
        </p>
      </div>

      <DemoBanner />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
        {MARKET_CATS.map((c) => (
          <ChipButton key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
            <span className="ml-1.5 opacity-60">
              {c === 'All' ? MARKET_BIZ.length : MARKET_BIZ.filter((b) => b.category === c).length}
            </span>
          </ChipButton>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bizs.map((b) => {
          const org = orgBiz(b);
          return (
            <CityCard key={b.slug} href={`/org/${b.slug}`} className="flex flex-col">
              <FallbackImg src={b.cover} alt={b.name} className="h-32 w-full" />
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-ink truncate">
                      {org?.emoji ? `${org.emoji} ` : ''}{b.name}
                    </p>
                    <LocationRow text={`${b.area} · ${b.category}`} className="text-[10px]" />
                  </div>
                  <Stars rating={b.rating} className="shrink-0" />
                </div>
                <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{b.tagline}</p>
                <div className="mt-auto flex items-center gap-2 pt-2">
                  <OpenBadge open={b.isOpen} />
                  <span className="ml-auto text-[10px] font-bold text-slate-400">{b.deliveryEta} min via CityDrive</span>
                </div>
              </div>
            </CityCard>
          );
        })}
        {bizs.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <p className="text-sm font-bold text-slate-500">Nothing in this section right now.</p>
            <p className="text-xs text-slate-400 mt-1">Try another category, or browse the full city.</p>
          </div>
        ) : null}
      </div>

      {products.length ? (
        <section className="pt-2">
          <h2 className="text-base font-black text-ink mb-3">Popular right now</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.map((p) => {
              const biz = getBusiness(p.bizSlug);
              return (
                <CityCard key={p.id} href={`/product/${p.id}`} className="p-3 flex flex-col gap-1.5">
                  <FallbackImg src={p.image} alt={p.name} className="h-20 w-full rounded-xl" icon={<span className="text-sm font-black">{p.name.slice(0, 1)}</span>} />
                  <p className="text-[12px] font-black text-ink leading-snug line-clamp-1">{p.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 truncate">{biz?.name}</p>
                  <p className="text-[13px] font-black text-teal-900">{fmtNaira(p.price)}</p>
                </CityCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {shops.length ? (
        <section className="rounded-2xl bg-gradient-to-br from-teal-900 to-teal-700 p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-black">One city platform for every store</p>
              <p className="text-[11px] text-teal-100/80 font-medium mt-0.5">
                {shops.map((b) => b.name).join(', ')} list and take orders inside CityOS — sell in naira, deliver with CityDrive.
              </p>
            </div>
            <Link href="/demo/access" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-teal-900 text-xs font-black hover:bg-teal-50 transition-colors shrink-0">
              Business workspace <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}