"use client";

import { useState, useEffect } from "react";
import { Package, Users, Store, Loader2, CheckCircle2, User, AlertTriangle } from "lucide-react";
import { EmptyState, btnOutline } from "./ShopUI";
import { getShopReports, getRetailSettings, exportShopReport } from '@/lib/actions/retail';
import { StatCard } from "./StatCard";


// =====================================================================
// Reports (real derived figures: products, cashiers, customers, stock)
// =====================================================================

export function ReportsTab({ organizationId, setActiveMenu }: { organizationId: string; setActiveMenu: (tab: string) => void }) {
  const [reports, setReports] = useState<any>(null);
  const [symbol, setSymbol] = useState("$");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const load = async () => {
    const r = await getShopReports(organizationId);
    const s = await getRetailSettings(organizationId);
    setReports(r);
    setSymbol(s?.currencySymbol ?? "$");
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  if (loading || !reports) {
    return <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3 animate-in fade-in duration-500"><Loader2 className="animate-spin text-brand-500" size={32} /><p className="font-medium text-sm">Loading workspace...</p></div>;
  }

  const money = (v: number) => `${symbol}${(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const { periods, salesByProduct, salesByCashier, topCustomers, lowStock, totals } = reports;
  const net = (totals.gross || 0) - (totals.refunded || 0);
  const tax = totals.tax || 0;
  const cogs = totals.cogs || 0;
  const grossProfit = net - cogs;
  const expenses = totals.expenses || 0;
  const netProfit = grossProfit - expenses;

  const downloadCsv = async (kind: "orders" | "products" | "customers", filename: string) => {
    const rows = await exportShopReport(organizationId, kind);
    if (rows.length === 0) { alert("Nothing to export yet."); return; }
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...rows.map((r: Record<string, unknown>) => headers.map((h) => esc(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doExport = async (kind: "orders" | "products" | "customers") => {
    setExporting(kind);
    try {
      await downloadCsv(kind, `shopos-${kind}-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-ink">Reports & Financials</h2>
          <p className="text-sm text-slate-500 mt-1">Real sales figures and Simple P&L.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => doExport("orders")} disabled={exporting !== null} className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            {exporting === "orders" ? <Loader2 size={14} className="animate-spin" /> : null} Orders CSV
          </button>
          <button onClick={() => doExport("products")} disabled={exporting !== null} className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            {exporting === "products" ? <Loader2 size={14} className="animate-spin" /> : null} Products CSV
          </button>
          <button onClick={() => doExport("customers")} disabled={exporting !== null} className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            {exporting === "customers" ? <Loader2 size={14} className="animate-spin" /> : null} Customers CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Today", p: periods.today },
          { label: "Last 7 Days", p: periods.sevenDays },
          { label: "Last 30 Days", p: periods.thirtyDays },
        ].map(({ label, p }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-500 uppercase text-[11px] tracking-widest">{label}</h3>
            <p className="text-3xl font-black text-ink mt-1 tracking-tight">{money(p.sales)}</p>
            <div className="flex items-center gap-3 mt-3 text-sm">
              <p><span className="font-bold text-slate-700">{p.transactions}</span> <span className="text-slate-400">orders</span></p>
              {p.refunds > 0 && <p><span className="font-bold text-red-500">-{money(p.refunds)}</span> <span className="text-slate-400">refunds</span></p>}
            </div>
          </div>
        ))}
      </div>

      <h3 className="font-black text-ink text-lg mt-8 pt-6 border-t border-slate-200">Profit & Loss (All Time)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Gross Sales" value={money(totals.gross)} tone="slate" />
        <StatCard label="Tax Collected" value={money(tax)} tone="slate" />
        <StatCard label="Refunds" value={money(totals.refunded)} tone="slate" />
        <StatCard label="Net Sales" value={money(net)} tone="blue" />
        
        <StatCard label="Cost of Goods (COGS)" value={money(cogs)} tone="slate" />
        <StatCard label="Gross Profit" value={money(grossProfit)} tone="emerald" sub="Sales minus COGS" />
        <StatCard label="Store Expenses" value={money(expenses)} tone="red" />
        <StatCard label="True Net Profit" value={money(netProfit)} tone="brand" sub="Gross Profit minus Expenses" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Top Products</h3>
          </div>
          {salesByProduct.length === 0 ? (
            <EmptyState icon={Package} title="No sales yet" message="Products you sell appear here ranked by revenue." action={<button onClick={() => setActiveMenu("POS Terminal")} className={btnOutline}>Open POS</button>} />
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr><th className="px-5 py-2">Product</th><th className="px-5 py-2 text-right">Units</th><th className="px-5 py-2 text-right">Revenue</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesByProduct.slice(0, 8).map((p: any, i: number) => (
                  <tr key={p.productId} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                        <span className="font-semibold text-slate-800">{p.name}</span>
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-500">{p.units} {p.unit}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-slate-800">{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Sales by Cashier</h3>
          </div>
          {salesByCashier.length === 0 ? (
            <EmptyState icon={User} title="No sales yet" message="Cashier performance appears once orders are recorded." action={<button onClick={() => setActiveMenu("POS Terminal")} className={btnOutline}>Open POS</button>} />
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr><th className="px-5 py-2">Cashier</th><th className="px-5 py-2 text-right">Orders</th><th className="px-5 py-2 text-right">Revenue</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesByCashier.map((c: any) => (
                  <tr key={c.cashierId} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-semibold text-slate-800">{c.cashierName}</td>
                    <td className="px-5 py-2.5 text-right text-slate-500">{c.orders}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-slate-800">{money(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Top Customers</h3>
          </div>
          {topCustomers.length === 0 ? (
            <EmptyState icon={Users} title="No customers yet" message="Your highest-spending customers appear here." action={<button onClick={() => setActiveMenu("Customers")} className={btnOutline}>Add a customer</button>} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {topCustomers.map((c: any) => (
                <li key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{c.name.slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.orderCount} order{c.orderCount === 1 ? "" : "s"} · {c.loyaltyPoints} pts</p>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{money(c.totalSpent)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Low Stock</h3>
            <button onClick={() => setActiveMenu("Inventory")} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Manage</button>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All stocked up" message="Nothing is at or below its low-stock threshold." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((p: any) => (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                  <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.stockQuantity} {p.unit} · min {p.lowStockLevel}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
