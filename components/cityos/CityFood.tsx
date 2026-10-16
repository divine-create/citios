'use client';

import { useState, useEffect, useMemo } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { getCityFood } from '@/app/actions/food';
import { useCity } from '@/components/cityos/CityProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import ItemCustomizerModal, { CustomizableItem } from '@/components/cityos/ItemCustomizerModal';
import ChowdeckDeliveryHeader, { DeliveryHubOption } from '@/components/cityos/delivery/ChowdeckDeliveryHeader';
import ChowdeckCategoryBubbles, { CategoryBubbleItem, FOOD_CATEGORY_BUBBLES } from '@/components/cityos/delivery/ChowdeckCategoryBubbles';
import ChowdeckStoreCard, { StoreCardData } from '@/components/cityos/delivery/ChowdeckStoreCard';
import ChowdeckPopularDishCard, { PopularDishItem } from '@/components/cityos/delivery/ChowdeckPopularDishCard';
import ChowdeckBasketDock from '@/components/cityos/delivery/ChowdeckBasketDock';
import { cn } from '@/lib/utils';

const FILTER_PILLS = [
  { id: 'all', label: 'All Places' },
  { id: 'fast', label: 'Under 25 mins' },
  { id: 'free_delivery', label: 'Free Delivery' },
  { id: 'top_rated', label: 'Top Rated (4.7+)' },
];

export default function CityFood() {
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';

  const [restaurants, setRestaurants] = useState<StoreCardData[]>([]);
  const [menuItems, setMenuItems] = useState<PopularDishItem[]>([]);
  const [categories, setCategories] = useState<CategoryBubbleItem[]>(FOOD_CATEGORY_BUBBLES);
  const [deliveryHubs, setDeliveryHubs] = useState<DeliveryHubOption[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);
  const [topSearchTags, setTopSearchTags] = useState<string[]>([]);
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
        if (data.categories && data.categories.length > 0) {
          setCategories(data.categories as CategoryBubbleItem[]);
        }
        if (data.deliveryHubs) {
          setDeliveryHubs(data.deliveryHubs as DeliveryHubOption[]);
        }
        if (data.defaultAddress) {
          setDefaultAddress(data.defaultAddress);
        }
        if (data.topSearchTags && data.topSearchTags.length > 0) {
          setTopSearchTags(data.topSearchTags);
        }
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
        const matchDishes = (r as any).menuItems?.some((m: any) => m.name?.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchCuisine && !matchDishes) return false;
      }

      // 2. Dynamic Backend Category Filter
      if (activeBubble !== 'all') {
        const selectedCat = categories.find((c) => c.id === activeBubble);
        const catLabel = selectedCat?.label?.toLowerCase();
        if (catLabel) {
          const matchCategory = r.category?.toLowerCase() === catLabel || (r as any).storeCategory?.toLowerCase() === catLabel;
          const matchCuisine = r.cuisines?.some((c: string) => c.toLowerCase() === catLabel || c.toLowerCase().includes(catLabel));
          const matchDishes = (r as any).menuItems?.some((m: any) => m.category?.toLowerCase() === catLabel || m.name?.toLowerCase().includes(catLabel));
          if (!matchCategory && !matchCuisine && !matchDishes) return false;
        }
      }

      // 3. Quick Filter Pill
      if (activeFilterPill === 'fast') {
        if (!r.isFastCourier && (!r.deliveryEta || (!r.deliveryEta.includes('15') && !r.deliveryEta.includes('20')))) return false;
      } else if (activeFilterPill === 'free_delivery') {
        if (r.deliveryFee !== 0) return false;
      } else if (activeFilterPill === 'top_rated') {
        if (!r.rating || r.rating < 4.7) return false;
      }

      return true;
    });
  }, [restaurants, searchQuery, activeBubble, activeFilterPill, categories]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-32">
      {/* 1. Chowdeck Delivery Location & Search Bar */}
      <ChowdeckDeliveryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder={`Search restaurants or dishes in ${cityName}...`}
        trendingTags={topSearchTags}
        onSelectTag={(tag) => setSearchQuery(tag)}
        deliveryHubs={deliveryHubs}
        defaultAddress={defaultAddress}
      />

      {/* 2. Cuisines & Categories */}
      {!searchQuery && categories.length > 1 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cuisines & Categories
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
            categories={categories}
            activeCategoryId={activeBubble}
            onSelectCategory={(id) => {
              setActiveBubble(id);
              setActiveFilterPill('all');
            }}
          />
        </section>
      )}

      {/* 3. Popular Dishes Rail */}
      {!searchQuery && activeBubble === 'all' && menuItems.length > 0 && (
        <section className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Popular Dishes
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Top choices from verified kitchens in {cityName}
              </p>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar snap-x">
            {menuItems.slice(0, 12).map((item) => {
              const vendor = restaurants.find((r) => r.id === item.organizationId);

              return (
                <div key={item.id} className="snap-start shrink-0">
                  <ChowdeckPopularDishCard
                    dish={{
                      ...item,
                      orgName: vendor?.name || 'Kitchen',
                    }}
                    onCustomize={(dish) => {
                      setCustomizerItem(dish);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. MAIN RESTAURANT FEED: All Restaurants */}
      <section className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : activeBubble !== 'all'
                ? `${categories.find((b) => b.id === activeBubble)?.label || 'Selected Cuisines'}`
                : `All Restaurants in ${cityName}`}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {filteredRestaurants.length} kitchen{filteredRestaurants.length === 1 ? '' : 's'} available
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="flex flex-col gap-3 bg-white p-3 rounded-2xl border border-slate-100">
                <div className="aspect-video w-full rounded-xl bg-slate-200" />
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/2 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<UtensilsCrossed className="w-8 h-8 text-orange-500" />}
              title={`No restaurants match your selection in ${cityName}`}
              description={searchQuery ? 'Try searching for dishes like Rice, Soup, or Shawarma.' : "Select 'All Places' to view all available food spots."}
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

      {/* 5. Item Customizer Drawer Modal */}
      <ItemCustomizerModal
        item={customizerItem}
        isOpen={Boolean(customizerItem)}
        onClose={() => setCustomizerItem(null)}
        orgName={customizerItem?.orgName}
      />

      {/* 6. Persistent Chowdeck Floating Order Basket Dock */}
      <ChowdeckBasketDock label="View Food Basket" />
    </div>
  );
}
