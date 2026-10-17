'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  UtensilsCrossed, 
  BedDouble, 
  ShoppingBag, 
  Calendar, 
  Wrench, 
  Briefcase, 
  Compass,
  Sparkles
} from 'lucide-react';
import { CITY_NOTES } from '@/lib/city-content';
import { useCity } from '@/components/cityos/CityProvider';
import CityPicker from '@/components/cityos/CityPicker';
import CityFeed from '@/components/cityos/CityFeed';
import AirbnbSearchCapsule from '@/components/cityos/AirbnbSearchCapsule';

import RealisticIcon from '@/components/ui/RealisticIcon';

import { PlatformVerticalsConfig, VerticalId } from '@/lib/actions/verticals-config';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

interface MenuItemDef {
  label: string;
  href: string;
  iconKey: string;
  fallbackIcon: any;
  verticalId?: VerticalId;
}

const TOP_MENU_ITEMS: MenuItemDef[] = [
  { 
    label: 'Food', 
    href: '/food', 
    iconKey: 'all',
    fallbackIcon: UtensilsCrossed,
    verticalId: 'food',
  },
  { 
    label: 'Stay', 
    href: '/stay', 
    iconKey: 'stay',
    fallbackIcon: BedDouble,
    verticalId: 'houses',
  },
  { 
    label: 'Shop', 
    href: '/market', 
    iconKey: 'shop',
    fallbackIcon: ShoppingBag,
    verticalId: 'shops',
  },
  { 
    label: 'Events', 
    href: '/events', 
    iconKey: 'events',
    fallbackIcon: Calendar,
    verticalId: 'events',
  },
  { 
    label: 'Services', 
    href: '/services', 
    iconKey: 'services',
    fallbackIcon: Wrench,
    verticalId: 'services',
  },
  { 
    label: 'Jobs', 
    href: '/jobs', 
    iconKey: 'jobs',
    fallbackIcon: Briefcase,
    verticalId: 'jobs',
  },
  { 
    label: 'Explore', 
    href: '/explore', 
    iconKey: 'explore',
    fallbackIcon: Compass,
  },
];

export default function CityHome({ 
  firstName,
  verticalsConfig,
}: { 
  firstName?: string;
  wallet?: { balance: number; currency: string } | null;
  verticalsConfig?: PlatformVerticalsConfig;
}) {
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';
  const [greet, setGreet] = useState('Good day');

  const visibleMenuItems = TOP_MENU_ITEMS.filter((item) => {
    if (!item.verticalId || !verticalsConfig) return true;
    return verticalsConfig[item.verticalId] !== false;
  });

  useEffect(() => {
    setGreet(greeting());
  }, []);

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500 pb-16">
      
      {/* Floating Airbnb Search Capsule */}
      <section className="pt-2">
        <AirbnbSearchCapsule />
      </section>

      {/* Top Menu Grid with Beautiful Icons (Food, Stay, Shop, Events, Services, Jobs, Explore) */}
      <section className="px-1">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 sm:gap-4">
          {visibleMenuItems.map((item) => {
            const FallbackIcon = item.fallbackIcon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group flex flex-col items-center gap-2 p-2 rounded-2xl transition-all duration-200"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-[#EBEBEB] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center p-2 text-[#222222] group-hover:border-[#222222] group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] group-hover:-translate-y-1 transition-all duration-200">
                  <RealisticIcon
                    name={item.iconKey}
                    size={38}
                    fallback={<FallbackIcon className="w-6 h-6 stroke-[1.9] text-[#222222]" />}
                    className="transition-transform duration-200 group-hover:scale-110"
                  />
                </div>
                <span className="text-[12px] font-bold text-[#222222] tracking-tight group-hover:text-black transition-colors text-center">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Context, Greeting & Live Weather (Balance removed per user request) */}
      <section className="px-1 pt-2">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#FF385C]" />
          <CityPicker className="text-[11px] font-black text-neutral-600 uppercase tracking-widest" />
          <span className="text-neutral-300">·</span>
          <span>{`${CITY_NOTES.weather.temp} ${CITY_NOTES.weather.label}`}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#222222]">
          {greet}{firstName ? `, ${firstName}.` : '.'}
        </h1>
        <p className="text-sm text-[#717171] mt-1 font-medium">
          Explore authentic food, verified stays, and local markets across {cityName}.
        </p>
      </section>

      {/* Community Feed / City Pulse Section */}
      <section className="space-y-6">
        <div className="px-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
            City Pulse
          </span>
          <h2 className="text-xl md:text-2xl font-black text-[#222222] tracking-tight mt-0.5">
            {`What's happening in ${cityName}`}
          </h2>
        </div>
        <CityFeed hideHeader />
      </section>
    </div>
  );
}
