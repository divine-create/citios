'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  Package,
  ShoppingCart,
  Users,
  UserRound,
  Tag,
  Briefcase,
  Activity,
  ExternalLink,
  ArrowRight,
  Store,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { getOrg } from '@/lib/demo/universe/orgs';
import { getShopOSDataset, type ShopOSDataSet } from '@/lib/demo/universe/shopos';
import { fmtNaira } from '@/lib/demo/cityos';
import { StatTile, Pill, SectionHead, DemoBanner } from '@/components/cityos/CityUI';
import { fetchRetailOrders } from '@/app/actions/commerce';
import CityOSLive from '@/components/cityos/CityOSLive';
import { useExperience } from '@/components/cityos/ExperienceStore';
import { cn } from '@/lib/utils';

const TABS = ['Overview', 'Products', 'Orders', 'Customers', 'Staff', 'Promotions', 'Jobs', 'Activity'] as const;
type Tab = (typeof TABS)[number];

const STATUS_META: Record<string, { label: string; tone: 'orange' | 'green' | 'blue' | 'red' }> = {
  packing: { label: 'Packing', tone: 'blue' },
  enroute: { label: 'En route', tone: 'orange' },
  delivered: { label: 'Delivered', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

export default function ShopOSWorkspace({ slug }: { slug: string }) {
  const data = getShopOSDataset(slug);
  const org = getOrg(slug);
  const { setExperience } = useExperience();
  const [tab, setTab] = useState<Tab>('Overview');

  if (!data || !org) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🏪</p>
        <h1 className="text-lg font-black text-ink">No ShopOS demo on this storefront.</h1>
        <Link href="/demo/access" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Demo access
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-900 text-white p-7 md:p-9">
        <div className="absolute -right-14 -top-14 w-60 h-60 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/95 to-white/70 text-teal-900 flex items-center justify-center text-3xl shadow-lg shrink-0">
              {org.emoji}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone="orange">ShopOS workspace</Pill>
                <Pill tone="teal">Verified</Pill>
              </div>
              <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">{org.name}</h1>
              <p className="text-[12px] text-teal-100/80 font-medium mt-0.5">{`${org.address} · open daily from 6 AM`}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/biz/${org.slug}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-white text-[11px] font-black hover:bg-white/20 transition-colors"
            >
              <Store className="w-3.5 h-3.5" /> Public store
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

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{t}</TabBtn>
        ))}
      </div>

      {tab === 'Overview' ? <Overview data={data} /> : null}
      {tab === 'Products' ? <Products data={data} /> : null}
      {tab === 'Orders' ? <Orders data={data} orgId={org.id} /> : null}
      {tab === 'Customers' ? <Customers data={data} /> : null}
      {tab === 'Staff' ? <Staff data={data} /> : null}
      {tab === 'Promotions' ? <Promos data={data} /> : null}
      {tab === 'Jobs' ? <Jobs data={data} /> : null}
      {tab === 'Activity' ? <ActivityFeed data={data} /> : null}

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

function Overview({ data }: { data: ShopOSDataSet }) {
  const ordersToday = data.orders.filter((o) => o.status !== 'cancelled').length;
  const revenueToday = data.orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const weekOrders = data.week.reduce((s, v) => s + v, 0);
  const low = data.products.filter((p) => p.stock < 10).length;
  const top = [...data.products].sort((a, b) => b.sold7 - a.sold7).slice(0, 4);
  const max = Math.max(...data.week);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Revenue today" value={fmtNaira(revenueToday)} delta="+12% vs yesterday" icon={<LayoutGrid className="w-4 h-4" />} />
        <StatTile label="Orders today" value={String(ordersToday)} delta={`${weekOrders.toLocaleString()} this week`} icon={<ShoppingCart className="w-4 h-4" />} tone="orange" />
        <StatTile label="Live products" value={String(data.products.length)} delta={`${low} low-stock alerts`} icon={<Package className="w-4 h-4" />} tone="blue" />
        <StatTile label="Customers" value={data.customers.length.toLocaleString()} delta="Silver & Gold tiers active" icon={<Users className="w-4 h-4" />} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-100 p-6">
          <SectionHead title="Orders this week" sub="Packed, out, and on the road" />
          <div className="flex items-end gap-2.5 h-36">
            {data.week.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[9px] font-black text-teal-800">{v}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-teal-800 to-teal-500 hover:opacity-80 transition-opacity" style={{ height: `${(v / max) * 100}%` }} />
                <span className="text-[9px] font-bold text-slate-400">{data.labels[i]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 p-6">
          <SectionHead title="Top sellers" sub="By units picked this week" />
          <div className="space-y-3">
            {top.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-lg">{p.tag === 'best' ? '🏆' : '🧺'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-ink truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.min(100, (p.sold7 / top[0].sold7) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{p.sold7} sold</span>
                  </div>
                </div>
                <span className="text-[12px] font-black text-ink shrink-0">{fmtNaira(p.price)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <SectionHead title="Latest orders" more="View all" moreHref="#orders" onMore={() => {}} />
        <div className="divide-y divide-slate-50">
          {data.orders.slice(0, 5).map((o) => {
            const s = STATUS_META[o.status];
            return (
              <div key={o.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{o.items}</p>
                  <p className="text-[10px] font-bold text-slate-400">{`${o.ref} · ${o.customer} · ${o.area}`}</p>
                </div>
                <span className="text-[12px] font-black text-ink">{fmtNaira(o.total)}</span>
                <Pill tone={s.tone}>{s.label}</Pill>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Products({ data }: { data: ShopOSDataSet }) {
  const low = data.products.filter((p) => p.stock < 10).length;
  const stockTotal = data.products.reduce((s, p) => s + p.stock, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Inventory lines" value={String(data.products.length)} />
        <MiniStat label="Units on floor" value={String(stockTotal)} />
        <MiniStat label="Low-stock alerts" value={String(low)} warn={low > 0} />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span className="col-span-4">Product</span>
          <span className="col-span-3">Category</span>
          <span className="col-span-2 text-right">Price / cost</span>
          <span className="col-span-2 text-center">Stock</span>
          <span className="col-span-1 text-right">Status</span>
        </div>
        <div className="divide-y divide-slate-50">
          {data.products.map((p) => (
            <div key={p.id} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center px-5 py-3.5">
              <div className="col-span-2 md:col-span-4 min-w-0">
                <p className="text-[12px] font-black text-ink truncate">{p.name}</p>
                <p className="text-[10px] font-bold text-slate-400">{p.sku}</p>
              </div>
              <span className="hidden md:block md:col-span-3 text-[11px] font-bold text-slate-500">{p.category}</span>
              <div className="col-span-1 md:col-span-2 flex flex-col md:block text-right">
                <span className="text-[12px] font-black text-ink">{fmtNaira(p.price)}</span>
                <span className="text-[9px] font-bold text-slate-400 ml-1 md:ml-1.5">/ {fmtNaira(p.cost)}</span>
              </div>
              <div className="col-span-1 md:col-span-2 text-center">
                <Pill tone={p.stock < 10 ? 'red' : p.stock < 20 ? 'orange' : 'green'}>{`${p.stock} ${p.unit}`}</Pill>
              </div>
              <div className="col-span-2 md:col-span-1 text-right">
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Orders({ data, orgId }: { data: ShopOSDataSet, orgId: string }) {
  const [realOrders, setRealOrders] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRetailOrders(orgId)
      .then(setRealOrders)
      .catch((err) => setError(err.message));
  }, [orgId]);

  if (error) {
    return (
      <div className="p-10 text-center bg-rose-50 text-rose-800 rounded-2xl border border-rose-100">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
        <p className="font-black">Access Denied</p>
        <p className="text-xs mt-1">{error}</p>
      </div>
    );
  }

  const ordersToDisplay = realOrders ?? data.orders;

  const counts = {
    total: ordersToDisplay.length,
    picked: ordersToDisplay.filter((o) => o.status !== 'cancelled').length,
    paid: ordersToDisplay.filter((o) => o.method === 'CityPay' || o.method === 'WALLET').length,
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Orders (demo window)" value={String(counts.total)} />
        <MiniStat label="Active / picked" value={String(counts.picked)} />
        <MiniStat label="Settled via CityPay" value={String(counts.paid)} />
      </div>
      {realOrders ? (
        <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
          <CheckCircle2 className="w-3.5 h-3.5" /> Showing live DB orders
        </div>
      ) : null}
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
        {ordersToDisplay.map((o) => {
          const s = STATUS_META[o.status] || { label: o.status, tone: 'blue' };
          return (
            <div key={o.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-ink truncate">{o.items}</p>
                <p className="text-[10px] font-bold text-slate-400">{`${o.ref} · ${o.time || 'Just now'}`}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                <span className="text-[11px] font-bold text-slate-400">{`${o.customer} · ${o.area}`}</span>
                <Pill tone="slate">{o.method || 'Wallet'}</Pill>
                <span className="text-[13px] font-black text-ink w-24 text-right">{fmtNaira(o.total)}</span>
                <Pill tone={s.tone}>{s.label}</Pill>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Customers({ data }: { data: ShopOSDataSet }) {
  const tiers: Record<string, { tone: 'orange' | 'slate' }> = { Gold: { tone: 'orange' }, Silver: { tone: 'slate' }, Regular: { tone: 'slate' } };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.customers.map((c) => (
        <div key={c.id} className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
            {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{c.name}</p>
            <p className="text-[10px] font-bold text-slate-400">{`${c.area} · customer since ${c.since}`}</p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[12px] font-black text-ink">{fmtNaira(c.spend)}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{`${c.orders} orders`}</p>
          </div>
          <Pill tone={tiers[c.tier]?.tone ?? 'slate'}>{c.tier}</Pill>
        </div>
      ))}
    </div>
  );
}

function Staff({ data }: { data: ShopOSDataSet }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.staff.map((s) => (
        <div key={s.id} className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black flex items-center justify-center shrink-0">
            {s.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{s.name}</p>
            <p className="text-[11px] font-bold text-slate-400">{s.role}</p>
          </div>
          <span className="hidden sm:block text-[10px] font-bold text-slate-400 capitalize">{s.shift}</span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
            <span className={cn('w-2 h-2 rounded-full', s.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
            <span className={s.active ? 'text-emerald-600' : 'text-slate-400'}>{s.active ? 'On shift' : 'Off'}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Promos({ data }: { data: ShopOSDataSet }) {
  const label: Record<string, string> = { percent: 'Percentage', flat: 'Flat off', bundle: 'Bundle' };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.promotions.map((p) => (
        <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4" />
            </span>
            <Pill tone={p.active ? 'green' : 'slate'}>{p.active ? 'Active' : 'Draft'}</Pill>
          </div>
          <p className="mt-3 text-[14px] font-black text-ink">{p.title}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{p.sub}</p>
          <div className="mt-3 flex items-center gap-2">
            <Pill tone="orange">{label[p.type]}</Pill>
            <span className="text-[12px] font-black text-teal-800">{p.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Jobs({ data }: { data: ShopOSDataSet }) {
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

function ActivityFeed({ data }: { data: ShopOSDataSet }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.activity.map((a) => (
        <div key={a.id} className="px-5 py-4 flex items-center gap-3">
          <span
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              a.tone === 'warn' ? 'bg-orange-50 text-orange-500' : a.tone === 'ok' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600',
            )}
          >
            <Activity className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink leading-snug">{a.text}</p>
            <p className="text-[10px] font-bold text-slate-400">{a.time}</p>
          </div>
          {a.tone === 'warn' ? <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" /> : null}
        </div>
      ))}
      <Link href="/activity" className="px-5 py-3.5 text-[11px] font-black text-teal-800 hover:underline inline-flex items-center gap-1">
        Resident activity ledger <ExternalLink className="w-3 h-3" />
      </Link>
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn('bg-white rounded-2xl border p-4', warn ? 'border-orange-200' : 'border-slate-100')}>
      <p className="text-lg font-black text-ink">{value}</p>
      <p className={cn('text-[9px] font-bold uppercase tracking-wider', warn ? 'text-orange-600' : 'text-slate-400')}>{label}</p>
    </div>
  );
}