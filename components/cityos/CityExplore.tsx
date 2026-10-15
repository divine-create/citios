'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Compass, MapPin, Sparkles } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { searchCityExplore } from '@/app/actions/explore';
import { useCity } from '@/components/cityos/CityProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import AirbnbCard from '@/components/cityos/AirbnbCard';
import AirbnbSearchCapsule from '@/components/cityos/AirbnbSearchCapsule';
import { cn } from '@/lib/utils';

const CATS = ['All', 'Restaurant', 'Hotel', 'Retail', 'Service', 'Healthcare', 'School'];

export default function CityExplore() {
  const { city } = useCity();
  const { fmt } = useMoney();
  const cityName = city?.name ?? 'Calabar';
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');
  
  const [results, setResults] = useState<any[]>([]);
  const [marketProducts, setMarketProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('cat');
    const q = new URLSearchParams(window.location.search).get('q');
    if (c) {
      const match = CATS.find((t) => t.toLowerCase() === c.toLowerCase());
      if (match) setCat(match);
    }
    if (q) {
      setQuery(q);
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

  if (!city) {
    return (
      <EmptyState
        icon={<MapPin className="w-7 h-7" />}
        title="Select your city to explore"
        description="Choose a city first and we'll show you what's nearby — markets, stalls, services and more."
        className="mt-8"
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Floating Capsule Search Bar */}
      <AirbnbSearchCapsule />

      {/* Header Info */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[#222222] tracking-tight">
          {query ? `Places matching "${query}"` : `Explore ${cityName}`}
        </h1>
        <p className="text-sm text-[#717171] font-medium">
          Restaurants, boutique hotels, supermarkets, and artisan services across {cityName}.
        </p>
      </div>

      {/* Category Filter Pills (Airbnb minimal style) */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              'px-4 py-2 rounded-full text-[13px] font-semibold transition-all shrink-0 border',
              cat === c
                ? 'border-[#222222] bg-[#222222] text-white shadow-sm'
                : 'border-[#EBEBEB] bg-white text-[#717171] hover:border-neutral-400 hover:text-[#222222]'
            )}
          >
            {c === 'All' ? 'All Places' : c}
          </button>
        ))}
      </div>

      {error ? (
        <div className="col-span-full rounded-3xl border border-dashed border-red-200 p-12 text-center bg-white">
          <p className="text-sm font-bold text-red-500">Search failed</p>
          <p className="text-xs text-red-400 mt-1">We couldn't reach the database right now. Please try again.</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="flex flex-col gap-3">
              <div className="aspect-[4/3] w-full rounded-2xl bg-neutral-200" />
              <div className="h-4 w-3/4 bg-neutral-200 rounded" />
              <div className="h-3 w-1/2 bg-neutral-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Airbnb 4-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {results.map((b, idx) => {
              const isFood = b.type === 'RESTAURANT';
              const isHotel = b.type === 'HOTEL';
              const isRetail = b.type === 'RETAIL';
              const priceSuffix = isHotel ? 'night' : isFood ? 'avg plate' : undefined;
              const price = isHotel ? 28000 + (idx % 4) * 4000 : isFood ? 2500 + (idx % 3) * 500 : undefined;

              return (
                <AirbnbCard
                  key={b.slug}
                  id={b.slug}
                  href={`/org/${b.slug}`}
                  title={b.name}
                  subtitle={b.tagline || b.category}
                  neighborhood={b.area || cityName}
                  image={b.cover}
                  rating={b.rating}
                  badge={b.badge}
                  price={b.price}
                  priceSuffix={b.price ? priceSuffix : undefined}
                  metaLine={isFood ? '⚡ Local kitchen' : b.isOpen ? 'Open' : 'Closed'}
                  aspectRatio="4/3"
                />
              );
            })}

            {results.length === 0 && (
              <div className="col-span-full rounded-3xl border border-dashed border-neutral-300 p-12 text-center bg-white">
                <p className="text-base font-bold text-[#222222]">
                  {query ? `No spots found matching "${query}"` : 'No businesses found in this category.'}
                </p>
                <p className="text-xs text-[#717171] mt-1">Try searching another neighborhood or keyword.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Secondary Quick Jump */}
      <div className="rounded-3xl bg-[#222222] p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#FF385C] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Direct Services & Rides
          </p>
          <p className="text-base font-bold mt-0.5">
            Looking for something specific in {cityName}?
          </p>
          <p className="text-xs text-neutral-400">Rides, hot meals delivered to your doorstep, or handymen on demand.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/food" className="px-5 py-2.5 rounded-full bg-white text-[#222222] text-xs font-bold hover:bg-neutral-100 transition-colors">
            Order Food
          </Link>
          <Link href="/stay" className="px-5 py-2.5 rounded-full bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-700 transition-colors">
            Book Stays
          </Link>
          <Link href="/drive/ride" className="px-5 py-2.5 rounded-full bg-[#FF385C] text-white text-xs font-bold hover:bg-[#E00B41] transition-colors">
            Book Ride
          </Link>
        </div>
      </div>
    </div>
  );
}