"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  Calendar,
  AlertTriangle,
  Loader2,
  DollarSign
} from "lucide-react";
import { getShopAnalytics, getLocations } from "@/lib/actions/retail";
import {
  SectionCard,
  PillTabs,
  Skeleton,
  ErrorState,
  EmptyState,
  inputCls
} from "./ShopUI";

type AnalyticsPeriod = "TODAY" | "7_DAYS" | "30_DAYS" | "90_DAYS" | "ALL_TIME";
type AnalyticsSection = "OVERVIEW" | "SALES" | "ORDERS" | "PRODUCTS";

export default function AnalyticsTab({ organizationId, locationId }: { organizationId: string; locationId?: string | null }) {
  const [data, setData] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<AnalyticsSection>("OVERVIEW");
  const [period, setPeriod] = useState<AnalyticsPeriod>("30_DAYS");
  const [filterLocation, setFilterLocation] = useState<string>(locationId || "ALL");

  const load = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDateMs: number | undefined = undefined;
      let endDateMs = now.getTime();

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      if (period === "TODAY") startDateMs = todayStart;
      else if (period === "7_DAYS") startDateMs = todayStart - 6 * 24 * 60 * 60 * 1000;
      else if (period === "30_DAYS") startDateMs = todayStart - 29 * 24 * 60 * 60 * 1000;
      else if (period === "90_DAYS") startDateMs = todayStart - 89 * 24 * 60 * 60 * 1000;

      const [analyticsRes, locData] = await Promise.all([
        getShopAnalytics(organizationId, {
          locationId: filterLocation === "ALL" ? null : filterLocation,
          startDateMs,
          endDateMs
        }),
        getLocations(organizationId)
      ]);

      setData(analyticsRes);
      setLocations(locData);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [organizationId, period, filterLocation]);

  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <ErrorState title="Unable to load analytics" message={error} action={<button onClick={load} className="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700">Try Again</button>} />
      </div>
    );
  }

  const formatMoney = (val: number) => `₦${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const tabs = [
    { value: "OVERVIEW", label: "Overview" },
    { value: "SALES", label: "Sales" },
    { value: "ORDERS", label: "Orders" },
    { value: "PRODUCTS", label: "Products" }
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-ink tracking-tight">Analytics & Business Intelligence</h2>
          <p className="text-sm text-slate-500 mt-1">Make data-driven decisions based on authoritative transactional history.</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <PillTabs tabs={tabs as any} active={activeSection} onChange={(val) => setActiveSection(val as any)} />
        <div className="flex items-center gap-3">
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className={inputCls + " py-1.5 text-sm w-auto bg-slate-50 border-transparent hover:border-slate-200"}>
            <option value="ALL">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value as any)} className={inputCls + " py-1.5 text-sm w-auto bg-slate-50 border-transparent hover:border-slate-200"}>
            <option value="TODAY">Today</option>
            <option value="7_DAYS">Last 7 Days</option>
            <option value="30_DAYS">Last 30 Days</option>
            <option value="90_DAYS">Last 90 Days</option>
            <option value="ALL_TIME">All Time</option>
          </select>
        </div>
      </div>

      {/* Loading Overlay when changing filters */}
      {loading && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-xl">
           <Loader2 className="animate-spin text-brand-600" size={32} />
        </div>
      )}

      {/* OVERVIEW SECTION */}
      {activeSection === "OVERVIEW" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <DollarSign size={16} />
                  <p className="text-xs font-bold uppercase tracking-widest">Gross Sales</p>
                </div>
                <p className="text-3xl font-black text-ink">{formatMoney(data.grossSales)}</p>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <ShoppingCart size={16} />
                  <p className="text-xs font-bold uppercase tracking-widest">Completed Orders</p>
                </div>
                <p className="text-3xl font-black text-ink">{data.completedOrders}</p>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <TrendingUp size={16} />
                  <p className="text-xs font-bold uppercase tracking-widest">Avg Order Value</p>
                </div>
                <p className="text-3xl font-black text-ink">{formatMoney(data.aov)}</p>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                  <AlertTriangle size={16} />
                  <p className="text-xs font-bold uppercase tracking-widest">Refunds</p>
                </div>
                <p className="text-3xl font-black text-rose-600">{formatMoney(data.refundsAmount)}</p>
             </div>
          </div>

          <SectionCard title="Revenue Trend">
            {data.revenueTrend && data.revenueTrend.length > 0 ? (
               <div className="flex items-end gap-2 h-48 mt-4 pt-4 border-t border-slate-100 overflow-x-auto pb-2">
                 {data.revenueTrend.map((t: any, idx: number) => {
                    const max = Math.max(...data.revenueTrend.map((x: any) => x.revenue));
                    const height = max > 0 ? (t.revenue / max) * 100 : 0;
                    return (
                      <div key={idx} className="flex flex-col items-center flex-1 min-w-[30px] group">
                         <div className="w-full relative flex items-end justify-center h-full bg-slate-50 rounded-t-md hover:bg-slate-100 transition-colors">
                            <div className="w-4/5 bg-brand-500 rounded-t-sm transition-all" style={{ height: `${height}%` }}></div>
                            <div className="absolute -top-8 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10 transition-opacity">
                              {formatMoney(t.revenue)}
                            </div>
                         </div>
                         <p className="text-[9px] font-bold text-slate-400 mt-2 truncate w-full text-center">
                            {new Date(t.day).getDate()}/{new Date(t.day).getMonth() + 1}
                         </p>
                      </div>
                    );
                 })}
               </div>
            ) : (
               <div className="py-12 flex justify-center items-center text-sm font-medium text-slate-400">No revenue data for this period</div>
            )}
          </SectionCard>
        </div>
      )}

      {/* SALES SECTION */}
      {activeSection === "SALES" && (
        <div className="space-y-6">
           <SectionCard title="Sales Metrics">
              <div className="divide-y divide-slate-100">
                 <div className="flex justify-between py-4">
                    <span className="font-semibold text-slate-600">Gross Sales</span>
                    <span className="font-black text-ink">{formatMoney(data.grossSales)}</span>
                 </div>
                 <div className="flex justify-between py-4">
                    <span className="font-semibold text-slate-600">Refunds & Cancellations</span>
                    <span className="font-black text-rose-600">-{formatMoney(data.refundsAmount)}</span>
                 </div>
                 <div className="flex justify-between py-4 bg-slate-50 -mx-6 px-6">
                    <span className="font-black text-ink">Net Sales</span>
                    <span className="font-black text-emerald-600">{formatMoney(data.netSales)}</span>
                 </div>
              </div>
           </SectionCard>
        </div>
      )}

      {/* ORDERS SECTION */}
      {activeSection === "ORDERS" && (
        <div className="space-y-6">
           <SectionCard title="Order Funnel">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                 <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center justify-center text-center">
                    <p className="text-3xl font-black text-slate-700">{data.orderStatusDistribution.PENDING}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Pending</p>
                 </div>
                 <div className="p-4 rounded-xl border border-brand-100 bg-brand-50 flex flex-col items-center justify-center text-center">
                    <p className="text-3xl font-black text-brand-700">{data.orderStatusDistribution.PROCESSING}</p>
                    <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mt-1">Processing</p>
                 </div>
                 <div className="p-4 rounded-xl border border-amber-100 bg-amber-50 flex flex-col items-center justify-center text-center">
                    <p className="text-3xl font-black text-amber-700">{data.orderStatusDistribution.READY}</p>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">Ready</p>
                 </div>
                 <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50 flex flex-col items-center justify-center text-center">
                    <p className="text-3xl font-black text-emerald-700">{data.orderStatusDistribution.CONFIRMED}</p>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">Confirmed</p>
                 </div>
                 <div className="p-4 rounded-xl border border-rose-100 bg-rose-50 flex flex-col items-center justify-center text-center">
                    <p className="text-3xl font-black text-rose-700">{data.orderStatusDistribution.CANCELLED}</p>
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mt-1">Cancelled</p>
                 </div>
              </div>
              <p className="text-xs text-slate-500 mt-4 text-center">Total Orders Created: <span className="font-bold">{data.totalOrders}</span></p>
           </SectionCard>
        </div>
      )}

      {/* PRODUCTS SECTION */}
      {activeSection === "PRODUCTS" && (
        <div className="space-y-6">
           <SectionCard title="Top Performing Products">
              {data.topProducts && data.topProducts.length > 0 ? (
                <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3 text-right">Units Sold</th>
                        <th className="px-4 py-3 text-right">Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.topProducts.map((p: any, i: number) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-ink flex items-center gap-3">
                             <span className="text-slate-400 font-bold w-4">{i + 1}.</span>
                             {p.name}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700">{p.units}</td>
                          <td className="px-4 py-3 text-right font-black text-emerald-600">{formatMoney(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 flex justify-center items-center text-sm font-medium text-slate-400">No products sold during this period</div>
              )}
           </SectionCard>
        </div>
      )}
    </div>
  );
}
