'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Banknote, ShoppingBag, Users, TrendingUp, Star, Truck, ChevronRight, BadgeCheck } from 'lucide-react';
import { DEMO_BIZ_DASHBOARD, fmtNaira, parseNaira } from '@/lib/demo/cityos';
import { StatTile, Pill, DemoBanner, SectionHead } from '@/components/cityos/CityUI';

interface LiveOrder {
  ref: string;
  name: string;
  area: string;
  amount: number;
  status: string;
  time: string;
}

export default function BusinessDashboard() {
  const d = DEMO_BIZ_DASHBOARD;
  const maxWeek = Math.max(...d.week);
  const [live, setLive] = useState<LiveOrder[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('cityos-demo-order');
      if (raw) {
        const o = JSON.parse(raw);
        const total = typeof o.total === 'number' ? o.total : parseNaira(o.total ?? '0');
        const itemsText = Array.isArray(o.items) && o.items.length > 0
          ? o.items.map((i: { qty?: number; name?: string }) => `${i.qty ?? 1}× ${i.name ?? 'item'}`).join(', ')
          : 'market order';
        window.setTimeout(() => {
          setLive([
            {
              ref: o.ref ?? 'CC-WEB',
              name: 'Ada Ani (you)',
              area: `Calabar · ${itemsText.slice(0, 22)}`,
              amount: total,
              status: 'Paid now',
              time: (o.placedAt ? new Date(o.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now') + ' · CityPay',
            },
          ]);
        }, 0);
      }
    } catch {
      /* no live order */
    }
  }, []);

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
        <Link href="/admin/grocery" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 text-xs font-black hover:ring-teal-300 transition-all">
          Full ShopOS admin <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <DemoBanner />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Revenue today" value={fmtNaira(todayRevenue)} delta={live.length > 0 ? 'incl. your live order' : '+12% vs yesterday'} icon={<Banknote className="w-4 h-4" />} tone="teal" />
        <StatTile label="Orders today" value={todayOrders.toString()} delta="6 riders active" icon={<ShoppingBag className="w-4 h-4" />} tone="orange" />
        <StatTile label="New customers" value={d.today.customers.toString()} delta="+9 this week" icon={<Users className="w-4 h-4" />} tone="blue" />
        <StatTile label="Gross merchandise" value={d.today.gmv} delta="includes fresh daily" icon={<TrendingUp className="w-4 h-4" />} tone="emerald" />
      </div>

      {/* Week chart + delivery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black text-ink uppercase tracking-widest">Revenue this week</p>
            <Pill tone="teal">NGN thousands</Pill>
          </div>
          <div className="flex items-end gap-2 h-36">
            {d.week.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-teal-800 to-teal-400 hover:from-teal-900 transition-all"
                  style={{ height: `${Math.max(12, (v / maxWeek) * 120)}px` }}
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
              {d.payments.map((p) => (
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
          {d.recentOrders.map((o) => (
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
        </div>
      </section>

      {/* Top products + reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <SectionHead title="Top products" sub="By sold units, 7 days" />
          <div className="space-y-3">
            {d.topProducts.map((tp, i) => (
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
          </p>
          <div className="space-y-3">
            {d.reviews.map((r) => (
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