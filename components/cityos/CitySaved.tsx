import Link from 'next/link';
import { Bookmark, Heart } from 'lucide-react';
import { getResolvedSavedItems, toggleSavedItem } from '@/app/actions/org';
import { fmtNaira } from '@/lib/demo/cityos';
import { CityCard, FallbackImg, Stars, Pill, LocationRow, DemoBanner, OpenBadge } from '@/components/cityos/CityUI';
import { revalidatePath } from 'next/cache';

export default async function CitySaved() {
  const { orgs, products, jobs, events, places } = await getResolvedSavedItems();

  const holder = (count: number) =>
    count === 0 ? (
      <p className="col-span-full text-sm font-bold text-slate-300 py-2">Nothing saved here yet.</p>
    ) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-black text-ink flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-teal-800" /> Saved
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Businesses, products, jobs, events and places you have saved across CityOS.
        </p>
      </div>

      <DemoBanner />

      {/* Businesses */}
      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Businesses
          <span className="text-[11px] font-bold text-slate-400">{orgs.length}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((b) => (
            <CityCard key={b.id} href={`/org/${b.id}`} className="flex flex-col">
              <FallbackImg src="" alt={b.name} className="h-28 w-full" />
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-ink truncate">{b.name}</p>
                    <LocationRow text={b.address || 'Calabar'} className="text-[10px]" />
                  </div>
                  <Stars rating={5} className="shrink-0" />
                </div>
                <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{b.description}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <OpenBadge open={true} />
                  <form action={async () => {
                    'use server';
                    await toggleSavedItem('biz', b.id);
                    revalidatePath('/saved');
                  }}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Heart className="w-3 h-3 fill-current" /> Unsave
                    </button>
                  </form>
                </div>
              </div>
            </CityCard>
          ))}
          {holder(orgs.length)}
        </div>
      </section>

      {/* Products */}
      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Products
          <span className="text-[11px] font-bold text-slate-400">{products.length}</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {products.map((p) => (
            <CityCard key={p.id} href={`/product/${p.id}`} className="p-3 flex flex-col gap-1.5">
              <FallbackImg src={p.imageAssetId || ''} alt={p.name} className="h-20 w-full rounded-xl" icon={<span className="text-sm font-black">{p.name.slice(0, 1)}</span>} />
              <p className="text-[12px] font-black text-ink leading-snug line-clamp-1">{p.name}</p>
              <div className="flex items-center justify-between mt-auto">
                <p className="text-[13px] font-black text-teal-900">{fmtNaira(p.price)}</p>
                <form action={async () => {
                  'use server';
                  await toggleSavedItem('product', p.id);
                  revalidatePath('/saved');
                }}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <Heart className="w-3 h-3 fill-current" />
                  </button>
                </form>
              </div>
            </CityCard>
          ))}
          {holder(products.length)}
        </div>
      </section>

      {/* Jobs */}
      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Jobs
          <span className="text-[11px] font-bold text-slate-400">{jobs.length}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {jobs.map((j) => (
            <CityCard key={j.id} href={`/jobs/${j.id}`} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{j.title}</p>
                </div>
                <Pill tone="blue">Job</Pill>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] font-black text-teal-800">{j.pay || 'Competitive'}</span>
              </div>
              <form action={async () => {
                'use server';
                await toggleSavedItem('job', j.id);
                revalidatePath('/saved');
              }}>
                <button
                  type="submit"
                  className="mt-3 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <Heart className="w-3 h-3 fill-current" /> Unsave
                </button>
              </form>
            </CityCard>
          ))}
          {holder(jobs.length)}
        </div>
      </section>

      {/* Events */}
      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Events
          <span className="text-[11px] font-bold text-slate-400">{events.length}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {events.map((ev) => (
            <CityCard key={ev.id} href={`/events/${ev.id}`} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{ev.title}</p>
                </div>
                <Pill tone="orange">Event</Pill>
              </div>
              <form action={async () => {
                'use server';
                await toggleSavedItem('event', ev.id);
                revalidatePath('/saved');
              }}>
                <button
                  type="submit"
                  className="mt-3 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <Heart className="w-3 h-3 fill-current" /> Unsave
                </button>
              </form>
            </CityCard>
          ))}
          {holder(events.length)}
        </div>
      </section>

      {/* Places */}
      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Places & properties
          <span className="text-[11px] font-bold text-slate-400">{places.length}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {places.map((p) => (
            <CityCard key={p.id} href={`/house/${p.id}`} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{p.name}</p>
                  <p className="text-[11px] font-bold text-slate-400 truncate">{p.address}</p>
                </div>
                <Pill tone="teal">Place</Pill>
              </div>
              <form action={async () => {
                'use server';
                await toggleSavedItem('place', p.id);
                revalidatePath('/saved');
              }}>
                <button
                  type="submit"
                  className="mt-3 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <Heart className="w-3 h-3 fill-current" /> Unsave
                </button>
              </form>
            </CityCard>
          ))}
          {holder(places.length)}
        </div>
      </section>

      {orgs.length + products.length + jobs.length + events.length + places.length === 0 ? (
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