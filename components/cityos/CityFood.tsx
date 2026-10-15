'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, UtensilsCrossed, Sparkles } from 'lucide-react';
import { getCityFood } from '@/app/actions/food';
import { useCart } from '@/components/cityos/CartStore';
import { useCity } from '@/components/cityos/CityProvider';
import { useMoney } from '@/components/cityos/CityProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import AirbnbCard from '@/components/cityos/AirbnbCard';
import AirbnbSearchCapsule from '@/components/cityos/AirbnbSearchCapsule';
import { FallbackImg } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

const FOOD_CATS = ['All', 'Restaurant', 'Cafe', 'Campus Eats', 'Food & Market'];

interface RestaurantView {
  id: string;
  name: string;
  type: string;
  description?: string;
  address?: string;
  rating?: number;
  image?: string;
  images?: string[];
  category: string;
  deliveryEta?: string;
  isOpen?: boolean;
  area?: string;
  menuItems: MenuItemView[];
}

interface MenuItemView {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  organizationId: string;
}

export default function CityFood() {
  const [cat, setCat] = useState('All');
  const [restaurants, setRestaurants] = useState<RestaurantView[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';
  const { fmt } = useMoney();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const data = await getCityFood(city?.slug);
      if (!active) return;
      setRestaurants(data.restaurants as unknown as RestaurantView[]);
      setMenuItems(data.menuItems as MenuItemView[]);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [city?.slug]);

  const restos = cat === 'All' ? restaurants : restaurants.filter((r) => r.category === cat);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Floating Capsule Search Bar */}
      <AirbnbSearchCapsule />

      {/* Header Info */}
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-black uppercase tracking-wider text-[#FF385C] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            CityFood & Dining
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#222222] tracking-tight">
          Dining & Kitchens in {cityName}
        </h1>
        <p className="text-sm text-[#717171] font-medium">
          Order authentic soups, grills, and fresh dishes delivered direct from {cityName}&apos;s top kitchens.
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {FOOD_CATS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              'px-4 py-2 rounded-full text-[13px] font-semibold transition-all shrink-0 border flex items-center gap-1.5',
              cat === c
                ? 'border-[#222222] bg-[#222222] text-white shadow-sm'
                : 'border-[#EBEBEB] bg-white text-[#717171] hover:border-neutral-400 hover:text-[#222222]'
            )}
          >
            <span>{c === 'All' ? 'All Dining' : c}</span>
            <span className={cn('text-[11px]', cat === c ? 'text-neutral-300' : 'text-neutral-400')}>
              {c === 'All'
                ? restaurants.length
                : restaurants.filter((r) => (r.category ?? 'Restaurant') === c).length}
            </span>
          </button>
        ))}
      </div>

      {/* Airbnb 4-Column Food Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 animate-pulse">
              <div className="aspect-[4/3] w-full rounded-2xl bg-neutral-200" />
              <div className="h-4 w-3/4 bg-neutral-200 rounded" />
              <div className="h-3 w-1/2 bg-neutral-200 rounded" />
            </div>
          ))
        ) : (
          <>
            {restos.map((r, idx) => {
              return (
                <AirbnbCard
                  key={r.id}
                  id={r.id}
                  href={`/food/${r.id}`}
                  title={r.name}
                  subtitle={r.description || 'Authentic local cuisine & fresh grills'}
                  neighborhood={r.area || r.address || `${cityName}`}
                  image={r.image}
                  images={r.images}
                  rating={r.rating || 4.8}
                  badge={idx === 0 ? 'Top Rated' : idx % 3 === 0 ? 'Guest favorite' : undefined}
                  price={2500 + (idx % 3) * 500}
                  priceSuffix="avg plate"
                  metaLine={r.deliveryEta ? `⚡ ${r.deliveryEta} delivery` : '⚡ 25 - 35 min delivery'}
                  aspectRatio="4/3"
                />
              );
            })}

            {restos.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  icon={<UtensilsCrossed className="w-7 h-7" />}
                  title={`No kitchens open in ${cityName} right now`}
                  description="Check back later or browse a nearby area for food options."
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Popular Dishes Carousel */}
      {menuItems.length > 0 && (
        <section className="pt-6 border-t border-[#EBEBEB]">
          <h2 className="text-xl font-black text-[#222222] mb-4">Popular dishes in {cityName}</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 snap-x">
            {menuItems.slice(0, 10).map((p) => {
              return (
                <Link key={p.id} href={`/food/${p.organizationId}`} className="flex flex-col gap-2 w-36 shrink-0 snap-start group">
                  <div className="w-36 h-36 rounded-2xl overflow-hidden bg-neutral-100 border border-[#EBEBEB]">
                    <FallbackImg
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      icon={<span className="text-xl font-black text-neutral-400">{p.name.slice(0, 1)}</span>}
                    />
                  </div>
                  <div className="px-1">
                    <p className="text-[13px] font-bold text-[#222222] leading-tight line-clamp-2 group-hover:text-[#FF385C] transition-colors">{p.name}</p>
                    <p className="text-[12px] font-black text-[#222222] mt-1">{p.price != null ? fmt(p.price) : '—'}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Kitchen Partner Callout */}
      <section className="rounded-3xl bg-[#222222] p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
        <div className="flex-1 text-center sm:text-left">
          <p className="text-base font-bold">Running a restaurant or food truck in {cityName}?</p>
          <p className="text-xs text-neutral-400 mt-1">
            Accept online orders with zero courier headache. Express riders dispatched via CityDrive.
          </p>
        </div>
        <Link href="/demo/access" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF385C] hover:bg-[#E00B41] text-white text-xs font-bold transition-all shrink-0 shadow-md">
          Open Kitchen Dashboard <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </div>
  );
}
