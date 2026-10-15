'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  ArrowRight, 
  Sparkles, 
  BedDouble, 
  UtensilsCrossed, 
  Store, 
  ChevronRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { CITY_NOTES } from '@/lib/city-content';
import { useCity } from '@/components/cityos/CityProvider';
import CityPicker from '@/components/cityos/CityPicker';
import CityFeed from '@/components/cityos/CityFeed';
import AirbnbCard from '@/components/cityos/AirbnbCard';
import AirbnbSearchCapsule from '@/components/cityos/AirbnbSearchCapsule';
import AirbnbCategoryRail from '@/components/cityos/AirbnbCategoryRail';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function CityHome({ 
  firstName,
  wallet,
  hotels = [],
  restaurants = [],
}: { 
  firstName?: string;
  wallet?: { balance: number; currency: string } | null;
  hotels?: any[];
  restaurants?: any[];
}) {
  const router = useRouter();
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';
  const [greet, setGreet] = useState('Good day');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    setGreet(greeting());
  }, []);

  const handleCategorySelect = (catId: string) => {
    setActiveCategory(catId);
    if (catId === 'stays') {
      router.push('/stay');
    } else if (catId === 'soups' || catId === 'suya' || catId === 'cafes') {
      router.push('/food');
    } else if (catId === 'market') {
      router.push('/market');
    } else if (catId === 'services') {
      router.push('/services');
    }
  };

  // Top Stays (sample 4)
  const featuredHotels = hotels.slice(0, 4);

  // Top Food / Dining spots (sample 4)
  const featuredFood = restaurants.slice(0, 4);

  return (
    <div className="space-y-10 md:space-y-12 animate-in fade-in duration-500 pb-16">
      
      {/* Floating Airbnb Search Capsule */}
      <section className="pt-2">
        <AirbnbSearchCapsule />
      </section>

      {/* Airbnb Horizontal Category Rail */}
      <section className="-mt-3">
        <AirbnbCategoryRail 
          activeCategory={activeCategory}
          onSelectCategory={handleCategorySelect}
        />
      </section>

      {/* Context, Greeting & Live Weather */}
      <section className="px-1 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
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
        </div>

        {/* CityPay Resident Wallet Badge */}
        {wallet && (
          <Link
            href="/wallet"
            className="inline-flex items-center gap-3 bg-neutral-900 text-white px-5 py-3 rounded-2xl hover:bg-black transition-all shadow-md group shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#FF385C]">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">CityOS Wallet</p>
              <p className="text-sm font-black">
                {new Intl.NumberFormat('en-NG', { style: 'currency', currency: wallet.currency || 'NGN' }).format(wallet.balance / 100)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors ml-1" />
          </Link>
        )}
      </section>

      {/* SECTION 1: Boutique Stays & Weekend Escapes */}
      {featuredHotels.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between px-1">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#FF385C] flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5" />
                Hospitality
              </span>
              <h2 className="text-xl md:text-2xl font-black text-[#222222] tracking-tight">
                Places to stay in {cityName}
              </h2>
            </div>
            <Link
              href="/stay"
              className="text-xs font-bold text-[#222222] hover:text-[#FF385C] flex items-center gap-1 transition-colors"
            >
              <span>Show all ({hotels.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {featuredHotels.map((h, idx) => (
              <AirbnbCard
                key={h.id}
                id={h.id}
                href={`/stay/${h.id}`}
                title={h.name}
                subtitle={h.description || 'Verified boutique hospitality'}
                neighborhood={h.neighborhood || h.address || `${cityName} Metro`}
                image={h.storeCoverImage || h.image || h.logoAssetId}
                images={h.images}
                rating={h.rating || 4.85}
                badge={idx === 0 ? 'Guest favorite' : undefined}
                price={26000 + (idx * 4000)}
                priceSuffix="night"
                metaLine="Free cancellation · CityPay Verified"
                aspectRatio="4/3"
              />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: Calabar Dining, Soups & Grills */}
      {featuredFood.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between px-1">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#FF385C] flex items-center gap-1">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Kitchens & Lounges
              </span>
              <h2 className="text-xl md:text-2xl font-black text-[#222222] tracking-tight">
                Popular dining in {cityName}
              </h2>
            </div>
            <Link
              href="/food"
              className="text-xs font-bold text-[#222222] hover:text-[#FF385C] flex items-center gap-1 transition-colors"
            >
              <span>Show all ({restaurants.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {featuredFood.map((r, idx) => (
              <AirbnbCard
                key={r.id}
                id={r.id}
                href={`/food/${r.id}`}
                title={r.name}
                subtitle={r.description || 'Authentic local cuisine & fresh grills'}
                neighborhood={r.neighborhood || r.address || `${cityName}`}
                image={r.storeCoverImage || r.image || r.logoAssetId}
                images={r.images}
                rating={r.rating || 4.8}
                badge={idx === 0 ? 'Top Pick' : idx === 1 ? 'Fast Delivery' : undefined}
                price={2500 + (idx * 500)}
                priceSuffix="avg meal"
                metaLine="⚡ 25 - 35 min delivery · CityFood"
                aspectRatio="4/3"
              />
            ))}
          </div>
        </section>
      )}

      {/* Trust & Guarantee Banner */}
      <section className="rounded-3xl bg-neutral-100 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF385C]/10 text-[#FF385C] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-[16px] text-[#222222]">
              CityOS Resident Guarantee
            </h3>
            <p className="text-xs text-[#717171] mt-0.5 max-w-lg">
              All 211 scraped businesses are registered physical establishments in Calabar. Transactions are protected by CityPay escrow until receipt.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/explore"
            className="px-5 py-2.5 rounded-full bg-[#222222] text-white text-xs font-bold hover:bg-black transition-colors"
          >
            Explore All 211 Spots
          </Link>
        </div>
      </section>

      {/* Community Feed / City Pulse */}
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
