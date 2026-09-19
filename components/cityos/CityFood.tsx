'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, UtensilsCrossed } from 'lucide-react';

import { CityCard, ChipButton, FallbackImg, LocationRow, Stars, OpenBadge } from '@/components/cityos/CityUI';
import { getCityFood } from '@/app/actions/food';
import { useCart } from '@/components/cityos/CartStore';
import { useCity } from '@/components/cityos/CityProvider';
import { useMoney } from '@/components/cityos/CityProvider';

const FOOD_CATS = ['All', 'Restaurant', 'Cafe', 'Campus Eats', 'Food & Market'];

interface RestaurantView {
  id: string;
  name: string;
  type: string;
  description?: string;
  address?: string;
  rating?: number;
  image?: string;
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
  const { add } = useCart();
  const { city } = useCity();
  const cityName = city?.name ?? 'CityOS';
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

  const cats = [...new Set(['All', ...restaurants.map((r) => r.category ?? 'Restaurant')])];

  const restos = cat === 'All' ? restaurants : restaurants.filter((r) => r.category === cat);

  const items = cat === 'All' ? menuItems : menuItems;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 py-2">
        <div>
           <h1 className="text-xl font-black text-ink">CityFood</h1>
           <p className="text-xs text-slate-500 font-medium mt-0.5">Order from local kitchens in {cityName}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
        {FOOD_CATS.map((c) => (
          <ChipButton className="rounded-full px-5 py-2 font-bold text-[13px]" key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
            <span className="ml-1.5 opacity-60">
              {c === 'All'
                ? restaurants.length
                : restaurants.filter((r) => (r.category ?? 'Restaurant') === c).length}
            </span>
          </ChipButton>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {restos.map((r) => {
          return (
            <Link key={r.id} href={`/food/${r.id}`} className="flex flex-col group cursor-pointer">
              <div className="relative overflow-hidden rounded-2xl w-full aspect-video border border-slate-100 bg-slate-50 mb-3">
                 <FallbackImg
                   src={r.image}
                   alt={r.name}
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                   icon={<span className="text-xl font-black text-slate-400">{r.name.slice(0, 1)}</span>}
                 />
                 <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black text-slate-800 shadow-sm flex items-center gap-1.5">
                   <OpenBadge open={r.isOpen ?? true} />
                 </div>
              </div>
              <div className="flex flex-col gap-0.5 px-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[15px] font-black text-ink truncate">{r.name}</p>
                  {r.rating ? <Stars rating={r.rating} className="shrink-0 mt-0.5" /> : null}
                </div>
                <p className="text-[12px] font-bold text-slate-400 truncate">
                   {r.category ?? 'Restaurant'} • {r.deliveryEta || '15-30 min'}
                </p>
              </div>
            </Link>
          );
        })}
        {restos.length === 0 ? (
          <div className="col-span-full rounded-3xl bg-slate-50 p-12 text-center">
            <p className="text-sm font-bold text-slate-500">{`No kitchens open in ${cityName} right now.`}</p>
          </div>
        ) : null}
      </div>

      {items.length ? (
        <section className="pt-6">
          <h2 className="text-lg font-black text-ink mb-4">Popular dishes</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden -mx-4 px-4 snap-x">
            {items.slice(0, 8).map((p) => {
              const biz = restaurants.find((r) => r.id === p.organizationId);
              return (
                <Link key={p.id} href={`/food/item/${p.id}`} className="flex flex-col gap-2 w-32 shrink-0 snap-start group">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
                     <FallbackImg
                       src={p.imageUrl}
                       alt={p.name}
                       className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                       icon={<span className="text-xl font-black text-slate-300">{p.name.slice(0, 1)}</span>}
                     />
                  </div>
                  <div className="px-1">
                     <p className="text-[13px] font-black text-ink leading-tight line-clamp-2">{p.name}</p>
                     <p className="text-[11px] font-bold text-teal-700 mt-1">{p.price != null ? fmt(p.price) : '—'}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl bg-orange-50 border border-orange-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-orange-950 mt-4">
        <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-black">Running a kitchen on CityOS?</p>
            <p className="text-xs font-medium mt-1 text-orange-800">
              Manage your menu, take orders, and reach residents directly.
            </p>
        </div>
        <Link href="/demo/access" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-orange-600 text-white text-xs font-black hover:bg-orange-700 transition-colors shrink-0">
            Open Workspace <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      <div className="space-y-2">
        <h2 className="text-base font-black text-ink">Food deals near you</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {menuItems.slice(0, 6).map((p) => (
            <CityCard key={p.id} href={`/food/item/${p.id}`} className="flex items-center gap-3 p-3">
              <FallbackImg
                src={p.imageUrl}
                alt={p.name}
                className="h-16 w-16 rounded-xl shrink-0"
                icon={<span className="text-sm font-black">{p.name.slice(0, 1)}</span>}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black text-ink truncate">{p.name}</p>
                <p className="text-[10px] font-bold text-slate-400 truncate">
                  {restaurants.find((r) => r.id === p.organizationId)?.name}
                </p>
              </div>
            </CityCard>
          ))}
        </div>
      </div>
    </div>
  );
}
