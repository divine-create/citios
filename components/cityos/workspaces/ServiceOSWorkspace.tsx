'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wrench,
  ClipboardList,
  Users,
  ChevronRight,
  Store,
  CalendarCheck,
  ArrowLeftRight,
} from 'lucide-react';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';
import { fmtNaira } from '@/lib/format';
import { StatTile, Pill, SectionHead } from '@/components/cityos/CityUI';
import { fetchServiceJobs } from '@/app/actions/service';
import { getServiceCatalogItems, getOrgCustomers } from '@/lib/actions/service';
import { getCanonicalOrganization } from '@/app/actions/org';
import CityOSLive from '@/components/cityos/CityOSLive';
import { useExperience } from '@/components/cityos/ExperienceStore';
import { cn } from '@/lib/utils';

const TABS = ['Overview', 'Services', 'Requests', 'Customers'] as const;
type Tab = (typeof TABS)[number];

const JOB_META: Record<string, { label: string; tone: 'orange' | 'green' | 'blue' | 'slate' | 'red' }> = {
  NEW: { label: 'New', tone: 'blue' },
  SCHEDULED: { label: 'Scheduled', tone: 'orange' },
  IN_PROGRESS: { label: 'In Progress', tone: 'green' },
  COMPLETED: { label: 'Completed', tone: 'slate' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
};

type ServiceOrg = NonNullable<Awaited<ReturnType<typeof getCanonicalOrganization>>>;
type ServiceJob = Awaited<ReturnType<typeof fetchServiceJobs>>[number];
type CatalogItem = Awaited<ReturnType<typeof getServiceCatalogItems>>[number];
type OrgCustomer = Awaited<ReturnType<typeof getOrgCustomers>>[number];

export default function ServiceOSWorkspace({ slug }: { slug: string }) {
  const { setExperience } = useExperience();
  const { switchToPersonal } = useAccountSwitcher();
  const [tab, setTab] = useState<Tab>('Overview');
  const [org, setOrg] = useState<ServiceOrg | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [customers, setCustomers] = useState<OrgCustomer[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const found = await getCanonicalOrganization(slug);
        if (!live) return;
        if (!found) {
          setNotFound(true);
          setLoaded(true);
          return;
        }
        setOrg(found);
        const [j, cat, cust] = await Promise.all([
          fetchServiceJobs(slug),
          getServiceCatalogItems(slug),
          getOrgCustomers(slug),
        ]);
        if (!live) return;
        setJobs(j);
        setCatalog(cat);
        setCustomers(cust);
      } catch (err: any) {
        if (live) setDenied(err?.message || 'Access denied');
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  if (!loaded) {
    return (
      <div className="max-w-lg mx-auto text-center py-24 text-[12px] font-bold text-slate-400">
        Loading workspace…
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🔧</p>
        <h1 className="text-lg font-black text-ink">Workspace not found.</h1>
        <p className="text-sm text-slate-500">This business does not exist on CityOS.</p>
        <Link href="/business" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to business
        </Link>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🔒</p>
        <h1 className="text-lg font-black text-ink">Members only</h1>
        <p className="text-sm text-slate-500">You are not a member of this organization&apos;s workspace.</p>
        <Link href="/business" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to business
        </Link>
      </div>
    );
  }

  const newJobs = jobs.filter((j: any) => j.status === 'NEW').length;
  const activeJobs = jobs.filter((j: any) => j.status === 'SCHEDULED' || j.status === 'IN_PROGRESS').length;
  const doneJobs = jobs.filter((j: any) => j.status === 'COMPLETED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-900 text-white p-7 md:p-9">
        <div className="absolute -right-14 -top-14 w-60 h-60 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/95 to-white/70 text-teal-900 flex items-center justify-center text-3xl shadow-lg shrink-0">
              {org.name.slice(0, 1)}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone="blue">ServiceOS workspace</Pill>
              </div>
              <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">{org.name}</h1>
              <p className="text-[12px] text-teal-100/80 font-medium mt-0.5">{org.address || 'CityOS service provider'}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/org/${org.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-white text-[11px] font-black hover:bg-white/20 transition-colors"
            >
              <Store className="w-3.5 h-3.5" /> Public page
            </Link>
            <button
              type="button"
              onClick={switchToPersonal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-teal-900 text-[11px] font-black hover:bg-teal-50 transition-colors shadow-sm"
              title="Switch back to your personal citizen profile"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-teal-700" /> Personal Account
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

      {tab === 'Overview' ? <Overview newJobs={newJobs} activeJobs={activeJobs} doneJobs={doneJobs} catalog={catalog.length} customers={customers.length} jobs={jobs} /> : null}
      {tab === 'Services' ? <Services data={catalog} /> : null}
      {tab === 'Requests' ? <Requests data={jobs} /> : null}
      {tab === 'Customers' ? <Customers data={customers} /> : null}
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

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
      <p className="text-[13px] font-black text-ink">Nothing here yet</p>
      <p className="text-[11px] text-slate-400 font-medium mt-1">{text}</p>
    </div>
  );
}

function Overview({
  newJobs,
  activeJobs,
  doneJobs,
  catalog,
  customers,
  jobs,
}: {
  newJobs: number;
  activeJobs: number;
  doneJobs: number;
  catalog: number;
  customers: number;
  jobs: ServiceJob[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="New requests" value={String(newJobs)} icon={<ClipboardList className="w-4 h-4" />} />
        <StatTile label="Active jobs" value={String(activeJobs)} icon={<Wrench className="w-4 h-4" />} tone="orange" />
        <StatTile label="Catalog services" value={String(catalog)} icon={<Wrench className="w-4 h-4" />} tone="blue" />
        <StatTile label="Customers" value={String(customers)} icon={<Users className="w-4 h-4" />} tone="emerald" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <SectionHead title="Latest requests" sub={`${doneJobs} completed all time`} />
        {jobs.length === 0 ? (
          <p className="text-[12px] text-slate-400 font-medium">
            No service requests yet. Resident bookings made through the city will appear here.
          </p>
        ) : (
          <div className="divide-y divide-slate-50">
            {jobs.slice(0, 6).map((j: any) => (
              <div key={j.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{j.service}</p>
                  <p className="text-[10px] font-bold text-slate-400">{`${j.ref} · ${j.customer} · ${j.time}`}</p>
                </div>
                <Pill tone={JOB_META[j.status]?.tone ?? 'blue'}>{JOB_META[j.status]?.label ?? j.status}</Pill>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Services({ data }: { data: CatalogItem[] }) {
  if (data.length === 0) return <EmptyNote text="No catalog services yet. Publish what you do so residents can book it." />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.map((s: any) => (
        <div key={s.id} className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{s.name}</p>
            <p className="text-[10px] font-bold text-slate-400 line-clamp-1">{s.description || 'Service'}</p>
          </div>
          <span className="text-[12px] font-black text-ink shrink-0">{s.price != null ? fmtNaira(s.price) : 'Quote'}</span>
        </div>
      ))}
    </div>
  );
}

function Requests({ data }: { data: ServiceJob[] }) {
  if (data.length === 0) return <EmptyNote text="No service requests yet." />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.map((j: any) => (
        <div key={j.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{j.service}</p>
            <p className="text-[10px] font-bold text-slate-400">{`${j.ref} · ${j.customer} · ${j.time}`}</p>
          </div>
          <Pill tone={JOB_META[j.status]?.tone ?? 'blue'}>{JOB_META[j.status]?.label ?? j.status}</Pill>
        </div>
      ))}
    </div>
  );
}

function Customers({ data }: { data: OrgCustomer[] }) {
  if (data.length === 0) return <EmptyNote text="No customers yet. Customers appear when residents request your services." />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.map((c: any) => (
        <div key={c.id} className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
            {`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim().split(' ').map((w: string) => w[0]).slice(0, 2).join('') || '?'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Customer'}</p>
            <p className="text-[10px] font-bold text-slate-400">{[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact on file'}</p>
          </div>
          <CalendarCheck className="w-4 h-4 text-slate-300 shrink-0" />
        </div>
      ))}
    </div>
  );
}
