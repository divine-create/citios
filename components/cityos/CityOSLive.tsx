'use client';

import { CityCard } from '@/components/cityos/CityUI';

/**
 * Workspace "live activity" card. The simulated resident-event stream from
 * the demo store was removed with the demo purge. Real cross-surface
 * activity requires wiring workspace queries to canonical orders/jobs/
 * registrations — tracked separately. Until then this renders honestly
 * empty.
 */
export default function CityOSLive({ name }: { orgId: string; name: string }) {
  void name;
  return (
    <CityCard className="overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-teal-800">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            CityOS live
          </p>
          <p className="text-[13px] font-black text-ink mt-0.5">No resident activity yet</p>
        </div>
      </div>
      <div className="p-5 text-[12px] text-slate-500 font-medium leading-relaxed">
        {`You are viewing ${name} from inside its workspace. Actions residents take on your public surfaces — orders, service requests, registrations and applications — will appear here.`}
      </div>
    </CityCard>
  );
}
