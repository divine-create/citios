'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UtensilsCrossed, ArrowRight } from 'lucide-react';
import { useCart } from '@/components/cityos/CartStore';
import { getCityFood } from '@/app/actions/food';
import { CityCard, FallbackImg, Stars, LocationRow, OpenBadge, ChipButton, DemoBanner, fmtNaira } from '@/components/cityos/CityUI';

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

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const data = await getCityFood('calabar');
      if (!active) return;
      setRestaurants(data.restaurants as RestaurantView[]);
      setMenuItems(data.menuItems as MenuItemView[]);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const cats = [...new Set(['All', ...restaurants.map((r) => r.category ?? 'Restaurant')])];

  const restos = cat === 'All' ? restaurants : restaurants.filter((r) => r.category === cat);

  const items = cat === 'All' ? menuItems : menuItems;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Food</h1>
        <p className="text-xs text-slate-500 font-medium">
          Kitchens, cafés and stalls cooking Calabar today — order through CityOS.
        </p>
      </div>

      <DemoBanner />

      <div className="flex flex-col gap-1">
        <h2 className="text-[13px] font-black text-ink">CityFood is live</h2>
        <p className="text-[11px] text-slate-500 font-medium">
          Discover and order from real restaurants and their menus across {APP_CITY}.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
        {FOOD_CATS.map((c) => (
          <ChipButton key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
            <span className="ml-1.5 opacity-60">
              {c === 'All'
                ? restaurants.length
                : restaurants.filter((r) => (r.category ?? 'Restaurant') === c).length}
            </span>
          </ChipButton>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {restos.map((r) => {
          return (
            <CityCard key={r.id} href={`/food/${r.id}`} className="flex flex-col">
              <FallbackImg
                src={r.image}
                alt={r.name}
                className="h-32 w-full"
                icon={<span className="text-sm font-black">{r.name.slice(0, 1)}</span>}
              />
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-ink truncate">{r.name}</p>
                    <LocationRow text={`${r.area ?? 'Calabar'} · ${r.category ?? 'Restaurant'}`} className="text-[10px]" />
                  </div>
                  {r.rating ? <Stars rating={r.rating} className="shrink-0" /> : null}
                </div>
                {r.description ? (
                  <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{r.description}</p>
                ) : null}
                <div className="flex items-center gap-2 pt-1">
                  <OpenBadge open={r.isOpen ?? true} />
                  <span className="ml-auto text-[10px] font-bold text-slate-400">
                    {r.menuItems.length} dishes on the menu
                  </span>
                </div>
              </div>
            </CityCard>
          );
        })}
        {restos.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <p className="text-sm font-bold text-slate-500">Nothing cooking in this section right now.</p>
            <p className="text-xs text-slate-400 mt-1">Try another category, or register a restaurant on CityOS to open a kitchen.</p>
          </div>
        ) : null}
      </div>

      {items.length ? (
        <section className="pt-2">
          <h2 className="text-base font-black text-ink mb-3">Popular dishes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.slice(0, 8).map((p) => {
              const biz = restaurants.find((r) => r.id === p.organizationId);
              return (
                <CityCard key={p.id} href={`/food/item/${p.id}`} className="p-3 flex flex-col gap-1.5">
                  <FallbackImg
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-20 w-full rounded-xl"
                    icon={<span className="text-sm font-black">{p.name.slice(0, 1)}</span>}
                  />
                  <p className="text-[12px] font-black text-ink leading-snug line-clamp-1">{p.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 truncate">{biz?.name}</p>
                  <p className="text-[13px] font-black text-teal-900">{p.price != null ? fmtNaira(p.price) : '—'}</p>
                </CityCard>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-black">Running a kitchen on CityOS?</p>
            <p className="text-[11px] text-orange-50/80 font-medium mt-0.5">
              Restaurants in Calabar take orders and run their menus inside CityOS — CityFood brings them to residents.
            </p>
          </div>
          <Link href="/demo/access" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-orange-700 text-xs font-black hover:bg-orange-50 transition-colors shrink-0">
            Business workspace <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
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
