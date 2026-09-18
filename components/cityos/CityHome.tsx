'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, Store, Utensils, Wrench, Briefcase, Home, Calendar, Grip } from 'lucide-react';
import { CITY_NOTES } from '@/lib/city-content';
import { useCity } from '@/components/cityos/CityProvider';
import CityPicker from '@/components/cityos/CityPicker';
import CityFeed from '@/components/cityos/CityFeed';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function CityHome({ firstName }: { firstName?: string }) {
  const { city } = useCity();
  const cityName = city?.name ?? 'CityOS';
  const [greet, setGreet] = useState('Good day');
  useEffect(() => {
    setGreet(greeting());
  }, []);

  return (
    <div className="space-y-10 md:space-y-12 animate-in fade-in duration-500 pb-10">
      
      {/* City Context & Greeting */}
      <section className="pt-4 px-1">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
          <MapPin className="w-3 h-3" />
          <CityPicker className="text-[11px] font-black text-slate-500 uppercase tracking-widest" />
          {` · ${CITY_NOTES.weather.temp} ${CITY_NOTES.weather.label}`}
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-ink">
          {greet}{firstName ? `, ${firstName}.` : '.'}
        </h1>
      </section>

      {/* What do you need? */}
      <section className="space-y-6">
        <h2 className="text-xl font-black text-ink px-1">What do you need?</h2>
        
        {/* Search */}
        <Link 
          href="/explore" 
          className="flex items-center gap-3 w-full bg-slate-100 text-slate-500 rounded-2xl p-4 hover:bg-slate-200 transition-colors"
        >
          <Search className="w-5 h-5 text-slate-400" />
          <span className="flex-1 text-sm font-medium">Search CityOS</span>
        </Link>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-y-6 gap-x-2">
          {[
            { label: 'Food', href: '/food', icon: Utensils },
            { label: 'Shop', href: '/market', icon: Store },
            { label: 'Services', href: '/services', icon: Wrench },
            { label: 'Jobs', href: '/jobs', icon: Briefcase },
            { label: 'Homes', href: '/house', icon: Home },
            { label: 'Events', href: '/events', icon: Calendar },
            { label: 'More', href: '/explore', icon: Grip },
          ].map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center group-hover:bg-teal-100 transition-colors shrink-0">
                <q.icon className="w-6 h-6 opacity-80 group-hover:opacity-100" />
              </div>
              <span className="text-[11px] font-bold text-slate-600 group-hover:text-ink transition-colors">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="w-full h-px bg-slate-100" />

      {/* Newsfeed Section */}
      <section className="space-y-6">
        <h2 className="text-xl font-black text-ink px-1">{`What's happening in ${cityName}`}</h2>
        <CityFeed hideHeader />
      </section>
    </div>
  );
}
