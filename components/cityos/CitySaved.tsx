'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import { Bookmark, Heart } from 'lucide-react';
import { DEMO_BUSINESSES, DEMO_PRODUCTS, DEMO_PROPERTIES, DEMO_EVENTS, getBusiness, fmtNaira } from '@/lib/demo/cityos';
import { CITY_JOBS } from '@/lib/demo/universe/jobs';
import { CityCard, FallbackImg, Stars, Pill, LocationRow, DemoBanner, OpenBadge } from '@/components/cityos/CityUI';

const SAVED_KEY = 'cityos-demo-saved';
const SAVED_PRODUCTS = ['q01', 'q02', 'p16', 'p08', 'p10'];
const SAVED_JOBS = CITY_JOBS.slice(0, 3).map((j) => j.id);
const SAVED_EVENTS = DEMO_EVENTS.slice(0, 3).map((e) => e.id);
const SAVED_PLACES = DEMO_PROPERTIES.filter((p) => p.featured).slice(0, 2).map((p) => p.id);
const SAVED_BIZ = ['calabar-fresh', 'mamas-kitchen', 'medline-pharmacy'];

export default function CitySaved() {
  const [savedBiz, setSavedBiz] = useState<string[]>(SAVED_BIZ);
  const [savedProducts, setSavedProducts] = useState<string[]>(SAVED_PRODUCTS);
  const [savedJobs, setSavedJobs] = useState<string[]>(SAVED_JOBS);
  const [savedEvents, setSavedEvents] = useState<string[]>(SAVED_EVENTS);
  const [savedPlaces, setSavedPlaces] = useState<string[]>(SAVED_PLACES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(SAVED_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (Array.isArray(data.biz)) setSavedBiz(data.biz);
          if (Array.isArray(data.products)) setSavedProducts(data.products);
          if (Array.isArray(data.jobs)) setSavedJobs(data.jobs);
          if (Array.isArray(data.events)) setSavedEvents(data.events);
          if (Array.isArray(data.places)) setSavedPlaces(data.places);
        }
      } catch {
        // ignore
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const persist = (biz: string[], products: string[], jobs: string[], events: string[], places: string[]) => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify({ biz, products, jobs, events, places }));
    } catch {
      // ignore
    }
  };

  const toggle = (bucket: 'biz' | 'products' | 'jobs' | 'events' | 'places', id: string) => {
    const maps = { biz: savedBiz, products: savedProducts, jobs: savedJobs, events: savedEvents, places: savedPlaces };
    const setter: Record<typeof bucket, Dispatch<SetStateAction<string[]>>> = {
      biz: setSavedBiz,
      products: setSavedProducts,
      jobs: setSavedJobs,
      events: setSavedEvents,
      places: setSavedPlaces,
    };
    const list = maps[bucket];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    setter[bucket](next);
    const nextAll = {
      biz: bucket === 'biz' ? next : savedBiz,
      products: bucket === 'products' ? next : savedProducts,
      jobs: bucket === 'jobs' ? next : savedJobs,
      events: bucket === 'events' ? next : savedEvents,
      places: bucket === 'places' ? next : savedPlaces,
    };
    persist(nextAll.biz, nextAll.products, nextAll.jobs, nextAll.events, nextAll.places);
  };

  const holder = (label: string, count: number) =>
    count === 0 ? (
      <p className="col-span-full text-sm font-bold text-slate-300 py-2">Nothing saved here yet.</p>
    ) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-teal-800" /> Saved
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Businesses, products, jobs, events and places you have saved across CityOS. Stored on this device — demo only.
        </p>
      </div>

      <DemoBanner />

      {/* Businesses */}
      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Businesses
          <span className="text-[11px] font-bold text-slate-400">{savedBiz.length}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMO_BUSINESSES.filter((b) => savedBiz.includes(b.slug)).map((b) => (
            <CityCard key={b.slug} href={`/biz/${b.slug}`} className="flex flex-col">
              <FallbackImg src={b.cover} alt={b.name} className="h-28 w-full" />
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-ink truncate">{b.name}</p>
                    <LocationRow text={b.area} className="text-[10px]" />
                  </div>
                  <Stars rating={b.rating} className="shrink-0" />
                </div>
                <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{b.tagline}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <OpenBadge open={b.isOpen} />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggle('biz', b.slug);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <Heart className="w-3 h-3 fill-current" /> Unsave
                  </button>
                </div>
              </div>
            </CityCard>
          ))}
          {holder('businesses', savedBiz.length)}
        </div>
      </section>

      {/* Products */}
      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Products
          <span className="text-[11px] font-bold text-slate-400">{savedProducts.length}</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DEMO_PRODUCTS.filter((p) => savedProducts.includes(p.id)).map((p) => {
            const biz = getBusiness(p.bizSlug);
            return (
              <CityCard key={p.id} href={`/product/${p.id}`} className="p-3 flex flex-col gap-1.5">
                <FallbackImg src={p.image} alt={p.name} className="h-20 w-full rounded-xl" icon={<span className="text-sm font-black">{p.name.slice(0, 1)}</span>} />
                <p className="text-[12px] font-black text-ink leading-snug line-clamp-1">{p.name}</p>
                <p className="text-[10px] font-bold text-slate-400 truncate">{biz?.name}</p>
                <div className="flex items-center justify-between mt-auto">
                  <p className="text-[13px] font-black text-teal-900">{fmtNaira(p.price)}</p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggle('products', p.id);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <Heart className="w-3 h-3 fill-current" />
                  </button>
                </div>
              </CityCard>
            );
          })}
          {holder('products', savedProducts.length)}
        </div>
      </section>

      {/* Jobs */}
      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Jobs
          <span className="text-[11px] font-bold text-slate-400">{savedJobs.length}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CITY_JOBS.filter((j) => savedJobs.includes(j.id)).map((j) => (
            <CityCard key={j.id} href={`/jobs/${j.id}`} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{j.title}</p>
                  <p className="text-[11px] font-bold text-slate-400 truncate">{j.orgName}</p>
                </div>
                <Pill tone="blue">{j.type}</Pill>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] font-black text-teal-800">{j.pay}</span>
                <span className="text-[10px] font-bold text-slate-400">· {j.area}</span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggle('jobs', j.id);
                }}
                className="mt-3 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <Heart className="w-3 h-3 fill-current" /> Unsave
              </button>
            </CityCard>
          ))}
          {holder('jobs', savedJobs.length)}
        </div>
      </section>

      {/* Events */}
      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Events
          <span className="text-[11px] font-bold text-slate-400">{savedEvents.length}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DEMO_EVENTS.filter((ev) => savedEvents.includes(ev.id)).map((ev) => (
            <CityCard key={ev.id} href={`/events/${ev.id}`} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{ev.title}</p>
                  <p className="text-[11px] font-bold text-slate-400 truncate">{ev.venue}</p>
                </div>
                <Pill tone="orange">{ev.date}</Pill>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] font-black text-teal-800">{ev.time}</span>
                <span className="text-[10px] font-bold text-slate-400">· {ev.price}</span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggle('events', ev.id);
                }}
                className="mt-3 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <Heart className="w-3 h-3 fill-current" /> Unsave
              </button>
            </CityCard>
          ))}
          {holder('events', savedEvents.length)}
        </div>
      </section>

      {/* Places */}
      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Places & properties
          <span className="text-[11px] font-bold text-slate-400">{savedPlaces.length}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {DEMO_PROPERTIES.filter((p) => savedPlaces.includes(p.id)).map((p) => (
            <CityCard key={p.id} href={`/house/${p.id}`} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{p.title}</p>
                  <p className="text-[11px] font-bold text-slate-400 truncate">{p.area}</p>
                </div>
                <Pill tone="teal">{p.type}</Pill>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] font-black text-teal-800">{fmtNaira(p.pricePerYear)}/yr</span>
                <span className="text-[10px] font-bold text-slate-400">· {p.bedrooms} bed</span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggle('places', p.id);
                }}
                className="mt-3 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <Heart className="w-3 h-3 fill-current" /> Unsave
              </button>
            </CityCard>
          ))}
          {holder('places', savedPlaces.length)}
        </div>
      </section>

      {hydrated && savedBiz.length + savedProducts.length + savedJobs.length + savedEvents.length + savedPlaces.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <p className="text-sm font-bold text-slate-500">Nothing saved yet.</p>
          <p className="text-xs text-slate-400 mt-1">Browse the Market, Food, Jobs, Events or Homes to start collecting.</p>
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            <Link href="/market" className="px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">Shop the market</Link>
            <Link href="/jobs" className="px-4 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 text-xs font-black hover:ring-teal-300">Find jobs</Link>
            <Link href="/house" className="px-4 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 text-xs font-black hover:ring-teal-300">Browse homes</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}