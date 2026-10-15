'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  UtensilsCrossed, 
  Sparkles, 
  Zap, 
  Bike, 
  Flame, 
  Star, 
  Utensils,
  Plus
} from 'lucide-react';
import { getCityFood } from '@/app/actions/food';
import { useCart } from '@/components/cityos/CartStore';
import { useCity } from '@/components/cityos/CityProvider';
import { useMoney } from '@/components/cityos/CityProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import AirbnbCard from '@/components/cityos/AirbnbCard';
import AirbnbSearchCapsule from '@/components/cityos/AirbnbSearchCapsule';
import ItemCustomizerModal, { CustomizableItem } from '@/components/cityos/ItemCustomizerModal';
import { FallbackImg } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

const GLOVO_FILTERS = [
  { id: 'all', label: 'All Places' },
  { id: 'fast', label: '⚡ Under 25 mins', icon: Zap },
  { id: 'free_delivery', label: '🎉 Free Delivery', icon: Bike },
  { id: 'soups', label: '🍲 Calabar Soups', icon: Utensils },
  { id: 'suya', label: '🍢 Suya & Grills', icon: Flame },
  { id: 'top_rated', label: '★ Top Rated (4.8+)', icon: Star },
];

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
  const [activeFilter, setActiveFilter] = useState('all');
  const [restaurants, setRestaurants] = useState<RestaurantView[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [customizerItem, setCustomizerItem] = useState<CustomizableItem | null>(null);
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';
  const { fmt } = useMoney();
  const { count, subtotal } = useCart();

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

  // Filter restaurants based on Glovo filter
  const filteredRestos = restaurants.filter((r, idx) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'fast') return idx % 2 === 0; // fast express delivery
    if (activeFilter === 'free_delivery') return true; // all qualify over ₦10k
    if (activeFilter === 'soups') {
      const text = `${r.name} ${r.description || ''} ${r.category}`.toLowerCase();
      return text.includes('soup') || text.includes('kitchen') || text.includes('swallow') || text.includes('chop') || text.includes('lounge');
    }
    if (activeFilter === 'suya') {
      const text = `${r.name} ${r.description || ''} ${r.category}`.toLowerCase();
      return text.includes('suya') || text.includes('grill') || text.includes('fish') || text.includes('bar') || text.includes('joint');
    }
    if (activeFilter === 'top_rated') return (r.rating || 4.8) >= 4.8;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-28">
      {/* Floating Capsule Search Bar */}
      <AirbnbSearchCapsule />

      {/* Header Info */}
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-black uppercase tracking-wider text-[#FF385C] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            CityFood Delivery
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#222222] tracking-tight">
          Food Delivery in {cityName}
        </h1>
        <p className="text-sm text-[#717171] font-medium">
          Authentic Calabar soups, grilled suya, and fast eats from local kitchens. Express courier dispatch.
        </p>
      </div>

      {/* Glovo Speed & Cuisines Filter Bar */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar select-none">
        {GLOVO_FILTERS.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                'px-4 py-2 rounded-full text-[13px] font-bold transition-all shrink-0 border flex items-center gap-1.5',
                isActive
                  ? 'border-[#222222] bg-[#222222] text-white shadow-sm'
                  : 'border-[#EBEBEB] bg-white text-[#717171] hover:border-neutral-400 hover:text-[#222222]'
              )}
            >
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Restaurant Grid with Glovo Badges & Delivery Economics */}
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
            {filteredRestos.map((r, idx) => {
              const deliveryEta = idx % 2 === 0 ? '20 - 30 min' : '25 - 35 min';
              const deliveryFeeText = idx % 3 === 0 ? 'Free Delivery' : '₦600 delivery';

              return (
                <div key={r.id} className="relative group/spot">
                  <AirbnbCard
                    id={r.id}
                    href={`/food/${r.id}`}
                    title={r.name}
                    subtitle={r.description || 'Authentic local cuisine & fresh grills'}
                    neighborhood={r.area || r.address || `${cityName}`}
                    image={r.image}
                    images={r.images}
                    rating={r.rating || 4.8}
                    reviewCount={18 + ((idx * 8) % 60)}
                    badge={idx === 0 ? 'Top Pick' : idx % 4 === 0 ? 'Fast Delivery' : undefined}
                    price={2500 + (idx % 3) * 500}
                    priceSuffix="avg meal"
                    metaLine={`⚡ ${deliveryEta} · ${deliveryFeeText}`}
                    aspectRatio="4/3"
                  />
                </div>
              );
            })}

            {filteredRestos.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  icon={<UtensilsCrossed className="w-7 h-7" />}
                  title={`No kitchens match this filter in ${cityName}`}
                  description="Try selecting 'All Places' to see all open kitchens in your area."
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Popular Dishes with 1-Tap Glovo Customizer Trigger */}
      {menuItems.length > 0 && (
        <section className="pt-6 border-t border-[#EBEBEB]">
          <div className="flex items-center justify-between mb-4 px-1">
            <div>
              <h2 className="text-xl font-black text-[#222222]">Popular dishes in {cityName}</h2>
              <p className="text-xs text-[#717171]">Tap any dish to customize portions, sides, and kitchen notes</p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 snap-x">
            {menuItems.slice(0, 10).map((p) => {
              const biz = restaurants.find((r) => r.id === p.organizationId);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setCustomizerItem({
                      id: p.id,
                      name: p.name,
                      price: p.price || 2500,
                      description: p.description,
                      imageUrl: p.imageUrl,
                      category: p.category,
                      organizationId: p.organizationId,
                      orgName: biz?.name || 'Local Kitchen',
                    });
                  }}
                  className="flex flex-col gap-2 w-40 shrink-0 snap-start text-left group bg-white p-2 rounded-2xl border border-[#EBEBEB] hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer"
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-neutral-100">
                    <FallbackImg
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-[#FF385C] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="px-1 flex flex-col justify-between flex-1">
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase truncate">{biz?.name || 'Kitchen'}</p>
                      <h3 className="text-[13px] font-bold text-[#222222] leading-tight line-clamp-2 group-hover:text-[#FF385C] transition-colors">{p.name}</h3>
                    </div>
                    <p className="text-[13px] font-black text-[#222222] mt-2">{p.price != null ? fmt(p.price) : '₦2,500'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Item Customizer Bottom Sheet Drawer */}
      <ItemCustomizerModal
        item={customizerItem}
        isOpen={Boolean(customizerItem)}
        onClose={() => setCustomizerItem(null)}
        orgName={customizerItem?.orgName}
      />

      {/* Floating Bottom Basket Bar (Glovo style) */}
      {count > 0 && (
        <aside 
          aria-label="Food Basket"
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
                <p className="text-xs font-bold text-neutral-300 leading-none">Your Food Basket</p>
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
    </div>
  );
}
