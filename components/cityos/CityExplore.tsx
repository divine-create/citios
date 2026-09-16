'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, Compass, Sparkles } from 'lucide-react';
import { DEMO_BUSINESSES, DEMO_PRODUCTS, fmtNaira } from '@/lib/demo/cityos';
import { CityCard, FallbackImg, Stars, Pill, LocationRow, OpenBadge, ChipButton, DemoBanner } from '@/components/cityos/CityUI';

const CATS = ['All', ...Array.from(new Set(DEMO_BUSINESSES.map((b) => b.category)))];

export default function CityExplore() {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('cat');
    if (c) {
      const match = CATS.find((t) => t.toLowerCase() === c.toLowerCase());
      if (match) setCat(match);
    }
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_BUSINESSES.filter((b) => {
      const inCat = cat === 'All' || b.category === cat;
      const inQ =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.area.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.tagline.toLowerCase().includes(q);
      return inCat && inQ;
    });
  }, [query, cat]);

  const marketProducts = useMemo(
    () =>
      DEMO_PRODUCTS.filter((p) => {
        const biz = DEMO_BUSINESSES.find((b) => b.slug === p.bizSlug);
        if (!biz) return false;
        const q = query.trim().toLowerCase();
        return (
          (cat === 'All' || biz.category === cat) &&
          (!q || p.name.toLowerCase().includes(q) || biz.name.toLowerCase().includes(q))
        );
      }).slice(0, 6),
    [query, cat],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Explore Calabar</h1>
        <p className="text-xs text-slate-500 font-medium">
          Marketplaces, stalls and services across the city — one CityOS search.
        </p>
      </div>

      <DemoBanner />

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets, stalls, areas… e.g. ogbono, Watt Market"
            className="w-full bg-white rounded-xl py-3 pl-11 pr-4 text-[13px] font-medium text-slate-700 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:border-teal-600/40 placeholder:text-slate-400 transition-all"
          />
        </div>
        <button className="hidden sm:inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs font-bold hover:border-teal-300 transition-colors">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
        {CATS.map((c) => (
          <ChipButton key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
            <span className="ml-1.5 opacity-60">
              {c === 'All'
                ? DEMO_BUSINESSES.length
                : DEMO_BUSINESSES.filter((b) => b.category === c).length}
            </span>
          </ChipButton>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((b) => (
          <CityCard key={b.slug} href={`/biz/${b.slug}`} className="flex flex-col">
            <FallbackImg src={b.cover} alt={b.name} className="h-32 w-full" />
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-black text-ink truncate">{b.name}</p>
                  <LocationRow text={`${b.area} · ${b.category}`} className="text-[10px]" />
                </div>
                <Stars rating={b.rating} className="shrink-0" />
              </div>
              <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{b.tagline}</p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <OpenBadge open={b.isOpen} />
                <Pill tone="blue">{`${b.deliveryEta} min via CityDrive`}</Pill>
              </div>
            </div>
          </CityCard>
        ))}
        {results.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <p className="text-sm font-bold text-slate-500">No business matched {query ? `“${query}”` : 'these filters'}.</p>
            <p className="text-xs text-slate-400 mt-1">Try Watt Market, pharmacy, fashion, or clear the filters.</p>
          </div>
        ) : null}
      </div>

      {marketProducts.length ? (
        <section className="pt-2">
          <h2 className="text-base font-black text-ink mb-3">
            {`Products matching "…${query || cat}"`}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {marketProducts.map((p) => {
              const biz = DEMO_BUSINESSES.find((b) => b.slug === p.bizSlug);
              return (
                <CityCard key={p.id} href={`/product/${p.id}`} className="flex items-center gap-3 p-3">
                  <FallbackImg src={p.image} alt={p.name} className="w-14 h-14 rounded-xl shrink-0" icon={<span className="text-xs font-black">{p.name.slice(0, 1)}</span>} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black text-ink truncate">{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">{biz?.name}</p>
                    <p className="text-[13px] font-black text-teal-900 mt-0.5">{fmtNaira(p.price)}</p>
                  </div>
                </CityCard>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="rounded-2xl bg-gradient-to-br from-teal-900 to-teal-700 p-5 text-white flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-black text-teal-100 uppercase tracking-widest">
            <Compass className="w-3.5 h-3.5" /> Not shopping?
          </p>
          <p className="text-sm font-black mt-1">
            Need a ride, a room, care or the market rush delivered?
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/drive/ride" className="px-4 py-2 rounded-xl bg-white text-teal-900 text-xs font-black hover:bg-teal-50 transition-colors">
            City Ride
          </Link>
          <Link href="/house" className="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/20 text-white text-xs font-black hover:bg-white/20 transition-colors">
            CityHouse
          </Link>
          <Link href="/ai" className="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/20 text-white text-xs font-black hover:bg-white/20 transition-colors inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Ask AI
          </Link>
        </div>
      </div>
    </div>
  );
}