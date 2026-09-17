'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wrench,
  ClipboardList,
  FileText,
  CalendarCheck,
  HardHat,
  Star,
  Briefcase,
  Activity,
  ExternalLink,
  ChevronRight,
  Star as StarIcon,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { getOrg } from '@/lib/demo/universe/orgs';
import { getServiceOSDataset, type ServiceOSDataSet } from '@/lib/demo/universe/serviceos';
import { fmtNaira } from '@/lib/demo/cityos';
import { StatTile, Pill, SectionHead, DemoBanner } from '@/components/cityos/CityUI';
import CityOSLive from '@/components/cityos/CityOSLive';
import { useExperience } from '@/components/cityos/ExperienceStore';
import { cn } from '@/lib/utils';

const TABS = ['Overview', 'Services', 'Requests', 'Quotes', 'Bookings', 'Technicians', 'Jobs', 'Reviews'] as const;
type Tab = (typeof TABS)[number];

const REQ_META: Record<string, { label: string; tone: 'orange' | 'green' | 'blue' | 'slate' | 'red' }> = {
  NEW: { label: 'New', tone: 'blue' },
  SCHEDULED: { label: 'Scheduled', tone: 'orange' },
  IN_PROGRESS: { label: 'In Progress', tone: 'green' },
  COMPLETED: { label: 'Completed', tone: 'slate' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
  new: { label: 'New', tone: 'blue' },
  quoted: { label: 'Quoted', tone: 'orange' },
  accepted: { label: 'Accepted', tone: 'green' },
  done: { label: 'Done', tone: 'slate' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

export default function ServiceOSWorkspace({ slug }: { slug: string }) {
  const data = getServiceOSDataset(slug);
  const org = getOrg(slug);
  const { setExperience } = useExperience();
  const [tab, setTab] = useState<Tab>('Overview');

  if (!data || !org) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🔧</p>
        <h1 className="text-lg font-black text-ink">No ServiceOS demo on this business.</h1>
        <Link href="/demo/access" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Demo access
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-900 text-white p-7 md:p-9">
        <div className="absolute -right-14 -top-14 w-60 h-60 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/95 to-white/70 text-teal-900 flex items-center justify-center text-3xl shadow-lg shrink-0">
              {org.emoji}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone="blue">ServiceOS workspace</Pill>
                <Pill tone="teal">Verified</Pill>
              </div>
              <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">{org.name}</h1>
              <p className="text-[12px] text-teal-100/80 font-medium mt-0.5">{`${org.address} · dispatch Mon–Sat, 8 AM–6 PM`}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/demo/access"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-white text-[11px] font-black hover:bg-white/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Demo access
            </Link>
            <button
              onClick={() => setExperience('resident')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-teal-900 text-[11px] font-black hover:bg-teal-50 transition-colors"
            >
              Switch experience <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <CityOSLive orgId={org.id} name={org.name} />

      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{t}</TabBtn>
        ))}
      </div>

      {tab === 'Overview' ? <Overview data={data} /> : null}
      {tab === 'Services' ? <Services data={data} /> : null}
      {tab === 'Requests' ? <Requests data={data} orgId={org.id} /> : null}
      {tab === 'Quotes' ? <Quotes data={data} /> : null}
      {tab === 'Bookings' ? <Bookings data={data} /> : null}
      {tab === 'Technicians' ? <Technicians data={data} /> : null}
      {tab === 'Jobs' ? <Jobs data={data} /> : null}
      {tab === 'Reviews' ? <Reviews data={data} /> : null}

      <DemoBanner />
    </div>
  );
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ring-1',
        active ? 'bg-teal-800 text-white ring-teal-800 shadow-sm' : 'bg-white text-slate-600 ring-slate-200 hover:ring-teal-300',
      )}
    >
      {children}
    </button>
  );
}

function Overview({ data }: { data: ServiceOSDataSet }) {
  const open = data.bookings.filter((b) => b.status !== 'done').length;
  const pendingQuotes = data.quotes.filter((q) => q.status === 'pending').length;
  const avgRating = (data.technicians.reduce((s, t) => s + t.rating, 0) / data.technicians.length).toFixed(1);
  const max = Math.max(...data.week);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Open requests" value={String(data.requests.filter((r) => r.status !== 'done' && r.status !== 'cancelled').length)} delta={`${pendingQuotes} quotes awaiting reply`} icon={<ClipboardList className="w-4 h-4" />} />
        <StatTile label="Bookings day-ahead" value={String(open)} delta="Confirmed, not yet done" icon={<CalendarCheck className="w-4 h-4" />} tone="orange" />
        <StatTile label="Active techs" value={String(data.technicians.filter((t) => t.active).length)} delta={`${data.technicians.length} on roster`} icon={<HardHat className="w-4 h-4" />} tone="blue" />
        <StatTile label="Avg. tech rating" value={`★ ${avgRating}`} delta="across all completed jobs" icon={<Star className="w-4 h-4" />} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-100 p-6">
          <SectionHead title="Job volume this week" sub="Requests + bookings across the roster" />
          <div className="flex items-end gap-2.5 h-36">
            {data.week.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[9px] font-black text-sky-700">{v}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-sky-800 to-sky-500 hover:opacity-80 transition-opacity" style={{ height: `${(v / max) * 100}%` }} />
                <span className="text-[9px] font-bold text-slate-400">{data.labels[i]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 p-6">
          <SectionHead title="Services from Pricer" sub="Every service priced from, quoted upfront" />
          <div className="space-y-3">
            {data.services.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-lg">{s.tag === 'best' ? '🏆' : '🧰'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-ink truncate">{s.name}</p>
                  <p className="text-[10px] font-bold text-slate-400">{`${s.category} · ${s.tech} · ${s.orders} jobs`}</p>
                </div>
                <span className="text-[12px] font-black text-ink shrink-0">{fmtNaira(s.from)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <SectionHead title="Latest requests" more="All requests" moreHref="/activity" />
        <div className="divide-y divide-slate-50">
          {data.requests.slice(0, 5).map((r) => {
            const s = REQ_META[r.status];
            return (
              <div key={r.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{r.service}</p>
                  <p className="text-[10px] font-bold text-slate-400">{`${r.ref} · ${r.customer} · ${r.area}`}</p>
                </div>
                <Pill tone={s.tone}>{s.label}</Pill>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Services({ data }: { data: ServiceOSDataSet }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHead title={`${data.services.length} services`} sub="Catalog reviewed and live" />
        <Pill tone="green">Catalog live</Pill>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.services.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[14px] font-black text-ink">{s.name}</p>
              {s.tag === 'best' ? <Pill tone="orange">Best</Pill> : s.tag === 'promo' ? <Pill tone="blue">Promo</Pill> : null}
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-1">{`${s.category} · ${s.unit}`}</p>
            <p className="text-[12px] text-slate-500 font-medium leading-relaxed mt-2">{s.desc}</p>
            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[13px] font-black text-ink">from <span className="text-teal-800">{fmtNaira(s.from)}</span></span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                <StarIcon className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {s.rating} · {s.orders}
              </span>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <SectionHead title="Packages" sub="Bundles sold on the city marketplace" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.packages.map((p) => (
            <div key={p.id} className={cn('rounded-xl p-4 ring-1', p.popular ? 'bg-teal-50 ring-teal-200' : 'bg-slate-50 ring-slate-100')}>
              <p className="text-[13px] font-black text-ink">{p.name}</p>
              <ul className="mt-2 space-y-1">
                {p.incl.map((i) => (
                  <li key={i} className="text-[11px] font-medium text-slate-500 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-teal-700 shrink-0 mt-0.5" /> {i}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[15px] font-black text-teal-800">{fmtNaira(p.price)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Requests({ data, orgId }: { data: ServiceOSDataSet, orgId: string }) {
  const [realRequests, setRealRequests] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import('@/app/actions/service').then(({ fetchServiceJobs }) => {
      fetchServiceJobs(orgId)
        .then(setRealRequests)
        .catch((err) => setError(err.message));
    });
  }, [orgId]);

  if (error) {
    return (
      <div className="rounded-2xl border-2 border-red-100 bg-red-50 p-6 text-center">
        <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
        <p className="text-[13px] font-black text-red-900">Access Denied</p>
        <p className="text-[11px] font-medium text-red-700 mt-1">{error}</p>
      </div>
    );
  }

  const requestsToDisplay = realRequests ?? data.requests;

  return (
    <div className="space-y-5">
      {realRequests ? (
        <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
          <CheckCircle2 className="w-3.5 h-3.5" /> Showing live DB requests
        </div>
      ) : null}
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
        {requestsToDisplay.map((r) => {
          const s = REQ_META[r.status] || { label: r.status, tone: 'blue' };
          return (
            <div key={r.id} className="px-5 py-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{r.service}</p>
                  <p className="text-[10px] font-bold text-slate-400">{`${r.ref} • ${r.customer} • ${r.area || ''} • ${r.time}`}</p>
                </div>
                <Pill tone={s.tone}>{s.label}</Pill>
              </div>
              {r.note && <p className="text-[11px] text-slate-500 font-medium italic mt-1.5 ml-1">“{r.note}”</p>}
              
              {realRequests && (
                <div className="mt-3 flex gap-2">
                  {r.status === 'NEW' && (
                    <button
                      onClick={async () => {
                        const tmr = new Date(); tmr.setDate(tmr.getDate() + 1); tmr.setHours(10, 0, 0, 0);
                        const end = new Date(tmr); end.setHours(12, 0, 0, 0);
                        const m = await import('@/app/actions/service');
                        await m.acceptAndScheduleServiceJob({ jobId: r.id, startTime: tmr, endTime: end, price: 10000 });
                        m.fetchServiceJobs(orgId).then(setRealRequests);
                      }}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg transition-colors"
                    >
                      Accept & Schedule
                    </button>
                  )}
                  {r.status === 'SCHEDULED' && (
                    <button
                      onClick={async () => {
                        const m = await import('@/app/actions/service');
                        await m.updateServiceJobLifecycle({ jobId: r.id, status: 'IN_PROGRESS' });
                        m.fetchServiceJobs(orgId).then(setRealRequests);
                      }}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold rounded-lg transition-colors"
                    >
                      Start Job
                    </button>
                  )}
                  {r.status === 'IN_PROGRESS' && (
                    <button
                      onClick={async () => {
                        const m = await import('@/app/actions/service');
                        await m.updateServiceJobLifecycle({ jobId: r.id, status: 'COMPLETED' });
                        m.fetchServiceJobs(orgId).then(setRealRequests);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg transition-colors"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Quotes({ data }: { data: ServiceOSDataSet }) {
  const meta: Record<string, { label: string; tone: 'orange' | 'green' | 'red' }> = {
    pending: { label: 'Awaiting reply', tone: 'orange' },
    accepted: { label: 'Accepted', tone: 'green' },
    declined: { label: 'Declined', tone: 'red' },
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.quotes.map((q) => {
        const m = meta[q.status];
        return (
          <div key={q.id} className="px-5 py-4 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-ink truncate">{q.service}</p>
              <p className="text-[10px] font-bold text-slate-400">{`${q.ref} · ${q.customer} · sent ${q.sent}`}</p>
            </div>
            <span className="text-[11px] font-bold text-slate-400">{`valid ${q.valid}`}</span>
            <span className="text-[13px] font-black text-ink w-24 text-right">{fmtNaira(q.amount)}</span>
            <Pill tone={m.tone}>{m.label}</Pill>
          </div>
        );
      })}
    </div>
  );
}

function Bookings({ data }: { data: ServiceOSDataSet }) {
  const meta: Record<string, { label: string; tone: 'green' | 'slate' | 'orange' }> = {
    confirmed: { label: 'Confirmed', tone: 'green' },
    done: { label: 'Done', tone: 'slate' },
    rescheduled: { label: 'Rescheduled', tone: 'orange' },
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.bookings.map((b) => {
        const m = meta[b.status];
        return (
          <div key={b.id} className="px-5 py-4 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-ink truncate">{b.service}</p>
              <p className="text-[10px] font-bold text-slate-400">{`${b.ref} · ${b.customer} · ${b.date}, ${b.time}`}</p>
            </div>
            <span className="text-[11px] font-bold text-slate-400">{`${b.tech}`}</span>
            <span className="text-[13px] font-black text-ink w-24 text-right">{fmtNaira(b.amount)}</span>
            <Pill tone={m.tone}>{m.label}</Pill>
          </div>
        );
      })}
    </div>
  );
}

function Technicians({ data }: { data: ServiceOSDataSet }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.technicians.map((t) => (
        <div key={t.id} className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-700 to-sky-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
            {t.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{t.name}</p>
            <p className="text-[10px] font-bold text-slate-400">{`${t.skill} · ${t.area}`}</p>
          </div>
          <span className="hidden sm:block text-[10px] font-bold text-slate-400">{`${t.jobs} jobs`}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-500 w-12"><StarIcon className="w-3.5 h-3.5 fill-amber-400" /> {t.rating}</span>
          <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider', t.active ? 'text-emerald-600' : 'text-slate-400')}>
            <span className={cn('w-2 h-2 rounded-full', t.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
            {t.active ? 'Free' : 'Out'}
          </span>
        </div>
      ))}
    </div>
  );
}

function Jobs({ data }: { data: ServiceOSDataSet }) {
  return (
    <div className="space-y-4">
      <SectionHead title={`${data.jobs.length} open roles`} sub="Each vacancy posts to the city job board" more="Open CityJobs" moreHref="/jobs" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.jobs.map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-black text-ink">{j.title}</p>
              <Pill tone="blue">{j.type}</Pill>
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-1">{`${j.area} · ${j.posted}`}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-black text-teal-800">{j.pay}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 ml-auto"><Briefcase className="w-3 h-3" /> {j.applicants} applicants</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Reviews({ data }: { data: ServiceOSDataSet }) {
  return (
    <div className="space-y-4">
      <SectionHead title="Recent reviews" sub="Pulled from completed bookings" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black flex items-center justify-center shrink-0">
                {r.customer.split(' ').map((w) => w[0]).slice(0, 2).join('')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-ink truncate">{r.customer}</p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className={cn('w-3 h-3', i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                  ))}
                </div>
              </div>
              <Pill tone="slate">{r.service}</Pill>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed mt-3">“{r.text}”</p>
            <p className="text-[10px] font-bold text-slate-400 mt-2">{r.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}