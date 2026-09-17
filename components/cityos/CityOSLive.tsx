'use client';

import Link from 'next/link';
import { ShoppingBag, Wrench, Ticket, Briefcase, Activity, ChevronRight } from 'lucide-react';
import { fmtNaira, ACTIVITY_KIND_META } from '@/lib/demo/cityos';
import { useDemoApp } from '@/lib/demo/app/store';
import { CityCard, Pill } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

export default function CityOSLive({ orgId, name }: { orgId: string; name: string }) {
  const { ordersForOrg, requestsForOrg, regsForOrg, appsForOrg, activityForOrg } = useDemoApp();
  const orders = ordersForOrg(orgId);
  const requests = requestsForOrg(orgId);
  const regs = regsForOrg(orgId);
  const apps = appsForOrg(orgId);
  const activity = activityForOrg(orgId);

  const total = orders.length + requests.length + regs.length;
  const empty = total === 0 && activity.length === 0;

  return (
    <CityCard className="overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-teal-800">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            CityOS live
          </p>
          <p className="text-[13px] font-black text-ink mt-0.5">
            {total === 0 ? 'No resident activity yet' : `${total} new ${total === 1 ? 'event' : 'events'} from resident actions`}
          </p>
        </div>
        <Link
          href="/demo/access"
          className="inline-flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-teal-800 transition-colors"
        >
          Residents <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {empty ? (
        <div className="p-5 text-[12px] text-slate-500 font-medium leading-relaxed">
          {`You are viewing ${name} from inside its workspace. Actions residents take in your public surfaces — market orders, service requests, event registrations and job applications — will stream in here in real time.`}
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-5 py-3">
              <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-ink truncate">New order {o.ref}</p>
                <p className="text-[11px] font-bold text-slate-400 truncate">{`${o.items.length} items · ${o.method === 'wallet' ? 'CityPay' : o.method}`}</p>
              </div>
              <span className="text-[12px] font-black text-ink tabular-nums shrink-0">{fmtNaira(o.total)}</span>
            </div>
          ))}
          {requests.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3">
              <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-ink truncate">Service request · {r.taskName}</p>
                <p className="text-[11px] font-bold text-slate-400 truncate">{`${r.pro} to ${r.area}`}</p>
              </div>
              <Pill tone="blue" className="shrink-0">{`from ${fmtNaira(r.amount)}`}</Pill>
            </div>
          ))}
          {regs.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Ticket className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-ink truncate">New registration · {r.title}</p>
                <p className="text-[11px] font-bold text-slate-400 truncate">{r.ref}</p>
              </div>
              <Pill tone="blue" className="shrink-0">{r.amount > 0 ? 'Paid' : 'Free'}</Pill>
            </div>
          ))}
          {apps.map((a) => (
            <div key={a.jobId} className="flex items-center gap-3 px-5 py-3">
              <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-ink truncate">Job application · {a.title}</p>
                <p className="text-[11px] font-bold text-slate-400 truncate">Submitted a moment ago</p>
              </div>
            </div>
          ))}
          {activity.map((a) => {
            const meta = ACTIVITY_KIND_META[a.kind];
            return (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-ink truncate">{a.title}</p>
                  <p className={cn('text-[11px] font-bold text-slate-400 truncate')}>{a.body}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">{meta?.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </CityCard>
  );
}