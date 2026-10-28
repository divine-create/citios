'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChefHat, Clock, MapPin, ArrowLeft, ShoppingBag, Plus, Sparkles, UtensilsCrossed } from 'lucide-react';
import { FallbackImg, Stars, LocationRow, OpenBadge } from '@/components/cityos/CityUI';
import CityMismatchChip from '@/components/cityos/CityMismatchChip';
import { useMoney } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import ItemCustomizerModal, { CustomizableItem } from '@/components/cityos/ItemCustomizerModal';
import { cn } from '@/lib/utils';

interface MenuItemData {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  organizationId: string;
}

interface RestaurantData {
  id: string;
  name: string;
  type: string;
  description?: string;
  address?: string;
  citySlug?: string | null;
  imageUrl?: string;
  rating?: number | null;
  isOpen?: boolean;
  area?: string;
  deliveryEta?: string | null;
}

interface Props {
  restaurant: RestaurantData;
  location: any;
  menuItems: MenuItemData[];
  cityName: string;
}

export default function RestaurantStorefrontView({ restaurant, location, menuItems, cityName }: Props) {
  const { fmt } = useMoney();
  const { lines } = useCart();
  const [selectedItem, setSelectedItem] = useState<CustomizableItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Extract distinct categories in the menu
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const mi of menuItems) {
      if (mi.category) set.add(mi.category);
    }
    const list = Array.from(set);
    return ['All', ...(list.length > 0 ? list : ['Dishes', 'Drinks'])];
  }, [menuItems]);

  // Group items by category
  const groupedItems = useMemo(() => {
    if (activeCategory === 'All') {
      const map = new Map<string, MenuItemData[]>();
      for (const mi of menuItems) {
        const cat = mi.category || 'Specialties';
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push(mi);
      }
      return map;
    }
    const map = new Map<string, MenuItemData[]>();
    map.set(activeCategory, menuItems.filter((m) => (m.category || 'Specialties') === activeCategory));
    return map;
  }, [menuItems, activeCategory]);

  // Cart items from this restaurant
  const storeCartLines = useMemo(() => {
    return lines.filter((l) => l.orgId === restaurant.id);
  }, [lines, restaurant.id]);

  const storeCartCount = storeCartLines.reduce((acc, l) => acc + l.qty, 0);
  const storeCartTotal = storeCartLines.reduce((acc, l) => acc + l.price * l.qty, 0);

  const scrollToSection = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      window.scrollTo({ top: 320, behavior: 'smooth' });
      return;
    }
    const elem = document.getElementById(`section-${cat}`);
    if (elem) {
      const yOffset = -140; // account for sticky header & navigation tabs
      const y = elem.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6 pb-36 sm:pb-28 animate-in fade-in duration-500">
      {/* Top Breadcrumb */}
      <Link href="/food" className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-ink transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to CityFood
      </Link>

      {/* Restaurant Hero Card */}
      <div className="rounded-3xl overflow-hidden bg-white border border-slate-100 shadow-sm">
        <div className="relative h-48 md:h-64 w-full bg-slate-100">
          <FallbackImg
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            icon={
              <span className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <ChefHat className="w-8 h-8" />
              </span>
            }
          />
          <div className="absolute top-4 right-4">
            <OpenBadge open={restaurant.isOpen ?? true} />
          </div>
        </div>

        <div className="p-5 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{restaurant.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {restaurant.rating && restaurant.rating > 0 ? (
                  <>
                    <Stars rating={restaurant.rating} />
                    <span className="text-xs font-black text-slate-500">
                      {restaurant.rating.toFixed(1)} Rating
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-neutral-100 text-[#222222]">
                    Newly Listed
                  </span>
                )}
                <span className="text-slate-300">•</span>
                <span className="text-xs font-bold text-slate-500">{restaurant.area || cityName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-orange-50 text-orange-700 px-3 py-1.5 text-xs font-black border border-orange-100">
                <Clock className="w-3.5 h-3.5" />
                {restaurant.deliveryEta ? `${restaurant.deliveryEta} delivery` : 'Dine-in & Fast Takeout'}
              </span>
            </div>
          </div>

          <CityMismatchChip citySlug={restaurant.citySlug} label="This kitchen is located in" />

          {restaurant.description && (
            <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed max-w-3xl">
              {restaurant.description}
            </p>
          )}

          {location && (
            <LocationRow text={`${location.name ?? ''} · ${location.address ?? cityName}`} className="text-xs font-semibold text-slate-500" />
          )}
        </div>
      </div>

      {/* Sticky Category Tabs (Glovo Style) */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md -mx-4 px-4 md:mx-0 md:px-0 py-3 border-y border-slate-100 shadow-sm flex items-center gap-2 overflow-x-auto hide-scrollbar">
        {categories.map((c) => {
          const isActive = activeCategory === c;
          return (
            <button
              key={c}
              onClick={() => scrollToSection(c)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-2xl text-xs font-black transition-all select-none',
                isActive
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Menu Categories & Items */}
      {menuItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center bg-white">
          <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">Fresh dishes are being prepared</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
            This kitchen is setting up today's menu. Check back shortly or browse other Calabar kitchens.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(groupedItems.entries()).map(([categoryTitle, items]) => (
            <div key={categoryTitle} id={`section-${categoryTitle}`} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">{categoryTitle}</h2>
                <span className="text-xs font-bold text-slate-400">({items.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((mi) => (
                  <div
                    key={mi.id}
                    onClick={() => setSelectedItem({ ...mi, orgName: restaurant.name })}
                    className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex gap-4 group relative overflow-hidden"
                  >
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                      <FallbackImg
                        src={mi.imageUrl}
                        alt={mi.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        icon={<span className="text-base font-black text-slate-400">{mi.name.slice(0, 1)}</span>}
                      />
                    </div>

                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-orange-700 transition-colors">
                          {mi.name}
                        </h4>
                        {mi.description && (
                          <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-snug">
                            {mi.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm font-black text-orange-700">{fmt(mi.price)}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({ ...mi, orgName: restaurant.name });
                          }}
                          className="w-8 h-8 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white flex items-center justify-center transition-colors shadow-sm active:scale-95"
                          title="Customize & Add"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Bottom Checkout Bar */}
      {storeCartCount > 0 && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 left-0 right-0 z-50 px-4 max-w-lg mx-auto animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
          <Link
            href="/checkout"
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black text-sm flex items-center justify-between shadow-2xl shadow-orange-600/40 active:scale-[0.98] transition-all hover:brightness-105"
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-orange-100 font-bold">Checkout</p>
                <p className="text-sm font-black text-white">{storeCartCount} {storeCartCount === 1 ? 'item' : 'items'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-black">{fmt(storeCartTotal)}</span>
              <span className="text-xs bg-white text-orange-700 px-3 py-1.5 rounded-xl font-black">
                Checkout ➔
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Item Customizer Modal */}
      <ItemCustomizerModal
        item={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        orgName={restaurant.name}
      />
    </div>
  );
}
