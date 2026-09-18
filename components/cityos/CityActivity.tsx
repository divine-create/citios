'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchResidentActivity } from '@/app/actions/activity';
import { cn } from '@/lib/utils';
import { DemoBanner } from '@/components/cityos/CityUI';
import { useCity } from '@/components/cityos/CityProvider';

const FILTERS = ['All', 'Orders', 'Service Requests', 'CityJobs', 'Events', 'Saved Items'];

function kindGroup(kind: string): string {
  if (kind === 'shop_order') return 'Orders';
  if (kind === 'service_booked') return 'Service Requests';
  if (kind === 'job_apply') return 'CityJobs';
  if (kind === 'event_rsvp') return 'Events';
  if (kind === 'saved_item') return 'Saved Items';
  return 'All';
}

export default function CityActivity() {
  const cityName = useCity().city?.name ?? 'CityOS';
  const cityTimezone = useCity().city?.timezone ?? undefined;
  const [filter, setFilter] = useState('All');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResidentActivity().then(a => {
      setActivities(a);
      setLoading(false);
    });
  }, []);

  const liveItems = activities.filter((a) => filter === 'All' || kindGroup(a.kind) === filter);

  const renderItem = (a: any) => {
    return (
      <Link
        key={a.id}
        href={a.href ?? '/activity'}
        className="flex items-start gap-3 bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
      >
        <span
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl',
            a.kind === 'event_rsvp' ? 'bg-indigo-50 text-indigo-600' :
            a.kind === 'job_apply' ? 'bg-sky-50 text-sky-600' :
            a.kind === 'service_booked' ? 'bg-purple-50 text-purple-600' :
            a.kind === 'saved_item' ? 'bg-pink-50 text-pink-600' :
            'bg-teal-50 text-teal-800'
          )}
        >
          {a.kind === 'event_rsvp' ? '🎟️' :
           a.kind === 'job_apply' ? '💼' :
           a.kind === 'service_booked' ? '🔧' :
           a.kind === 'saved_item' ? '🔖' :
           '🛍️'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-black text-ink">{a.title}</p>
            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
              {new Date(a.date).toLocaleDateString(undefined, { timeZone: cityTimezone })}
            </span>
          </div>
          <p className="text-[12px] text-slate-500 font-medium mt-0.5">{a.desc}</p>
        </div>
      </Link>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Recent Activity</h1>
        <p className="text-xs text-slate-500 font-medium">Your digital footprint across {cityName}.</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors",
              filter === f ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      
      {loading ? (
        <div className="py-12 text-center text-sm font-bold text-slate-400">Loading activity...</div>
      ) : liveItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-bold text-slate-400">No activity found.</p>
        </div>
      ) : (
        <div className="space-y-3">{liveItems.map(renderItem)}</div>
      )}
    </div>
  );
}
