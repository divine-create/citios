'use client';

import { useState, useEffect, useMemo } from 'react';
import { UtensilsCrossed, MapPin, SlidersHorizontal, X, Check, Star, Zap, Clock, Bike, ArrowUpDown, RotateCcw } from 'lucide-react';
import { getCityFood } from '@/app/actions/food';
import { useCity } from '@/components/cityos/CityProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import ItemCustomizerModal, { CustomizableItem } from '@/components/cityos/ItemCustomizerModal';
import ChowdeckDeliveryHeader, { DeliveryHubOption, AreaOption } from '@/components/cityos/delivery/ChowdeckDeliveryHeader';
import ChowdeckCategoryBubbles, { CategoryBubbleItem, FOOD_CATEGORY_BUBBLES } from '@/components/cityos/delivery/ChowdeckCategoryBubbles';
import ChowdeckStoreCard, { StoreCardData } from '@/components/cityos/delivery/ChowdeckStoreCard';
import ChowdeckPopularDishCard, { PopularDishItem } from '@/components/cityos/delivery/ChowdeckPopularDishCard';
import ChowdeckBasketDock from '@/components/cityos/delivery/ChowdeckBasketDock';
import { doesRestaurantMatchCategory, normalizeCategoryId } from '@/lib/food-categories';
import { cn } from '@/lib/utils';

export default function CityFood() {
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';

  const [restaurants, setRestaurants] = useState<StoreCardData[]>([]);
  const [menuItems, setMenuItems] = useState<PopularDishItem[]>([]);
  const [categories, setCategories] = useState<CategoryBubbleItem[]>(FOOD_CATEGORY_BUBBLES);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [activeArea, setActiveArea] = useState('all');
  const [deliveryHubs, setDeliveryHubs] = useState<DeliveryHubOption[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);
  const [topSearchTags, setTopSearchTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states (Option C: Minimalist Search-First)
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBubble, setActiveBubble] = useState('all');
  const [activeSpeedFilter, setActiveSpeedFilter] = useState<'all' | 'fast'>('all');
  const [activeFeeFilter, setActiveFeeFilter] = useState<'all' | 'free'>('all');
  const [activeRatingFilter, setActiveRatingFilter] = useState<'all' | 'top'>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'fee' | 'fastest'>('recommended');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [customizerItem, setCustomizerItem] = useState<CustomizableItem | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('area');
      if (p) setActiveArea(p.toLowerCase());
    }
  }, []);

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
        if (data.areas && data.areas.length > 0) {
          setAreas(data.areas as AreaOption[]);
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

  // 1. Filter restaurants by Area first
  const areaFilteredRestaurants = useMemo(() => {
    if (activeArea === 'all') return restaurants;
    return restaurants.filter((r) => (r as any).areaSlug === activeArea);
  }, [restaurants, activeArea]);

  // 2. Standardized Backend Category Filter calculated specifically for the selected Area
  const areaCategories = useMemo(() => {
    if (activeArea === 'all') return categories;

    const countMap = new Map<string, number>();
    for (const r of areaFilteredRestaurants) {
      const catIds: string[] = (r as any).canonicalCategoryIds || [];
      for (const catId of catIds) {
        countMap.set(catId, (countMap.get(catId) || 0) + 1);
      }
    }

    return categories.map((cat) => {
      if (cat.id === 'all') {
        return { ...cat, count: areaFilteredRestaurants.length };
      }
      const normId = normalizeCategoryId(cat.id);
      const count = countMap.get(cat.id) || countMap.get(normId) || 0;
      return {
        ...cat,
        count,
      };
    });
  }, [categories, areaFilteredRestaurants, activeArea]);

  // 3. Final filtered and sorted restaurants
  const filteredRestaurants = useMemo(() => {
    let list = areaFilteredRestaurants.filter((r) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchDesc = r.description?.toLowerCase().includes(q);
        const matchCuisine = r.cuisines?.some((c) => c.toLowerCase().includes(q));
        const matchDishes = (r as any).menuItems?.some((m: any) => m.name?.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchCuisine && !matchDishes) return false;
      }

      // 2. Standardized Canonical Category Filter
      if (activeBubble !== 'all') {
        if (!doesRestaurantMatchCategory(r, activeBubble)) {
          return false;
        }
      }

      // 3. Speed Filter
      if (activeSpeedFilter === 'fast') {
        if (!r.isFastCourier && (!r.deliveryEta || (!r.deliveryEta.includes('15') && !r.deliveryEta.includes('20')))) return false;
      }

      // 4. Free Delivery Filter
      if (activeFeeFilter === 'free') {
        if (r.deliveryFee !== 0) return false;
      }

      // 5. Rating Filter
      if (activeRatingFilter === 'top') {
        if (!r.rating || r.rating < 4.7) return false;
      }

      return true;
    });

    // 6. Sorting
    if (sortBy === 'rating') {
      list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'fee') {
      list = [...list].sort((a, b) => (a.deliveryFee || 0) - (b.deliveryFee || 0));
    } else if (sortBy === 'fastest') {
      list = [...list].sort((a, b) => {
        const aMin = parseInt(a.deliveryEta?.split('-')[0] || '99', 10);
        const bMin = parseInt(b.deliveryEta?.split('-')[0] || '99', 10);
        return aMin - bMin;
      });
    }

    return list;
  }, [areaFilteredRestaurants, searchQuery, activeBubble, activeSpeedFilter, activeFeeFilter, activeRatingFilter, sortBy, areaCategories]);

  // Count active secondary filters (excluding search query)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeArea !== 'all') count += 1;
    if (activeSpeedFilter !== 'all') count += 1;
    if (activeFeeFilter !== 'all') count += 1;
    if (activeRatingFilter !== 'all') count += 1;
    if (sortBy !== 'recommended') count += 1;
    return count;
  }, [activeArea, activeSpeedFilter, activeFeeFilter, activeRatingFilter, sortBy]);

  const resetAllFilters = () => {
    setActiveArea('all');
    setActiveBubble('all');
    setActiveSpeedFilter('all');
    setActiveFeeFilter('all');
    setActiveRatingFilter('all');
    setSortBy('recommended');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-32">
      {/* 1. Chowdeck Delivery Location & Google/Glovo Search Bar */}
      <ChowdeckDeliveryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder={`Search restaurants or dishes in ${cityName}...`}
        trendingTags={topSearchTags}
        onSelectTag={(tag) => setSearchQuery(tag)}
        areas={areas}
        activeAreaId={activeArea}
        onSelectArea={(areaId) => {
          setActiveArea(areaId);
          setActiveBubble('all');
        }}
        deliveryHubs={deliveryHubs}
        defaultAddress={defaultAddress}
      />

      {/* 2. Glovo Category Circles Carousel (Dynamically scoped to active area) */}
      {!searchQuery && areaCategories.length > 1 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Cuisines & Categories {activeArea !== 'all' && `· ${areas.find((a) => a.id === activeArea)?.shortName || 'Area'}`}
            </h3>
            {activeBubble !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveBubble('all')}
                className="text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                Reset to All Cuisines
              </button>
            )}
          </div>

          <ChowdeckCategoryBubbles
            categories={areaCategories}
            activeCategoryId={activeBubble}
            onSelectCategory={(id) => {
              setActiveBubble(id);
            }}
            variant="capsule"
          />
        </section>
      )}

      {/* 3. Popular Dishes Rail (Compact & uncrowded) */}
      {!searchQuery && activeBubble === 'all' && activeFiltersCount === 0 && menuItems.length > 0 && (
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
            {menuItems.slice(0, 10).map((item) => {
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

      {/* 4. MAIN RESTAURANT FEED: Streamlined Header with Single Filters Button */}
      <section className="space-y-4 pt-1">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : activeBubble !== 'all'
                ? `${categories.find((b) => b.id === activeBubble)?.label || 'Selected Cuisines'}`
                : activeArea !== 'all'
                ? `Kitchens in ${areas.find((a) => a.id === activeArea)?.name || 'Selected Area'}`
                : `All Restaurants in ${cityName}`}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {filteredRestaurants.length} kitchen{filteredRestaurants.length === 1 ? '' : 's'} available
              {activeArea !== 'all' && ` · ${areas.find((a) => a.id === activeArea)?.shortName || 'Area'}`}
            </p>
          </div>

          {/* Unified Filters Trigger Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className={cn(
                'flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-black transition-all border shadow-2xs active:scale-95 shrink-0',
                activeFiltersCount > 0
                  ? 'bg-slate-900 text-white border-slate-900 shadow-slate-900/10'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-orange-600 text-white font-black text-[10px] flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filter Badges Bar (Dismissible chips) */}
        {(activeFiltersCount > 0 || activeBubble !== 'all') && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1">Active:</span>
            
            {activeArea !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveArea('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 text-orange-900 border border-orange-200 text-xs font-bold hover:bg-orange-100 transition-colors"
              >
                <MapPin className="w-3 h-3 text-orange-600" />
                <span>{areas.find((a) => a.id === activeArea)?.shortName || 'Area'}</span>
                <X className="w-3 h-3 text-orange-700" />
              </button>
            )}

            {activeBubble !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveBubble('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 text-white border border-slate-900 text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                <span>{areaCategories.find((c) => c.id === activeBubble)?.shortLabel || 'Cuisine'}</span>
                <X className="w-3 h-3 text-slate-300" />
              </button>
            )}

            {activeSpeedFilter === 'fast' && (
              <button
                type="button"
                onClick={() => setActiveSpeedFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                <Zap className="w-3 h-3 text-blue-600" />
                <span>Under 25 mins</span>
                <X className="w-3 h-3 text-blue-700" />
              </button>
            )}

            {activeFeeFilter === 'free' && (
              <button
                type="button"
                onClick={() => setActiveFeeFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                <Bike className="w-3 h-3 text-emerald-600" />
                <span>Free Delivery</span>
                <X className="w-3 h-3 text-emerald-700" />
              </button>
            )}

            {activeRatingFilter === 'top' && (
              <button
                type="button"
                onClick={() => setActiveRatingFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                <span>Top Rated (4.7+)</span>
                <X className="w-3 h-3 text-amber-700" />
              </button>
            )}

            {sortBy !== 'recommended' && (
              <button
                type="button"
                onClick={() => setSortBy('recommended')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                <ArrowUpDown className="w-3 h-3 text-slate-500" />
                <span>
                  {sortBy === 'rating' ? 'Highest Rated' : sortBy === 'fastest' ? 'Fastest' : 'Lowest Fee'}
                </span>
                <X className="w-3 h-3 text-slate-600" />
              </button>
            )}

            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs font-black text-orange-600 hover:text-orange-700 ml-1 underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}

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
              title={
                activeArea !== 'all'
                  ? `No kitchens found in ${areas.find((a) => a.id === activeArea)?.name || 'this area'}`
                  : `No restaurants match your selection in ${cityName}`
              }
              description={
                activeArea !== 'all'
                  ? 'Try switching to All Areas to browse kitchens delivering across the entire city.'
                  : searchQuery
                  ? 'Try searching for dishes like Rice, Soup, or Shawarma.'
                  : "Try clearing some filters to view all available food spots."
              }
              action={
                activeFiltersCount > 0 || activeBubble !== 'all'
                  ? {
                      label: `Reset All Filters`,
                      onClick: resetAllFilters,
                    }
                  : undefined
              }
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

      {/* 5. Minimalist Filter Modal (Glovo / DoorDash Style) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-orange-600" />
                <h3 className="text-base font-black text-slate-900">Filters & Sorting</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* 1. Area Selector */}
              {areas.length > 1 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    City Area / District ({cityName})
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {areas.map((a) => {
                      const isSelected = activeArea === a.id || (activeArea === 'all' && a.id === 'all');
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setActiveArea(a.id)}
                          className={cn(
                            'p-2.5 rounded-xl text-left border transition-all flex items-center justify-between font-bold',
                            isSelected
                              ? 'bg-orange-50 border-orange-500 text-orange-950 shadow-2xs'
                              : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                          )}
                        >
                          <span className="truncate">{a.shortName || a.name}</span>
                          {typeof a.count === 'number' && (
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                              isSelected ? 'bg-orange-200 text-orange-900' : 'bg-slate-200 text-slate-600'
                            )}>
                              {a.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Sort By */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Sort Kitchens By
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'recommended', label: 'Recommended' },
                    { id: 'fastest', label: 'Fastest Delivery' },
                    { id: 'rating', label: 'Highest Rated (★)' },
                    { id: 'fee', label: 'Lowest Delivery Fee' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSortBy(s.id as any)}
                      className={cn(
                        'p-2.5 rounded-xl text-left border transition-all font-bold flex items-center justify-between',
                        sortBy === s.id
                          ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                      )}
                    >
                      <span>{s.label}</span>
                      {sortBy === s.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Delivery Speed */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Delivery Speed
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSpeedFilter('all')}
                    className={cn(
                      'flex-1 p-2.5 rounded-xl border text-center font-bold transition-all',
                      activeSpeedFilter === 'all'
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    Any Speed
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSpeedFilter('fast')}
                    className={cn(
                      'flex-1 p-2.5 rounded-xl border text-center font-bold transition-all flex items-center justify-center gap-1.5',
                      activeSpeedFilter === 'fast'
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>Under 25 mins</span>
                  </button>
                </div>
              </div>

              {/* 4. Delivery Pricing */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Delivery Pricing
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFeeFilter('all')}
                    className={cn(
                      'flex-1 p-2.5 rounded-xl border text-center font-bold transition-all',
                      activeFeeFilter === 'all'
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    Any Fee
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFeeFilter('free')}
                    className={cn(
                      'flex-1 p-2.5 rounded-xl border text-center font-bold transition-all flex items-center justify-center gap-1.5',
                      activeFeeFilter === 'free'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>Free Delivery</span>
                  </button>
                </div>
              </div>

              {/* 5. Rating Criteria */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Kitchen Ratings
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveRatingFilter('all')}
                    className={cn(
                      'flex-1 p-2.5 rounded-xl border text-center font-bold transition-all',
                      activeRatingFilter === 'all'
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    Any Rating
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveRatingFilter('top')}
                    className={cn(
                      'flex-1 p-2.5 rounded-xl border text-center font-bold transition-all flex items-center justify-center gap-1.5',
                      activeRatingFilter === 'top'
                        ? 'bg-amber-600 border-amber-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    <span>Top Rated (4.7+)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveArea('all');
                  setActiveSpeedFilter('all');
                  setActiveFeeFilter('all');
                  setActiveRatingFilter('all');
                  setSortBy('recommended');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black transition-all shadow-md shadow-orange-600/20 active:scale-95"
              >
                Apply ({filteredRestaurants.length} Kitchens)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Item Customizer Drawer Modal */}
      <ItemCustomizerModal
        item={customizerItem}
        isOpen={Boolean(customizerItem)}
        onClose={() => setCustomizerItem(null)}
        orgName={customizerItem?.orgName}
      />

      {/* 7. Persistent Floating Checkout Dock */}
      <ChowdeckBasketDock label="Checkout" />
    </div>
  );
}
