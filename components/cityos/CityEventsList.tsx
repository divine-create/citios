'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Plus, User, Building2, Sparkles } from 'lucide-react';
import { CityCard, FallbackImg, Pill } from '@/components/cityos/CityUI';
import { getCityEvents } from '@/app/actions/org';
import { useCity } from '@/components/cityos/CityProvider';
import { useSession } from 'next-auth/react';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';
import {
  parseEventDescription,
  DEFAULT_EVENT_PLACEHOLDER_IMAGE,
  EVENT_CATEGORIES,
} from '@/lib/event-utils';

export default function CityEventsList({ initialEvents }: { initialEvents?: any[] }) {
  const { city } = useCity();
  const { data: session } = useSession();
  const { myBusinesses } = useAccountSwitcher();
  const cityName = city?.name ?? 'Calabar';
  const cityTimezone = city?.timezone ?? 'Africa/Lagos';
  const [events, setEvents] = useState<any[]>(initialEvents ?? []);
  const [loading, setLoading] = useState(!initialEvents);
  const [activeFilter, setActiveFilter] = useState<string>('All');

  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) return;
    getCityEvents().then((e) => {
      setEvents(e);
      setLoading(false);
    });
  }, [city?.slug, initialEvents]);

  const myOrgIds = useMemo(() => new Set(myBusinesses.map((b) => b.id)), [myBusinesses]);
  const myPersonId = (session?.user as any)?.personId || null;

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const parsed = parseEventDescription(e.description);
      if (activeFilter === 'All') return true;
      if (activeFilter === 'My Events') {
        const isMyPersonal = Boolean(myPersonId && parsed.hostPersonId === myPersonId);
        const isMyOrg = Boolean(e.organizationId && myOrgIds.has(e.organizationId));
        return isMyPersonal || isMyOrg;
      }
      return parsed.category.toLowerCase() === activeFilter.toLowerCase();
    });
  }, [events, activeFilter, myPersonId, myOrgIds]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header + Create Event CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> City Events
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-ink">{`Events in ${cityName}`}</h1>
          <p className="text-xs text-slate-500 font-medium">
            Conferences, Carnival Calabar dry runs, live music nights, community meetups, and festivals — hosted by residents and local businesses.
          </p>
        </div>

        <Link
          href="/events/create"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black shadow-md transition-all shrink-0 hover:scale-[1.02] active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Link>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['All', ...(session?.user ? ['My Events'] : []), ...EVENT_CATEGORIES].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveFilter(tab)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              activeFilter === tab
                ? 'bg-teal-800 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-600 hover:text-teal-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {!loading && filteredEvents.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center space-y-3">
            <p className="text-sm font-bold text-slate-600">
              {activeFilter === 'All'
                ? `Nothing scheduled in ${cityName} yet.`
                : `No events found under "${activeFilter}".`}
            </p>
            <p className="text-xs text-slate-400">
              Hosting a party, concert, meetup, church service, or business event? Put it on the city calendar in seconds.
            </p>
            <Link
              href="/events/create"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Host an Event
            </Link>
          </div>
        ) : null}
        {filteredEvents.map((e) => {
          const parsed = parseEventDescription(e.description);
          const parsedDate = new Date(typeof e.date === 'string' ? e.date : e.date?.toString());
          const formattedDate = isNaN(parsedDate.getTime())
            ? 'Upcoming'
            : parsedDate.toLocaleDateString('en-NG', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: cityTimezone,
              });
          const hostLabel = parsed.hostName || e.organization?.name || 'Community Host';
          const isPersonalHost = Boolean(parsed.hostName);

          return (
            <CityCard key={e.id} href={`/events/${e.id}`} className="flex flex-col">
              <FallbackImg
                src={parsed.imageUrl}
                fallbackSrc={DEFAULT_EVENT_PLACEHOLDER_IMAGE}
                alt={e.title}
                className="h-36 w-full object-cover"
              />
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Pill tone="orange">{parsed.category || 'Event'}</Pill>
                  <span className="text-[10px] font-bold text-slate-500">
                    {!e.price || e.price === 0 ? 'Free' : `₦${Number(e.price).toLocaleString()}`}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-ink leading-snug line-clamp-2">{e.title}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-1 line-clamp-1 flex items-center gap-1">
                    {isPersonalHost ? (
                      <User className="w-3 h-3 text-teal-600 shrink-0" />
                    ) : (
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{hostLabel}</span>
                  </p>
                </div>
              </div>
              <div className="px-4 pb-4 mt-auto pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 shrink-0">
                  <Calendar className="w-3 h-3 text-slate-300" />
                  {formattedDate}
                </span>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="truncate">{e.location || cityName}</span>
                </span>
              </div>
            </CityCard>
          );
        })}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-teal-900 to-teal-700 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-black">Host your own event in {cityName}</p>
            <p className="text-[12px] text-teal-100/80 font-medium">
              Both individuals and businesses can publish events to the city calendar and newsfeed for free.
            </p>
          </div>
        </div>
        <Link
          href="/events/create"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-teal-950 hover:bg-teal-50 text-xs font-black shrink-0 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Event
        </Link>
      </div>
    </div>
  );
}