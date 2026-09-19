'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Banknote, ShoppingBag, Users, TrendingUp, Star, Truck, ChevronRight, BadgeCheck } from 'lucide-react';
import { fmtNaira, parseNaira } from '@/lib/format';
import { StatTile, Pill,  SectionHead } from '@/components/cityos/CityUI';

interface LiveOrder {
  ref: string;
  name: string;
  area: string;
  amount: number;
  status: string;
  time: string;
}

// Zero-state dataset: the canonical merchant-analytics source is not wired yet,
// so the dashboard renders honest zeros instead of fabricated metrics.
const EMPTY_DASHBOARD = {
  merchant: 'Your Business',
  currency: 'NGN',
  week: [0, 0, 0, 0, 0, 0, 0],
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  today: { revenue: '0', orders: 0, customers: 0, gmv: '₦0' },
  delivery: { eta: 'N/A', activeRiders: 0, onTime: 0 },
  payments: [] as { ref: string; method: string; amount: string; settled: string }[],
  recentOrders: [] as { ref: string; name: string; area: string; amount: string; status: string; time: string }[],
  topProducts: [] as { name: string; revenue: string; sold: number }[],
  reviews: [] as { name: string; rating: number; text: string }[] };

export default function BusinessDashboard() {
  const d = EMPTY_DASHBOARD;
  const maxWeek = Math.max(...d.week);
  const [live, setLive] = useState<LiveOrder[]>([]);
  const { data: session } = useSession();

  // Route each business to ITS OWN OS by org type — a restaurant owner must
  // land in RestaurantOS, not ShopOS.
  const orgType = session?.user?.memberships?.[0]?.organizationType;
  const OS_ROUTES: Record<string, { href: string; label: string }> = {
    RESTAURANT: { href: '/admin/restaurantos', label: 'Full RestaurantOS admin' },
    RETAIL: { href: '/admin/grocery', label: 'Full ShopOS admin' },
    SERVICES: { href: '/admin/service', label: 'Full ServiceOS admin' },
    SCHOOL: { href: '/admin/school', label: 'Full EduOS admin' },
    HOTEL: { href: '/admin/hotel', label: 'Full HotelOS admin' },
    EVENT_ORGANIZER: { href: '/admin/events', label: 'Full EventsOS admin' },
  };
  const os = OS_ROUTES[orgType ?? ''] ?? { href: '/admin/grocery', label: 'Full ShopOS admin' };
  const liveTotal = live.reduce((s, o) => s + o.amount, 0);
  const todayRevenue = parseNaira(d.today.revenue) + liveTotal;
  const todayOrders = d.today.orders + live.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-ink flex items-center gap-2">
              {d.merchant} <BadgeCheck className="w-4 h-4 text-brand-700" />
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live business dashboard · currency {d.currency}
            </p>
          </div>
        </div>
        <Link href={os.href} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 text-xs font-black hover:ring-teal-300 transition-all">
          {os.label} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Revenue today" value={fmtNaira(todayRevenue)} delta={live.length > 0 ? 'incl. live orders' : 'no sales recorded yet'} icon={<Banknote className="w-4 h-4" />} tone="teal" />
        <StatTile label="Orders today" value={todayOrders.toString()} delta="no sales recorded yet" icon={<ShoppingBag className="w-4 h-4" />} tone="orange" />
        <StatTile label="New customers" value={d.today.customers.toString()} delta="no data yet" icon={<Users className="w-4 h-4" />} tone="blue" />
        <StatTile label="Gross merchandise" value={d.today.gmv} delta="no data yet" icon={<TrendingUp className="w-4 h-4" />} tone="emerald" />
      </div>

      {/* Week chart + delivery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black text-ink uppercase tracking-widest">Revenue this week</p>
            <Pill tone="teal">NGN thousands</Pill>
          </div>
          <div className="flex items-end gap-2 h-36">
            {d.week.map((v: number, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-teal-800 to-teal-400 hover:from-teal-900 transition-all"
                  style={{ height: `${maxWeek > 0 ? Math.max(12, (v / maxWeek) * 120) : 0}px` }}
                />
                <span className="text-[9px] font-black text-slate-400 uppercase">{d.labels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-black text-ink uppercase tracking-widest mb-4">CityDrive delivery</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Avg ETA', value: d.delivery.eta },
                { label: 'Active riders', value: d.delivery.activeRiders.toString() },
                { label: 'On-time', value: `${d.delivery.onTime}%` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-lg font-black text-ink">{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="inline-flex items-center gap-1.5 text-xs font-black text-ink uppercase tracking-widest mb-3">
              <Truck className="w-4 h-4 text-teal-700" /> CityPay settlements
            </p>
            <div className="space-y-2.5">
              {d.payments.length === 0 ? (
                <p className="text-[12px] text-slate-400 font-medium">No settlements recorded yet.</p>
              ) : d.payments.map((p) => (
                <div key={p.ref} className="flex items-center justify-between text-[12px]">
                  <div>
                    <p className="font-black text-ink">{p.ref}</p>
                    <p className="text-[10px] font-bold text-slate-400">{p.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-ink">{p.amount}</p>
                    <p className="text-[10px] font-bold text-emerald-600">{p.settled}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <section>
        <SectionHead title="Recent orders" sub="Live from the marketplace" more="Manage in ShopOS" moreHref="/admin/grocery" />
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span className="col-span-2">Order</span>
            <span className="col-span-3">Customer</span>
            <span className="col-span-3">Area</span>
            <span className="col-span-2">Amount</span>
            <span className="col-span-2">Status</span>
          </div>
          {live.map((o) => (
            <div key={o.ref} className="grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-3 px-5 py-3.5 border-b border-slate-50 text-[12px] items-center bg-emerald-50/40">
              <span className="col-span-1 font-black text-teal-800">{o.ref}</span>
              <span className="col-span-3 font-black text-ink truncate">{o.name}</span>
              <span className="col-span-3 text-slate-500 font-medium truncate">{o.area}</span>
              <span className="col-span-2 font-black text-ink">{fmtNaira(o.amount)}</span>
              <span className="col-span-2">
                <Pill tone="green">{o.status}</Pill>
              </span>
              <span className="hidden md:block col-span-1 text-right text-[10px] font-bold text-slate-400">{o.time}</span>
            </div>
          ))}
          {d.recentOrders.map((o: any) => (
            <div key={o.ref} className="grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-3 px-5 py-3.5 border-b border-slate-50 text-[12px] items-center">
              <span className="col-span-1 font-black text-teal-800">{o.ref}</span>
              <span className="col-span-3 font-black text-ink truncate">{o.name}</span>
              <span className="col-span-3 text-slate-500 font-medium truncate">{o.area}</span>
              <span className="col-span-2 font-black text-ink">{o.amount}</span>
              <span className="col-span-2">
                <Pill tone={o.status === 'Delivered' ? 'green' : o.status === 'Assigned rider' ? 'blue' : 'orange'}>
                  {o.status}
                </Pill>
              </span>
              <span className="hidden md:block col-span-1 text-right text-[10px] font-bold text-slate-400">{o.time}</span>
            </div>
          ))}
          {live.length === 0 && d.recentOrders.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px] font-black text-ink">No orders yet</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Orders from your storefront will appear here.</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Top products + reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <SectionHead title="Top products" sub="By sold units, 7 days" />            <div className="space-y-3">
              {d.topProducts.length === 0 ? (
                <p className="text-[12px] text-slate-400 font-medium">No product sales recorded yet.</p>
              ) : d.topProducts.map((tp, i) => (
              <div key={tp.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{tp.name}</p>
                  <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-400"
                      style={{ width: `${((i + 1) / d.topProducts.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-black text-ink">{tp.revenue}</p>
                  <p className="text-[10px] font-bold text-slate-400">{`${tp.sold} sold`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="flex items-center gap-1.5 text-xs font-black text-ink uppercase tracking-widest mb-4">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Customer reviews
          </p>            <div className="space-y-3">
              {d.reviews.length === 0 ? (
                <p className="text-[12px] text-slate-400 font-medium">No reviews yet.</p>
              ) : d.reviews.map((r) => (
              <div key={r.name} className="rounded-xl bg-slate-50 p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-black text-ink">{r.name}</p>
                  <span className="text-[11px] font-black text-amber-500">{'★'.repeat(r.rating)}<span className="text-slate-300">{'★'.repeat(5 - r.rating)}</span></span>
                </div>
                <p className="text-[12px] text-slate-600 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}