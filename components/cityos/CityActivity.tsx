'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCheck } from 'lucide-react';
import { DEMO_ACTIVITY, ACTIVITY_KIND_META } from '@/lib/demo/cityos';
import { ChipButton, DemoBanner } from '@/components/cityos/CityUI';
import { useDemoApp } from '@/lib/demo/app/store';
import { cn } from '@/lib/utils';

const FILTERS = ['All', 'Orders & Delivery', 'Payments', 'CityHouse', 'Rides', 'Service Requests', 'CityJobs', 'Events', 'Promos & Security'];

function kindGroup(kind: string): string {
  if (kind === 'order' || kind === 'delivery') return 'Orders & Delivery';
  if (kind === 'payment') return 'Payments';
  if (kind === 'rent') return 'CityHouse';
  if (kind === 'ride') return 'Rides';
  if (kind === 'service') return 'Service Requests';
  if (kind === 'job') return 'CityJobs';
  if (kind === 'event') return 'Events';
  return 'Promos & Security';
}

export default function CityActivity() {
  const [filter, setFilter] = useState('All');
  const [cleared, setCleared] = useState(false);
  const [realServices, setRealServices] = useState<any[]>([]);
  const { activity } = useDemoApp();

  useEffect(() => {
    import('@/app/actions/service')
      .then((m) => m.fetchMyServiceJobs())
      .then((jobs) => {
        setRealServices(
          jobs.map((j) => ({
            id: j.id,
            kind: 'service',
            title: `Service Request: ${j.ref}`,
            body: `Requested ${j.service} from ${j.merchant}. Status: ${j.status}`,
            time: j.time,
            href: `/tasks/${j.id}`,
          }))
        );
      })
      .catch(console.error);
  }, []);

  const items = [...realServices, ...activity, ...DEMO_ACTIVITY].filter((a) => filter === 'All' || kindGroup(a.kind) === filter);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-ink">Activity</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Every payment, delivery, ride and notice in one place.</p>
        </div>
        {!cleared ? (
          <button
            onClick={() => setCleared(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-slate-500 text-[11px] font-bold hover:ring-teal-300 transition-all"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        ) : null}
      </div>

      <DemoBanner />

      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <ChipButton key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </ChipButton>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((a) => {
          const meta = ACTIVITY_KIND_META[a.kind];
          return (
            <Link
              key={a.id}
              href={a.href ?? '/activity'}
              className="flex items-start gap-3 bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <span
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  a.kind === 'payment'
                    ? 'bg-emerald-50 text-emerald-600'
                    : a.kind === 'security'
                    ? 'bg-orange-50 text-orange-500'
                    : a.kind === 'event'
                    ? 'bg-indigo-50 text-indigo-600'
                    : a.kind === 'job'
                    ? 'bg-sky-50 text-sky-600'
                    : a.kind === 'service'
                    ? 'bg-purple-50 text-purple-600'
                    : 'bg-teal-50 text-teal-800',
                )}
              >
                <meta.icon className="w-4.5 h-4.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13px] font-black text-ink">{a.title}</p>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{meta.label}</span>
                </div>
                <p className="text-[12px] text-slate-500 font-medium leading-relaxed mt-0.5">{a.body}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 shrink-0">{a.time}</span>
            </Link>
          );
        })}
        {cleared ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
            <p className="text-[13px] font-black text-ink">You are all caught up</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">New activity will land here as the city moves.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}