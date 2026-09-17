'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Wallet, Plus, ChevronRight, Package, Car, Banknote, Truck, Building2, Heart, Settings, ArrowUp } from 'lucide-react';
import { DEMO_USER, DEMO_ORDERS, TOP_UP_AMOUNT, fmtNaira, getProperty } from '@/lib/demo/cityos';
import { Pill, Money, ChipButton, DemoBanner } from '@/components/cityos/CityUI';
import { useWallet } from '@/components/cityos/WalletStore';
import { useExperience } from '@/components/cityos/ExperienceStore';
import { cn } from '@/lib/utils';

const TABS = ['Orders', 'Payments', 'CityHouse', 'Saved', 'Settings'] as const;
type Tab = (typeof TABS)[number];

export default function CityProfile() {
  const [tab, setTab] = useState<Tab>('Orders');
  const { balance, topUp, transactions } = useWallet();
  const { experience } = useExperience();
  const [toppedUp, setToppedUp] = useState(false);
  const walletPct = Math.min(100, Math.round((balance / 200000) * 100));

  const addToWallet = () => {
    topUp(TOP_UP_AMOUNT);
    setToppedUp(true);
  };

  const tabs = (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      {TABS.map((t) => (
        <ChipButton key={t} active={tab === t} onClick={() => setTab(t)}>
          {t}
        </ChipButton>
      ))}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-teal-800/20">
            {DEMO_USER.initials}
          </div>
          <span className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-emerald-500 ring-4 ring-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-ink">{DEMO_USER.name}</h1>
          <p className="text-[13px] text-slate-500 font-medium mt-0.5">
            {`Resident · ${DEMO_USER.area} · since ${DEMO_USER.memberSince}`}
          </p>
          <p className="text-[12px] text-slate-400 font-medium mt-1">{DEMO_USER.tagline}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Edit profile
          </button>
        </div>
      </div>

      {/* Wallet */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row gap-5 sm:items-end justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] font-black text-teal-200 uppercase tracking-widest">
              <Wallet className="w-3.5 h-3.5" /> CityPay wallet
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight">{fmtNaira(balance)}</p>
            <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-teal-200/80">
              <span>{DEMO_USER.walletId}</span>
              <span>·</span>
              <span>{toppedUp ? 'just topped up' : 'all good'}</span>
            </div>
            <div className="mt-3 h-1.5 w-40 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${walletPct}%` }} />
            </div>
          </div>
          <button
            onClick={addToWallet}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-teal-950 text-xs font-black hover:bg-teal-50 transition-colors shadow-lg shrink-0"
          >
            <ArrowUp className="w-4 h-4" /> {`Top up ${fmtNaira(TOP_UP_AMOUNT)}`}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Orders', value: DEMO_USER.stats.orders, icon: Package },
          { label: 'Rides', value: DEMO_USER.stats.rides, icon: Car },
          { label: 'Payments', value: DEMO_USER.stats.payments, icon: Banknote },
          { label: 'Deliveries', value: DEMO_USER.stats.deliveries, icon: Truck },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <s.icon className="w-4 h-4 mx-auto text-teal-700" />
            <p className="text-lg font-black text-ink mt-1.5">{s.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Experience switcher */}
      <Link href="/demo/access" className="flex items-center gap-4 rounded-2xl bg-white border border-slate-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
        <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-teal-100 text-indigo-800 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-black text-ink">Experience: {experience}</p>
            <Pill tone="teal">demo</Pill>
          </div>
          <p className="text-[11px] font-bold text-slate-400">Store owner, service provider, or school — switch roles from Demo Access.</p>
        </div>
        <ChevronRight className="w-4 h-4 text-teal-800 shrink-0" />
      </Link>

      <DemoBanner />
      {tabs}

      {/* Tab content */}
      {tab === 'Orders' ? (
        <div className="space-y-3">
          {DEMO_ORDERS.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-black text-ink truncate">{o.merchant}</p>
                  <Pill tone={o.status === 'enroute' ? 'orange' : 'green'} className="shrink-0">
                    {o.status === 'enroute' ? 'En route' : o.status === 'packing' ? 'Packing' : o.status === 'paid' ? 'Paid' : 'Delivered'}
                  </Pill>
                </div>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">{`${o.ref} · ${o.items} · ${o.time}`}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[15px] font-black text-ink">{fmtNaira(o.total)}</p>
                <Link href={o.status === 'enroute' ? '/drive/delivery' : '/'} className="text-[10px] font-bold text-teal-800 hover:underline">
                  {o.status === 'enroute' ? 'Track ▲' : 'Details'}
                </Link>
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <p className="text-[13px] font-black text-ink">Start another order</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1 mb-3">Fresh from the market, paid with CityPay.</p>
            <Link href="/biz/calabar-fresh" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-teal-800 text-white text-[11px] font-black">
              Shop Calabar Fresh <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : tab === 'Payments' ? (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
            {transactions.map((t) => (
              <div key={t.ref} className="px-5 py-3.5 flex items-center gap-3">
                <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', t.amount < 0 ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-600')}>
                  {t.amount < 0 ? '−' : '+'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{t.note}</p>
                  <p className="text-[11px] font-bold text-slate-400">{`${t.ref} · ${t.at}`}</p>
                </div>
                <Money amount={t.amount} className={cn('text-[15px]', t.amount < 0 && 'text-red-600')} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-teal-50/70 ring-1 ring-teal-100">
            <span className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-ink">Every spend moves the same wallet</p>
              <p className="text-[11px] font-bold text-slate-400">Holds, consults, bills, deposits and orders land here in real time.</p>
            </div>
          </div>
        </div>
      ) : tab === 'CityHouse' ? (
        <div className="space-y-3">
          {(() => {
            const home = getProperty('h01');
            if (!home) return null;
            return (
              <div className="rounded-2xl bg-white border border-slate-100 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-[14px] font-black text-ink">{home.title}</p>
                      <p className="text-[11px] font-bold text-slate-400">{`${home.area} · rent ${fmtNaira(home.pricePerYear / 12)}/mo`}</p>
                    </div>
                  </div>
                  <Link href={`/house/${home.id}/pay`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-800 text-white text-[11px] font-black">
                    Pay next rent <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Paid', value: '✓ 11 / 12' },
                    { label: 'Next due', value: 'in 12 days' },
                    { label: 'Deposit', value: 'Held via CityPay' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[12px] font-black text-ink">{s.value}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <DemoBanner />
        </div>
      ) : tab === 'Saved' ? (
        <div className="space-y-3">
          {['calabar-fresh', 'watt-market-delicacies', 'ekirinim'].map((s) => (
            <div key={s} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4">
              <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <Heart className="w-4 h-4 fill-orange-500" />
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-black text-ink capitalize">{s.replace(/-/g, ' ')}</p>
                <p className="text-[11px] font-bold text-slate-400">Saved to your city list</p>
              </div>
              <Link href={`/biz/${s}`} className="text-[11px] font-bold text-teal-800 hover:underline">Open</Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
          {[
            { label: 'Notifications', sub: 'Rides, orders & offers', icon: Settings },
            { label: 'Payment methods', sub: 'CityPay wallet · cards · transfer', icon: Wallet },
            { label: 'Privacy', sub: 'Who can see your feed posts', icon: Settings },
            { label: 'Referral code', sub: DEMO_USER.referralCode, icon: Settings },
            { label: 'Sign out', sub: 'From this device', icon: Settings },
          ].map((s, i) => (
            <div key={s.label} className="px-5 py-4 flex items-center gap-3">
              <s.icon className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-[13px] font-black text-ink">{s.label}</p>
                <p className="text-[11px] font-bold text-slate-400">{s.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}