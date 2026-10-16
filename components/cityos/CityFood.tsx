'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  UtensilsCrossed, 
  Sparkles, 
  Zap, 
  Bike, 
  Flame, 
  Star, 
  Clock,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { getCityFood } from '@/app/actions/food';
import { useCart } from '@/components/cityos/CartStore';
import { useCity, useMoney } from '@/components/cityos/CityProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import ItemCustomizerModal, { CustomizableItem } from '@/components/cityos/ItemCustomizerModal';
import ChowdeckDeliveryHeader from '@/components/cityos/delivery/ChowdeckDeliveryHeader';
import ChowdeckHeroCarousel from '@/components/cityos/delivery/ChowdeckHeroCarousel';
import ChowdeckCategoryBubbles, { FOOD_CATEGORY_BUBBLES } from '@/components/cityos/delivery/ChowdeckCategoryBubbles';
import ChowdeckStoreCard, { StoreCardData } from '@/components/cityos/delivery/ChowdeckStoreCard';
import ChowdeckPopularDishCard, { PopularDishItem } from '@/components/cityos/delivery/ChowdeckPopularDishCard';
import ChowdeckBasketDock from '@/components/cityos/delivery/ChowdeckBasketDock';
import { StorefrontCampaign } from '@/lib/actions/storefront-management';
import { cn } from '@/lib/utils';

const FILTER_PILLS = [
  { id: 'all', label: 'All Places' },
  { id: 'fast', label: '⚡ Under 25 mins' },
  { id: 'free_delivery', label: '🎉 Free Delivery' },
  { id: 'top_rated', label: '★ Top Rated (4.7+)' },
  { id: 'low_price', label: 'Budget Friendly' },
];

export default function CityFood() {
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';
  const { fmt } = useMoney();
  const { count } = useCart();

  const [restaurants, setRestaurants] = useState<StoreCardData[]>([]);
  const [menuItems, setMenuItems] = useState<PopularDishItem[]>([]);
  const [campaigns, setCampaigns] = useState<StorefrontCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBubble, setActiveBubble] = useState('all');
  const [activeFilterPill, setActiveFilterPill] = useState('all');
  const [customizerItem, setCustomizerItem] = useState<CustomizableItem | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getCityFood(city?.slug);
        if (!active) return;
        setRestaurants((data.restaurants || []) as unknown as StoreCardData[]);
        setMenuItems((data.menuItems || []) as unknown as PopularDishItem[]);
        if (data.campaigns) setCampaigns(data.campaigns as StorefrontCampaign[]);
      } catch (e) {
        console.error('Failed to load food storefront data', e);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [city?.slug]);

  // Filter restaurants based on Search, Category Bubble, and Pill Filter
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchDesc = r.description?.toLowerCase().includes(q);
        const matchCuisine = r.cuisines?.some((c) => c.toLowerCase().includes(q));
        const matchDishes = (r as any).menuItems?.some((m: any) => m.name.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchCuisine && !matchDishes) return false;
      }

      // 2. Circular Category Bubble Filter
      if (activeBubble !== 'all') {
        const text = `${r.name} ${r.description || ''} ${(r as any).category || ''} ${r.cuisines?.join(' ') || ''}`.toLowerCase();
        if (activeBubble === 'soups') {
          if (!text.includes('soup') && !text.includes('swallow') && !text.includes('afang') && !text.includes('buka') && !text.includes('pot') && !text.includes('kitchen')) return false;
        } else if (activeBubble === 'jollof') {
          if (!text.includes('jollof') && !text.includes('rice') && !text.includes('pot') && !text.includes('bowl')) return false;
        } else if (activeBubble === 'chicken') {
          if (!text.includes('chicken') && !text.includes('turkey') && !text.includes('crunch') && !text.includes('fry')) return false;
        } else if (activeBubble === 'suya') {
          if (!text.includes('suya') && !text.includes('grill') && !text.includes('barbecue') && !text.includes('fish') && !text.includes('joint')) return false;
        } else if (activeBubble === 'shawarma') {
          if (!text.includes('shawarma') && !text.includes('wrap') && !text.includes('burger') && !text.includes('fast')) return false;
        } else if (activeBubble === 'pizza') {
          if (!text.includes('pizza') && !text.includes('pasta') && !text.includes('italian')) return false;
        } else if (activeBubble === 'pastries') {
          if (!text.includes('bakery') && !text.includes('pastry') && !text.includes('pie') && !text.includes('cake')) return false;
        } else if (activeBubble === 'drinks') {
          if (!text.includes('drink') && !text.includes('smoothie') && !text.includes('juice') && !text.includes('bar') && !text.includes('lounge')) return false;
        } else if (activeBubble === 'fast') {
          if (!r.isFastCourier && !r.deliveryEta?.includes('15') && !r.deliveryEta?.includes('20')) return false;
        }
      }

      // 3. Quick Filter Pill
      if (activeFilterPill === 'fast') {
        if (!r.isFastCourier && !r.deliveryEta?.includes('15') && !r.deliveryEta?.includes('20')) return false;
      } else if (activeFilterPill === 'free_delivery') {
        if (r.deliveryFee !== 0 && r.deliveryFee !== undefined && (r.deliveryFee > 400)) return false;
      } else if (activeFilterPill === 'top_rated') {
        if (!r.rating || r.rating < 4.7) return false;
      }

      return true;
    });
  }, [restaurants, searchQuery, activeBubble, activeFilterPill]);

  // Express kitchens for "Fastest Delivery in Calabar" (<25 mins rail)
  const expressKitchens = useMemo(() => {
    return restaurants.filter((r) => r.isFastCourier || r.deliveryEta?.includes('15') || r.deliveryEta?.includes('20') || r.deliveryEta?.includes('25'));
  }, [restaurants]);

  // Trending kitchens
  const trendingKitchens = useMemo(() => {
    return restaurants.filter((r) => r.isFeatured || (r.rating && r.rating >= 4.8));
  }, [restaurants]);

  return (
    <div className="space-y-7 animate-in fade-in duration-500 pb-32">
      {/* 1. Chowdeck Pinned Location & Delivery Switcher Header */}
      <ChowdeckDeliveryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder={`Craving Afang soup, Jollof, Suya or Shawarma in ${cityName}?`}
        trendingTags={['Afang Soup', 'Party Jollof', 'Beef Suya', 'Chicken Shawarma', 'Ekpang Nkukwo', 'Smoothies']}
        onSelectTag={(tag) => setSearchQuery(tag)}
      />

      {/* 2. Hero Promotional Carousel (Auto-advancing deals) */}
      {!searchQuery && campaigns.length > 0 && (
        <ChowdeckHeroCarousel campaigns={campaigns} />
      )}

      {/* 3. Iconic Chowdeck Circular Category Bubbles */}
      {!searchQuery && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Explore Cuisines & Cravings
            </h3>
            {activeBubble !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveBubble('all')}
                className="text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                Reset to All
              </button>
            )}
          </div>

          <ChowdeckCategoryBubbles
            categories={FOOD_CATEGORY_BUBBLES}
            activeCategoryId={activeBubble}
            onSelectCategory={(id) => {
              setActiveBubble(id);
              setActiveFilterPill('all');
            }}
          />
        </section>
      )}

      {/* 4. CURATED RAIL: ⚡ Fastest Delivery in Calabar (<25 mins) */}
      {!searchQuery && activeBubble === 'all' && expressKitchens.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 fill-orange-500" />
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                ⚡ Fastest Delivery in {cityName}
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Guaranteed &lt; 25 mins
            </span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar snap-x">
            {expressKitchens.slice(0, 8).map((kitchen) => (
              <div key={kitchen.id} className="w-72 sm:w-80 shrink-0 snap-start">
                <ChowdeckStoreCard store={kitchen} aspectRatio="16/9" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. CURATED RAIL: 🍲 Popular Dishes (Direct 1-Tap Add Stepper) */}
      {!searchQuery && activeBubble === 'all' && menuItems.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Popular Dishes You Can Order Now
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tap + to choose portion, swallow, and protein
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 overflow-x-auto pb-3 -mx-1 px-1 no-scrollbar snap-x">
            {menuItems.slice(0, 12).map((item) => {
              const vendor = restaurants.find((r) => r.id === item.organizationId);

              return (
                <div key={item.id} className="snap-start shrink-0">
                  <ChowdeckPopularDishCard
                    dish={{
                      ...item,
                      orgName: vendor?.name || 'Local Kitchen',
                    }}
                    onCustomize={(dish) => {
                      setCustomizerItem({
                        id: dish.id,
                        name: dish.name,
                        price: dish.price || 2500,
                        description: dish.description,
                        imageUrl: dish.imageUrl,
                        category: dish.category,
                        organizationId: dish.organizationId,
                        orgName: dish.orgName || 'Local Kitchen',
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. MAIN RESTAURANT FEED: All Restaurants & Kitchens */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : activeBubble !== 'all'
                ? `${FOOD_CATEGORY_BUBBLES.find((b) => b.id === activeBubble)?.label || 'Selected Cuisines'}`
                : `All Restaurants & Kitchens in ${cityName}`}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {filteredRestaurants.length} kitchen{filteredRestaurants.length === 1 ? '' : 's'} ready for delivery
            </p>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar select-none">
            {FILTER_PILLS.map((pill) => {
              const isActive = activeFilterPill === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActiveFilterPill(pill.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border',
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                  )}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="flex flex-col gap-3 bg-white p-3 rounded-3xl border border-slate-100">
                <div className="aspect-video w-full rounded-2xl bg-slate-200" />
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/2 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<UtensilsCrossed className="w-8 h-8 text-orange-500" />}
              title={`No kitchens match your selection in ${cityName}`}
              description={searchQuery ? 'Try searching with different keywords like Afang, Suya or Jollof.' : "Select 'All Places' to view all available food spots in Calabar."}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {filteredRestaurants.map((restaurant) => (
              <ChowdeckStoreCard
                key={restaurant.id}
                store={restaurant}
                aspectRatio="16/9"
              />
            ))}
          </div>
        )}
      </section>

      {/* 7. Item Customizer Drawer Modal */}
      <ItemCustomizerModal
        item={customizerItem}
        isOpen={Boolean(customizerItem)}
        onClose={() => setCustomizerItem(null)}
        orgName={customizerItem?.orgName}
      />

      {/* 8. Persistent Chowdeck Floating Order Basket Dock */}
      <ChowdeckBasketDock label="View Food Basket" />
    </div>
  );
}
