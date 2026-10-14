"use client";

import { useState, useEffect } from "react";
import { X, Receipt, Eye, RotateCcw, Search, Printer } from "lucide-react";
import ThermalReceiptModal from "@/components/common/ThermalReceiptModal";
import { TableSkeleton } from "./ShopUI";
import { getOrders, refundOrder } from '@/lib/actions/retail';
import { StatCard } from "./StatCard";


// =====================================================================
// Sales & Returns
// =====================================================================

export function SalesReturnsTab({ organizationId, locationId, currentUserId, onChanged, symbol = "$", salesShiftFilter, setSalesShiftFilter }: {
  organizationId: string; locationId?: string | null; currentUserId: string; onChanged: () => void; symbol?: string; salesShiftFilter?: string | null; setSalesShiftFilter?: (id: string | null) => void;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "REFUNDED">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const opts: any = {};
    if (statusFilter !== "ALL") opts.status = statusFilter;
    if (salesShiftFilter) opts.shiftId = salesShiftFilter;
    const rows = await getOrders(organizationId, locationId, opts);
    setOrders(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, statusFilter, salesShiftFilter]);

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return o.id.toLowerCase().includes(q) || o.cashierName.toLowerCase().includes(q) || o.items.some((i: any) => i.productName.toLowerCase().includes(q));
  });

  const openView = (order: any) => {
    setViewingOrder(order);
    setRefundReason("");
    setError(null);
  };

  const submitRefund = async () => {
    if (!viewingOrder) return;
    setError(null);
    setIsRefunding(true);
    try {
      const res = await refundOrder(viewingOrder.id, { reason: refundReason || undefined });
      if (res && typeof res === 'object' && 'error' in res && res.error) { setError(res.error); return; }
      setViewingOrder(null);
      load();
      onChanged();
    } finally {
      setIsRefunding(false);
    }
  };

  const totalSales = orders.filter((o) => o.status === "COMPLETED").reduce((sum, o) => sum + o.totalAmount, 0);
  const totalRefunded = orders.filter((o) => o.status === "REFUNDED").reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-ink">Sales & Returns</h2>
        {salesShiftFilter && (
          <div className="bg-brand-50 border border-brand-200 text-brand-800 px-4 py-2 rounded-xl flex items-center gap-3 text-sm font-semibold">
            <span>Viewing orders for specific shift</span>
            <button
              onClick={() => setSalesShiftFilter?.(null)}
              className="px-2 py-1 bg-white hover:bg-brand-100 rounded-lg transition-colors border border-brand-200 text-xs"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Orders" value={String(orders.length)} />
        <StatCard label="Completed Sales" value={`${symbol}${totalSales.toFixed(2)}`} />
        <StatCard label="Refunded" value={`${symbol}${totalRefunded.toFixed(2)}`} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2">
          {(["ALL", "COMPLETED", "REFUNDED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${statusFilter === s ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {s === "ALL" ? "All Orders" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order, cashier, item..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Cashier</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <TableSkeleton cols={8} />
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No orders found.</td></tr>
            ) : (
              filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{o.cashierName}</td>
                  <td className="px-4 py-3 text-slate-500">{o.items.length} item{o.items.length === 1 ? "" : "s"}</td>
                  <td className="px-4 py-3 text-slate-500">{o.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${o.status === "REFUNDED" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{symbol}{o.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Print Thermal Receipt"
                        onClick={() => setReceiptOrderId(o.id)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        title="View Details"
                        onClick={() => openView(o)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table></div>
      </div>

      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Order #{viewingOrder.id.slice(0, 8)}</h3>
                <p className="text-xs text-slate-400">{new Date(viewingOrder.createdAt).toLocaleString()} · {viewingOrder.cashierName}</p>
              </div>
              <button onClick={() => setViewingOrder(null)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="space-y-2">
                {viewingOrder.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-700">{item.productName} × {item.quantity}</span>
                    <span className="font-semibold text-slate-800">{symbol}{item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-500"><span>Tax</span><span>{symbol}{viewingOrder.taxAmount.toFixed(2)}</span></div>
                {viewingOrder.discountAmount > 0 && <div className="flex justify-between text-slate-500"><span>Discount</span><span>-{symbol}{viewingOrder.discountAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-1"><span>Total</span><span>{symbol}{viewingOrder.totalAmount.toFixed(2)}</span></div>
              </div>

              {/* Print Receipt Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setReceiptOrderId(viewingOrder.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  <Printer size={16} />
                  <span>Print Thermal Receipt (80mm / 58mm)</span>
                </button>
              </div>

              {viewingOrder.status === "REFUNDED" ? (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-red-700 flex items-center gap-1.5"><RotateCcw size={14} /> Refunded {viewingOrder.refundedAt ? new Date(viewingOrder.refundedAt).toLocaleString() : ""}</p>
                  {viewingOrder.refundReason && <p className="text-red-600 mt-1">{viewingOrder.refundReason}</p>}
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
                  <label className="text-xs font-bold text-slate-500 uppercase">Refund Reason (optional)</label>
                  <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={2} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-all" placeholder="e.g. Customer changed their mind" />
                  <button
                    onClick={submitRefund}
                    disabled={isRefunding}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                  >
                    <RotateCcw size={16} /> {isRefunding ? "Processing..." : "Refund This Order"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {receiptOrderId && (
        <ThermalReceiptModal
          orderId={receiptOrderId}
          onClose={() => setReceiptOrderId(null)}
        />
      )}
    </div>
  );
}
