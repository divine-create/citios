'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  Banknote, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  Star, 
  Truck, 
  ChevronRight, 
  BadgeCheck, 
  Plus,
  Globe,
  MapPin,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { fmtNaira, parseNaira } from '@/lib/format';
import { StatTile, Pill, SectionHead } from '@/components/cityos/CityUI';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';
import { cn } from '@/lib/utils';
import { getUnifiedBusinessAnalytics } from '@/app/actions/business';
import BranchManagerModal from '@/components/cityos/BranchManagerModal';
import TeamManagerModal from '@/components/cityos/TeamManagerModal';

interface LiveOrder {
  ref: string;
  name: string;
  area: string;
  amount: number;
  status: string;
  time: string;
}

// Zero-state dataset: honest fallback metrics when live records are empty
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
  reviews: [] as { name: string; rating: number; text: string }[] 
};

export default function BusinessDashboard() {
  const d = EMPTY_DASHBOARD;
  const maxWeek = Math.max(...d.week);
  const [live, setLive] = useState<LiveOrder[]>([]);
  const [realData, setRealData] = useState<any>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const { data: session } = useSession();
  const { myBusinesses, activeBusiness, switchToBusiness, openCreateModal } = useAccountSwitcher();

  const currentBusiness = activeBusiness || myBusinesses[0] || null;

  useEffect(() => {
    if (currentBusiness) {
      getUnifiedBusinessAnalytics(currentBusiness.id).then(res => setRealData(res)).catch(console.error);
    }
  }, [currentBusiness]);

  const currentMerchant = currentBusiness?.name || d.merchant;

  // Route each business to ITS OWN OS by org type — a restaurant owner must
  // land in RestaurantOS, hotel in HotelOS, etc.
  const effectiveOrgType = currentBusiness?.type || session?.user?.memberships?.[0]?.organizationType;
  const OS_ROUTES: Record<string, { href: string; label: string }> = {
    RESTAURANT: { href: currentBusiness ? `/workspaces/restaurantos/${currentBusiness.id}/management/overview` : '/admin/restaurantos', label: 'Launch RestaurantOS' },
    RETAIL: { href: currentBusiness ? `/workspaces/shopos/${currentBusiness.id}` : '/admin/grocery', label: 'Launch ShopOS' },
    SERVICES: { href: currentBusiness ? `/workspaces/serviceos/${currentBusiness.id}` : '/admin/service', label: 'Launch ServiceOS' },
    SCHOOL: { href: currentBusiness ? `/school/admin?org=${currentBusiness.id}` : '/school/admin', label: 'Launch EduOS' },
    HOTEL: { href: currentBusiness ? `/hotel/manager?org=${currentBusiness.id}` : '/hotel/manager', label: 'Launch HotelOS' },
    LOGISTICS: { href: currentBusiness ? `/business/logisticsos/dashboard?org=${currentBusiness.id}` : '/business/logisticsos/dashboard', label: 'Launch LogisticsOS' },
    EVENT_ORGANIZER: { href: currentBusiness ? `/admin/events?org=${currentBusiness.id}` : '/admin/events', label: 'Launch EventsOS' },
    HEALTHCARE: { href: currentBusiness ? `/admin/healthcare?org=${currentBusiness.id}` : '/admin/healthcare', label: 'Launch HealthOS' },
  };

  const os = OS_ROUTES[effectiveOrgType ?? ''] ?? { href: currentBusiness?.workspaceUrl || '/admin/grocery', label: 'Open Workspace' };
  const liveTotal = live.reduce((s, o) => s + o.amount, 0);
  const todayRevenue = parseNaira((realData ? fmtNaira(realData.revenue) : d.today.revenue)) + liveTotal;
  const todayOrders = (realData ? realData.ordersCount : d.today.orders) + live.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-ink flex items-center gap-2">
              {currentMerchant} <BadgeCheck className="w-4 h-4 text-brand-700" />
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live business dashboard · currency {d.currency}
            </p>
          </div>
        </div>
        <Link 
          href={currentBusiness?.workspaceUrl || os.href} 
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black shadow-sm hover:bg-teal-900 transition-all"
        >
          {os.label} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Pages Switcher Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-ink uppercase tracking-wider">Your Business Pages & Workspaces ({myBusinesses.length})</p>
          <button
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-1 text-xs font-black text-teal-800 hover:text-teal-900 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Create Business Page
          </button>
        </div>

        {myBusinesses.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-700">You don&apos;t manage any business pages yet.</p>
            <p className="text-[11px] text-slate-400 mt-1 mb-3">Launch a retail shop, restaurant, service trade, school, hotel, or logistics brand in seconds.</p>
            <button
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-black shadow-sm hover:bg-teal-900 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create a Business Page
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {myBusinesses.map((biz) => {
              const isCurrent = (activeBusiness?.id || myBusinesses[0]?.id) === biz.id;
              return (
                <div
                  key={biz.id}
                  className={cn(
                    'p-3 rounded-xl border transition-all flex items-center justify-between gap-3',
                    isCurrent ? 'border-teal-700 bg-teal-50/40 ring-1 ring-teal-600/20' : 'border-slate-100 bg-slate-50/40 hover:border-slate-200'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-ink truncate">{biz.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{biz.type} · {biz.role}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => switchToBusiness(biz)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer',
                        isCurrent
                          ? 'bg-teal-800 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      {isCurrent ? 'Active' : 'Switch'}
                    </button>
                    <Link
                      href={biz.workspaceUrl}
                      className="px-2 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Open Workspace"
                    >
                      Workspace →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Business Command Center & Growth Toolkit */}
      {currentBusiness && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-5 text-white shadow-lg space-y-4 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-black uppercase tracking-wider">
                  Active Workspace
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {currentBusiness.type} · Role: {currentBusiness.role}
                </span>
              </div>
              <h2 className="text-xl font-black mt-1 text-white">{currentBusiness.name}</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {currentBusiness.address || 'Address not configured'}
              </p>
            </div>
            <Link
              href={currentBusiness.workspaceUrl || os.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-teal-500/20"
            >
              {os.label} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
              Merchant Operations & Growth Toolkit
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <Link
                href={`/business/website?org=${currentBusiness.id}`}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-teal-500/50 transition-all group flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-black text-white group-hover:text-teal-300 transition-colors">Website Builder</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customize your dedicated branded microsite</p>
                </div>
              </Link>

              <Link
                href={`/business/domain?org=${currentBusiness.id}`}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-indigo-500/50 transition-all group flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">Custom Domain</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Connect your own web address & domain</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setShowTeamModal(true)}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-blue-500/50 transition-all text-left group flex flex-col justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">RBAC</span>
                </div>
                <div>
                  <p className="text-xs font-black text-white group-hover:text-blue-300 transition-colors">Team & Staff Access</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Invite cashiers, managers, & team roles</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowBranchModal(true)}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-emerald-500/50 transition-all text-left group flex flex-col justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Branches</span>
                </div>
                <div>
                  <p className="text-xs font-black text-white group-hover:text-emerald-300 transition-colors">Branch Locations</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manage branch addresses & store outlets</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Revenue today" value={fmtNaira(todayRevenue)} delta={live.length > 0 ? 'incl. live orders' : 'recorded sales'} icon={<Banknote className="w-4 h-4" />} tone="teal" />
        <StatTile label="Orders today" value={todayOrders.toString()} delta={todayOrders > 0 ? 'recorded orders' : 'no sales yet'} icon={<ShoppingBag className="w-4 h-4" />} tone="orange" />
        <StatTile label="New customers" value={(realData ? realData.customersCount : d.today.customers).toString()} delta="active relationships" icon={<Users className="w-4 h-4" />} tone="blue" />
        <StatTile label="Gross merchandise" value={fmtNaira(todayRevenue)} delta="settled volume" icon={<TrendingUp className="w-4 h-4" />} tone="emerald" />
      </div>

      {/* Week chart + delivery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black text-ink uppercase tracking-widest">Revenue this week</p>
            <Pill tone="teal">NGN</Pill>
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
            <p className="text-xs font-black text-ink uppercase tracking-widest mb-4">CityDrive Logistics & Dispatch</p>
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
                <p className="text-[12px] text-slate-400 font-medium">Automatic daily payouts configured to merchant wallet.</p>
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
        <SectionHead 
          title="Recent orders & jobs" 
          sub="Live transactions across all locations" 
          more="Open Workspace" 
          moreHref={currentBusiness?.workspaceUrl || os.href} 
        />
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span className="col-span-2">Reference</span>
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
          {(realData ? realData.recentOrders : d.recentOrders).map((o: any) => (
            <div key={o.ref} className="grid grid-cols-2 md:grid-cols-12 gap-2 md:gap-3 px-5 py-3.5 border-b border-slate-50 text-[12px] items-center">
              <span className="col-span-1 font-black text-teal-800">{o.ref}</span>
              <span className="col-span-3 font-black text-ink truncate">{o.name}</span>
              <span className="col-span-3 text-slate-500 font-medium truncate">{o.area}</span>
              <span className="col-span-2 font-black text-ink">{fmtNaira(o.amount)}</span>
              <span className="col-span-2">
                <Pill tone={o.status === 'Delivered' || o.status === 'CONFIRMED' || o.status === 'COMPLETED' ? 'green' : o.status === 'Assigned rider' ? 'blue' : 'orange'}>
                  {o.status}
                </Pill>
              </span>
              <span className="hidden md:block col-span-1 text-right text-[10px] font-bold text-slate-400">{o.time}</span>
            </div>
          ))}
          {live.length === 0 && (realData ? realData.recentOrders : d.recentOrders).length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px] font-black text-ink">No transactions recorded yet</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Orders from your storefront, POS, and online booking will appear here.</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Top products + reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <SectionHead title="Top products & items" sub="By volume & revenue" />
          <div className="space-y-3">
            {(realData ? realData.topProducts : d.topProducts).length === 0 ? (
              <p className="text-[12px] text-slate-400 font-medium">No sales recorded yet.</p>
            ) : (realData ? realData.topProducts : d.topProducts).map((tp: any, i: number) => (
              <div key={tp.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{tp.name}</p>
                  <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-400"
                      style={{ width: `${Math.min(100, ((i + 1) / Math.max(1, (realData?.topProducts?.length || 1))) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-black text-ink">{fmtNaira(tp.revenue)}</p>
                  <p className="text-[10px] font-bold text-slate-400">{`${tp.sold} sold`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="flex items-center gap-1.5 text-xs font-black text-ink uppercase tracking-widest mb-4">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Customer satisfaction & ratings
          </p>
          <div className="space-y-3">
            {d.reviews.length === 0 ? (
              <p className="text-[12px] text-slate-400 font-medium">Verified customer ratings from CityConnect will appear here.</p>
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

      {/* Modals */}
      {currentBusiness && (
        <>
          <BranchManagerModal
            isOpen={showBranchModal}
            onClose={() => setShowBranchModal(false)}
            organizationId={currentBusiness.id}
            organizationName={currentBusiness.name}
          />
          <TeamManagerModal
            isOpen={showTeamModal}
            onClose={() => setShowTeamModal(false)}
            organizationId={currentBusiness.id}
            organizationName={currentBusiness.name}
          />
        </>
      )}
    </div>
  );
}
