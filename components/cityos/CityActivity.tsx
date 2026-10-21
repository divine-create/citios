'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchResidentActivity } from '@/app/actions/activity';
import { cn } from '@/lib/utils';
import { Store, UtensilsCrossed, Wrench, ChevronRight } from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import type { ResidentActivityItem, ResidentActivityPage, ActivityKind } from '@/lib/resident-activity/compose';
import type { StatusView } from '@/lib/resident-activity/status';

const FILTERS: { label: string, kind: ActivityKind | 'all' }[] = [
  { label: 'All', kind: 'all' },
  { label: 'Shopping', kind: 'shop' },
  { label: 'Food', kind: 'restaurant' },
  { label: 'Services', kind: 'service' }
];

export default function CityActivity() {
  const cityName = useCity().city?.name ?? '9jaLive';
  const cityTimezone = useCity().city?.timezone ?? undefined;
  const [filter, setFilter] = useState<ActivityKind | 'all'>('all');
  const [page, setPage] = useState<ResidentActivityPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResidentActivity({ limit: 20 }).then(p => {
      setPage(p as ResidentActivityPage);
      setLoading(false);
    });
  }, []);

  const items = page?.items || [];
  const liveItems = items.filter((a) => filter === 'all' || a.kind === filter);

  function StatusBadge({ status }: { status: StatusView }) {
    if (!status) return null;
    return (
      <span className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
        status.tone === 'success' ? "bg-emerald-100 text-emerald-800" :
        status.tone === 'progress' ? "bg-sky-100 text-sky-800" :
        status.tone === 'danger' ? "bg-red-100 text-red-800" :
        status.tone === 'warning' ? "bg-orange-100 text-orange-800" :
        "bg-slate-100 text-slate-800"
      )}>
        {status.label}
      </span>
    );
  }

  const renderItem = (a: ResidentActivityItem) => {
    return (
      <Link
        key={a.key}
        href={a.href}
        className="flex items-start gap-4 bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
      >
        <span
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl shadow-sm',
            a.kind === 'shop' ? 'bg-indigo-50 text-indigo-600' :
            a.kind === 'restaurant' ? 'bg-orange-50 text-orange-600' :
            'bg-purple-50 text-purple-600'
          )}
        >
          {a.kind === 'shop' ? <Store size={22}/> : a.kind === 'restaurant' ? <UtensilsCrossed size={22}/> : <Wrench size={22}/>}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-black text-ink truncate">{a.merchantName}</p>
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
              {new Date(a.activityAtMs).toLocaleDateString(undefined, { 
                timeZone: cityTimezone,
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium truncate mb-2">{a.title}</p>
          <div className="flex items-center gap-2">
            <StatusBadge status={a.headline} />
            {a.amount !== null && a.amountKind !== 'none' && (
              <span className="text-xs font-black text-slate-700 ml-auto">
                {a.currency === 'USD' ? '$' : '₦'}{Math.round(a.amount).toLocaleString()}
              </span>
            )}
          </div>
          {a.delivery && a.headline.raw !== a.delivery.raw && (
            <p className="text-xs font-bold text-slate-500 mt-2">🚴 {a.delivery.label}</p>
          )}
          {a.deliveryDelayed && (
            <p className="text-xs font-bold text-amber-700 mt-1">Delivery delayed — taking longer than expected</p>
          )}
        </div>
        <div className="pt-3 text-slate-300 flex-shrink-0">
           <ChevronRight size={18} />
        </div>
      </Link>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-ink">Activity</h1>
        <p className="text-sm text-slate-500 font-medium">Your recent orders and requests in {cityName}.</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.kind)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
              filter === f.kind ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {page?.unavailable && page.unavailable.length > 0 && (
         <div className="bg-orange-50 text-orange-800 text-xs font-medium p-3 rounded-xl">
           Some activity couldn't be loaded right now ({page.unavailable.join(', ')}).
         </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm font-bold text-slate-400">Loading activity...</div>
      ) : liveItems.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
          <p className="text-sm font-bold text-slate-400">No recent activity.</p>
        </div>
      ) : (
        <div className="space-y-3">{liveItems.map(renderItem)}</div>
      )}
    </div>
  );
}
