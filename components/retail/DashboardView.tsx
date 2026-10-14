"use client";

import { ShoppingCart, Package, Users, DollarSign, ChevronRight, Plus, Receipt, AlertTriangle, BarChart3, TrendingUp } from "lucide-react";
import { StatusPill, SectionCard, EmptyState, btnPrimary, btnOutline } from "./ShopUI";
import ShopOnboardingWidget from "./ShopOnboardingWidget";
import { StatCard } from "./StatCard";


// =====================================================================
// Dashboard (today's overview + real, derived activity)
// =====================================================================

export function DashboardView({ dashboard, organizationId, setActiveMenu }: { dashboard: any; organizationId: string; setActiveMenu: (tab: string) => void }) {
  const symbol = dashboard?.settings?.currencySymbol ?? "$";
  const money = (v: number) => `${symbol}${(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const orderRef = (id: string) => `#${id.slice(0, 8)}`;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {dashboard?.settings && (
        <ShopOnboardingWidget
          settings={dashboard.settings}
          organizationId={organizationId}
          onNavigate={(tab) => setActiveMenu(tab)}
        />
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-ink tracking-tight">Command Center</h1>
          <p className="text-slate-500 mt-1 text-base">
            {dashboard.settings?.storeName ?? "Your store"} — Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveMenu("POS Terminal")} className={btnPrimary}>
            <Plus size={18} className="mr-1" /> New Sale
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5">
        <StatCard label="Revenue" value={money(dashboard.grossSales)} icon={DollarSign} tone="brand" sub={`${dashboard.transactions} orders today`} />
        <StatCard label="Average Order" value={money(dashboard.averageOrderValue)} icon={TrendingUp} tone="emerald" sub="Based on today's sales" />
        <StatCard label="Net Sales" value={money(dashboard.netSales)} icon={BarChart3} tone="purple" sub={`After ${money(dashboard.refunds)} refunds`} />
        <StatCard label="New Customers" value={String(dashboard.newCustomersToday)} icon={Users} tone="blue" sub="Added today" />
      </div>

      {/* ACTION CENTER */}
      {(dashboard.pendingOnlineOrders > 0 || dashboard.fulfillmentActions > 0 || dashboard.lowStockCount > 0 || dashboard.outOfStockCount > 0 || dashboard.activeDeliveries > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-600" /> Needs Your Attention
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboard.pendingOnlineOrders > 0 && (
              <button onClick={() => setActiveMenu("Online Orders")} className="bg-white border border-amber-200 p-4 rounded-xl text-left hover:shadow-md transition-all group">
                <p className="text-3xl font-black text-amber-600 mb-1">{dashboard.pendingOnlineOrders}</p>
                <p className="font-semibold text-amber-900 group-hover:text-amber-700 transition-colors">New online orders</p>
                <p className="text-xs text-amber-700/70 mt-1">Awaiting acceptance</p>
              </button>
            )}
            {dashboard.fulfillmentActions > 0 && (
              <button onClick={() => setActiveMenu("Online Orders")} className="bg-white border border-amber-200 p-4 rounded-xl text-left hover:shadow-md transition-all group">
                <p className="text-3xl font-black text-amber-600 mb-1">{dashboard.fulfillmentActions}</p>
                <p className="font-semibold text-amber-900 group-hover:text-amber-700 transition-colors">Fulfillment actions</p>
                <p className="text-xs text-amber-700/70 mt-1">Ready for courier</p>
              </button>
            )}
            {dashboard.lowStockCount > 0 && (
              <button onClick={() => setActiveMenu("Inventory")} className="bg-white border border-amber-200 p-4 rounded-xl text-left hover:shadow-md transition-all group">
                <p className="text-3xl font-black text-rose-600 mb-1">{dashboard.lowStockCount}</p>
                <p className="font-semibold text-rose-900 group-hover:text-rose-700 transition-colors">Low stock products</p>
                <p className="text-xs text-rose-700/70 mt-1">Requires reordering</p>
              </button>
            )}
            {dashboard.activeDeliveries > 0 && (
              <button onClick={() => setActiveMenu("Online Orders")} className="bg-white border border-amber-200 p-4 rounded-xl text-left hover:shadow-md transition-all group">
                <p className="text-3xl font-black text-blue-600 mb-1">{dashboard.activeDeliveries}</p>
                <p className="font-semibold text-blue-900 group-hover:text-blue-700 transition-colors">Active deliveries</p>
                <p className="text-xs text-blue-700/70 mt-1">In progress via LogisticsOS</p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TWO COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RECENT ORDERS */}
        <SectionCard
          title={<span className="flex items-center gap-2 text-lg"><ShoppingCart size={18} className="text-brand-600" /> Recent Orders</span>}
          action={<button onClick={() => setActiveMenu("Sales & Returns")} className="text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1">View all <ChevronRight size={16}/></button>}
          className="shadow-sm border-slate-200 h-full flex flex-col"
          bodyClassName="flex-1 flex flex-col"
        >
          {dashboard.recentOrders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <EmptyState icon={Receipt} title="No orders yet" message="Completed orders show up here so you can see activity at a glance." action={<button onClick={() => setActiveMenu("POS Terminal")} className={btnOutline}>Open POS</button>} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 flex-1">
              {dashboard.recentOrders.map((o: any) => (
                <li key={o.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setActiveMenu("Sales & Returns")}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                      <Receipt size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-ink">{orderRef(o.id)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{o.cashierName} • {o.items.length} item{o.items.length === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <StatusPill tone={o.status === "REFUNDED" ? "rose" : "emerald"}>{o.status}</StatusPill>
                    <span className="font-black text-ink">{money(o.totalAmount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* TOP PRODUCTS */}
        <SectionCard
          title={<span className="flex items-center gap-2 text-lg"><Package size={18} className="text-brand-600" /> Top Products</span>}
          action={<button onClick={() => setActiveMenu("Inventory")} className="text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1">Manage <ChevronRight size={16}/></button>}
          className="shadow-sm border-slate-200 h-full flex flex-col"
          bodyClassName="flex-1 flex flex-col"
        >
          {dashboard.topProducts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <EmptyState icon={Package} title="No best sellers yet" message="Ring up your first sale at the register and your top products will appear here." action={<button onClick={() => setActiveMenu("POS Terminal")} className={btnOutline}>Open POS</button>} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 p-2 flex-1">
              {dashboard.topProducts.map((p: any, i: number) => (
                <li key={p.productId} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700 ring-2 ring-amber-200" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-800" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.units} {p.units === 1 ? "unit" : "units"} sold today</p>
                    </div>
                  </div>
                  <span className="font-black text-ink">{money(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

      </div>
    </div>
  );
}
