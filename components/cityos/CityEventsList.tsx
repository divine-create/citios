'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { CityCard, FallbackImg, Pill } from '@/components/cityos/CityUI';
import { getCityEvents } from '@/app/actions/org';
import { useCity } from '@/components/cityos/CityProvider';
import { parseEventDescription } from '@/lib/event-utils';

export default function CityEventsList({ initialEvents }: { initialEvents?: any[] }) {
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';
  const cityTimezone = city?.timezone ?? 'Africa/Lagos';
  const [events, setEvents] = useState<any[]>(initialEvents ?? []);
  const [loading, setLoading] = useState(!initialEvents);

  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) return;
    getCityEvents().then(e => {
      setEvents(e);
      setLoading(false);
    });
  }, [city?.slug, initialEvents]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">{`Events in ${cityName}`}</h1>
        <p className="text-xs text-slate-500 font-medium">
          Conferences, Carnival Calabar dry runs, cultural regattas, and live festivals in {cityName}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {!loading && events.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <p className="text-sm font-bold text-slate-500">{`Nothing scheduled in ${cityName} yet.`}</p>
            <p className="text-xs text-slate-400 mt-1">Check back soon — or organize the first one.</p>
          </div>
        ) : null}
        {events.map((e) => {
          const parsed = parseEventDescription(e.description, e.organization?.logoAssetId);
          const parsedDate = new Date(typeof e.date === 'string' ? e.date : e.date?.toString());
          const formattedDate = isNaN(parsedDate.getTime())
            ? 'Upcoming'
            : parsedDate.toLocaleDateString('en-NG', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: cityTimezone,
              });
          return (
            <CityCard key={e.id} href={`/events/${e.id}`} className="flex flex-col">
              <FallbackImg src={parsed.imageUrl || undefined} alt={e.title} className="h-36 w-full object-cover" />
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Pill tone="orange">Event</Pill>
                  <span className="text-[10px] font-bold text-slate-500">
                    {!e.price || e.price === 0 ? 'Free' : `₦${Number(e.price).toLocaleString()}`}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-ink leading-snug line-clamp-2">{e.title}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-1 line-clamp-1">{e.organization?.name || 'Organization'}</p>
                </div>
              </div>
              <div className="px-4 pb-4 mt-auto pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 shrink-0">
                  <Calendar className="w-3 h-3 text-slate-300" />
                  {formattedDate}
                </span>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="truncate">{e.location || 'Calabar'}</span>
                </span>
              </div>
            </CityCard>
          );
        })}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-teal-900 to-teal-700 text-white p-5 flex items-center gap-4">
        <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5" />
        </span>
        <div>
          <p className="text-sm font-black">Calabar Festival & Carnival Corridor Notice</p>
          <p className="text-[12px] text-teal-100/70 font-medium">Open any event card for full schedule details, venue location, and direct registration links.</p>
        </div>
      </div>
    </div>
  );
}