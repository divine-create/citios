'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, MapPin, PartyPopper, ShieldAlert, Plus } from 'lucide-react';
import {
  CITY_CATEGORIES,
  DEMO_EVENTS,
  DEMO_BUSINESSES,
  DEMO_PRODUCTS,
  DEMO_PROPERTIES,
  DEMO_POSTS,
  CITY_NOTES,
  DEMO_USER,
  fmtNaira,
} from '@/lib/demo/cityos';
import { CityCard, FallbackImg, SectionHead, Stars, Pill, LocationRow, OpenBadge, PriceTag, DemoBanner } from '@/components/cityos/CityUI';
import { useCart } from '@/components/cityos/CartStore';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function CityHome() {
  const { add } = useCart();
  const [greet, setGreet] = useState('Good day');
  useEffect(() => {
    setGreet(greeting());
  }, []);
  const featuredBiz = DEMO_BUSINESSES.slice(0, 6);
  const fresh = DEMO_PRODUCTS.slice(0, 6);
  const stays = DEMO_PROPERTIES.filter((p) => p.featured);
  const feedTeaser = DEMO_POSTS.slice(0, 6);

  return (
    <div className="space-y-8 md:space-y-10 animate-in fade-in duration-500">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950 via-teal-900 to-teal-700 text-white p-6 md:p-10">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-72 h-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute right-10 bottom-6 hidden md:flex gap-3 opacity-20">
          <span className="text-[120px] leading-none font-black">O7</span>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[10px] font-black uppercase tracking-widest">
              <MapPin className="w-3 h-3" />
              {`${DEMO_USER.area} · ${CITY_NOTES.weather.temp} ${CITY_NOTES.weather.label}`}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/90 text-[10px] font-black uppercase tracking-widest">
              <PartyPopper className="w-3 h-3" />
              {CITY_NOTES.weather.note}
            </span>
          </div>

          <h1 className="mt-5 text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
            {greet}, {DEMO_USER.name.split(' ')[0]}.
          </h1>
          <p className="mt-3 text-teal-50/85 text-sm md:text-base font-medium max-w-xl leading-relaxed">
            {`One city, one app. ${CITY_NOTES.greeting} Markets, rides, housing, payments and everything your day needs — on Calabar time.`}
          </p>

          {/* AI search bar */}
          <Link
            href="/ai"
            className="mt-6 group flex items-center gap-3 w-full max-w-2xl bg-white/95 text-slate-700 rounded-2xl p-2 pr-2 pl-4 shadow-xl shadow-teal-950/20 hover:shadow-2xl transition-all"
          >
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="flex-1 text-[13px] font-medium text-slate-500 truncate">
              {CITY_NOTES.aiPlaceholder}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-800 text-white text-[11px] font-bold">
              Ask CityOS
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
            <span className="sm:hidden px-3 py-1.5 rounded-lg bg-teal-800 text-white text-[11px] font-bold">Ask</span>
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] font-bold text-teal-100/70">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 47 marketplaces live
            </span>
            <span>/</span>
            <span>26 riders on the road</span>
            <span>/</span>
            <span>41 homes to visit</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <SectionHead title="What do you need?" sub="Move through the city in one place" more="Explore all" moreHref="/explore" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CITY_CATEGORIES.map((c) => (
            <CityCard
              key={c.id}
              href={c.href}
              className="p-4 md:p-5 flex flex-col gap-3"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 ring-1 ring-teal-100/80 text-teal-800 flex items-center justify-center">
                <c.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[13px] font-black text-ink">{c.label}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-snug">{c.desc}</p>
              </div>
            </CityCard>
          ))}
        </div>
      </section>

      {/* Happening in Calabar */}
      <section>
        <SectionHead
          title="Happening in Calabar"
          sub="Events, rehearsals and market days"
          more="All events" moreHref="/services/events"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEMO_EVENTS.map((e) => (
            <CityCard key={e.id} href="/services/events" className="flex flex-col">
              <FallbackImg src={e.image} alt={e.title} className="h-32 w-full" />
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Pill tone="orange">{e.tag}</Pill>
                  <span className="text-[10px] font-bold text-slate-400">{e.price}</span>
                </div>
                <p className="text-[13px] font-black text-ink leading-snug line-clamp-2">{e.title}</p>
                <div className="mt-auto flex items-center justify-between pt-1">
                  <LocationRow text={e.venue.split(',')[0]} className="text-[10px] max-w-[60%] truncate" />
                  <span className="text-[10px] font-black text-teal-800 uppercase">{`${e.date} · ${e.time}`}</span>
                </div>
              </div>
            </CityCard>
          ))}
        </div>
      </section>

      {/* Popular businesses */}
      <section>
        <SectionHead
          title={CITY_NOTES.topPickTitle}
          sub="Marketplaces you can trust across the city"
          more="See all" moreHref="/explore"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredBiz.map((b) => (
            <CityCard key={b.slug} href={`/biz/${b.slug}`} className="flex flex-col">
              <FallbackImg src={b.cover} alt={b.name} className="h-36 w-full" />
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-black text-ink truncate">{b.name}</p>
                    <LocationRow text={`${b.area} · ${b.category}`} className="text-[10px]" />
                  </div>
                  <Stars rating={b.rating} className="shrink-0" />
                </div>
                <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{b.tagline}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <OpenBadge open={b.isOpen} />
                  <Pill tone="blue">{`CityDrive ${b.deliveryEta} min`}</Pill>
                </div>
              </div>
            </CityCard>
          ))}
        </div>
      </section>

      {/* Fresh from the market */}
      <section>
        <SectionHead
          title="Fresh from the market"
          sub="Weighed, priced in naira, and out with a rider"
          more="Shop all" moreHref="/explore?cat=food"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {fresh.map((p) => {
            const biz = DEMO_BUSINESSES.find((b) => b.slug === p.bizSlug);
            return (
              <CityCard key={p.id} href={`/product/${p.id}`} className="flex flex-col">
                <div className="relative">
                  <FallbackImg src={p.image} alt={p.name} className="h-36 w-full" />
                  {p.tag ? (
                    <span className="absolute top-2 right-2">
                      <Pill tone={p.tag === 'promo' ? 'orange' : p.tag === 'local' ? 'green' : 'teal'}>
                        {p.tag === 'best' ? 'Best seller' : p.tag === 'promo' ? 'Promo' : p.tag === 'local' ? 'Local' : 'New'}
                      </Pill>
                    </span>
                  ) : null}
                </div>
                <div className="p-3.5 flex-1 flex flex-col gap-1.5">
                  <p className="text-[12px] font-bold text-slate-400 truncate">{biz?.name}</p>
                  <p className="text-[13px] font-black text-ink leading-snug line-clamp-2">{p.name}</p>
                  <PriceTag amount={p.price} old={p.oldPrice} className="text-[15px] mt-auto pt-1" />
                  <button
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      add(p.id);
                    }}
                    className="mt-1 inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add to bag
                  </button>
                </div>
              </CityCard>
            );
          })}
        </div>
      </section>

      {/* Places to stay */}
      <section>
        <SectionHead title="Places to stay" sub="CityHouse rooms and flats open now" more="All listings" moreHref="/house" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stays.map((p) => (
            <CityCard key={p.id} href={`/house/${p.id}`} className="flex flex-col">
              <div className="relative">
                <FallbackImg src={p.image} alt={p.title} className="h-36 w-full" />
                <span className="absolute top-2 left-2">
                  <Pill tone="orange">{p.type}</Pill>
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-1.5">
                <p className="text-[13px] font-black text-ink leading-snug line-clamp-1">{p.title}</p>
                <LocationRow text={`${p.area} · ${p.bedrooms} bed · ${p.bathrooms} bath`} className="text-[11px]" />
                <div className="mt-auto pt-2 flex items-end justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">per year</p>
                    <p className="text-[15px] font-black text-ink">{fmtNaira(p.pricePerYear)}</p>
                  </div>
                  <Pill tone={p.furnished ? 'blue' : 'slate'}>{p.furnished ? 'Furnished' : 'Furnish later'}</Pill>
                </div>
              </div>
            </CityCard>
          ))}
        </div>
      </section>

      {/* Ahead in the feed */}
      <section>
        <SectionHead title="Ahead in the feed" sub="Offers, asks and city notices" more="Open the feed" moreHref="/feed" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedTeaser.map((post) => (
            <CityCard
              key={post.id}
              href={post.href ? post.href.url : '/feed'}
              className="flex gap-4 p-4 items-start"
            >
              <FallbackImg
                src={post.avatarImg}
                alt={post.author}
                className="w-11 h-11 rounded-full shrink-0"
                icon={<span className="text-xs font-black">{post.author.slice(0, 1)}</span>}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-black text-ink truncate">{post.author}</p>
                  <Pill tone="slate">{post.category}</Pill>
                </div>
                <p className="text-[12px] font-bold text-slate-700 mt-1 leading-snug line-clamp-1">{post.title}</p>
                <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5 line-clamp-2">{post.body}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-slate-400">
                  <span>{`${post.likes} likes`}</span>
                  <span>{`${post.comments} comments`}</span>
                  <span>{post.time}</span>
                </div>
              </div>
            </CityCard>
          ))}
          <CityCard href="/feed" className="flex flex-col items-center justify-center gap-2 p-6 border-dashed border-2 border-teal-100 bg-teal-50/40 hover:bg-teal-50/70">
            <span className="w-12 h-12 rounded-2xl bg-teal-800 text-white flex items-center justify-center">
              <ArrowRight className="w-5 h-5" />
            </span>
            <p className="text-[13px] font-black text-teal-900">Read the whole feed</p>
            <p className="text-[11px] text-teal-700/70 font-medium">Offers, asks and city notices</p>
          </CityCard>
        </div>
      </section>

      {/* Safety / demo note */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-3 p-4 rounded-2xl bg-white border border-slate-100 items-start">
            <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4.5 h-4.5" />
            </span>
            <div>
              <p className="text-[13px] font-black text-ink">City Status — all clear</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                No reported outages on Marian Road or the Uyo corridor. Market line is open.
              </p>
            </div>
          </div>
          <DemoBanner />
        </div>
      </section>
    </div>
  );
}