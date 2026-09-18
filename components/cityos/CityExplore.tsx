'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, Compass, Sparkles } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { CityCard, FallbackImg, Stars, Pill, LocationRow, OpenBadge, ChipButton } from '@/components/cityos/CityUI';
import { searchCityExplore } from '@/app/actions/explore';
import { useCity } from '@/components/cityos/CityProvider';

const CATS = ['All', 'Retail', 'Service', 'School', 'Healthcare', 'Hotel'];

export default function CityExplore() {
  const { city } = useCity();
  const { fmt } = useMoney();
  const cityName = city?.name ?? 'CityOS';
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');
  
  const [results, setResults] = useState<any[]>([]);
  const [marketProducts, setMarketProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('cat');
    if (c) {
      const match = CATS.find((t) => t.toLowerCase() === c.toLowerCase());
      if (match) setCat(match);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError(false);
      
      searchCityExplore(city?.slug, query, cat)
        .then(data => {
          setResults(data.organizations);
          setMarketProducts(data.products);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError(true);
          setLoading(false);
        });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query, cat, city?.slug]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">{`Explore ${cityName}`}</h1>
        <p className="text-xs text-slate-500 font-medium">
          Marketplaces, stalls and services across the city â€” one CityOS search.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets, stalls, areasâ€¦ e.g. ogbono, Watt Market"
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
          </ChipButton>
        ))}
      </div>

      {error ? (
        <div className="col-span-full rounded-2xl border border-dashed border-red-200 p-10 text-center">
          <p className="text-sm font-bold text-red-500">Search failed.</p>
          <p className="text-xs text-red-400 mt-1">We couldn't reach the database right now. Please try again.</p>
        </div>
      ) : loading ? (
        <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <p className="text-sm font-bold text-slate-500 animate-pulse">Searching...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((b) => (
              <CityCard key={b.slug} href={`/org/${b.slug}`} className="flex flex-col">
                <FallbackImg src={b.cover} alt={b.name} className="h-32 w-full" />
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-black text-ink truncate">{b.name}</p>
                      <LocationRow text={`${b.area} Â· ${b.category}`} className="text-[10px]" />
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
                <p className="text-sm font-bold text-slate-500">No business matched {query ? `"${query}"` : 'these filters'}.</p>
                <p className="text-xs text-slate-400 mt-1">Try Watt Market, pharmacy, fashion, or clear the filters.</p>
              </div>
            ) : null}
          </div>

          {marketProducts.length > 0 && (
            <section className="pt-2">
              <h2 className="text-base font-black text-ink mb-3">
                {`Products matching "${query || cat}"`}
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {marketProducts.map((p) => {
                  return (
                    <CityCard key={p.id} href={`/product/${p.id}`} className="flex items-center gap-3 p-3">
                      <FallbackImg src={p.image} alt={p.name} className="w-14 h-14 rounded-xl shrink-0" icon={<span className="text-xs font-black">{p.name.slice(0, 1)}</span>} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-black text-ink truncate">{p.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 truncate">{p.bizName}</p>
                        <p className="text-[13px] font-black text-teal-900 mt-0.5">{fmt(p.price)}</p>
                      </div>
                    </CityCard>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

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
          <Link href="/tasks" className="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/20 text-white text-xs font-black hover:bg-white/20 transition-colors">
            Services
          </Link>
          <Link href="/stay" className="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/20 text-white text-xs font-black hover:bg-white/20 transition-colors">
            Hotels Tonight
          </Link>
          <Link href="/care" className="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/20 text-white text-xs font-black hover:bg-white/20 transition-colors">
            Clinics
          </Link>
          <Link href="/ai" className="px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/20 text-white text-xs font-black hover:bg-white/20 transition-colors inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Ask AI
          </Link>
        </div>
      </div>
    </div>
  );
}