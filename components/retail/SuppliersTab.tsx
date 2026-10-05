"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, Phone } from "lucide-react";
import { inputCls, selectCls } from "./ShopUI";
import { getSuppliers, createSupplier, deleteSupplier, getPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus } from '@/lib/actions/procurement';


// =====================================================================
// Suppliers & POs
// =====================================================================

export function SuppliersTab({ organizationId, symbol = "$" }: { organizationId: string; symbol?: string }) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [view, setView] = useState<"suppliers" | "pos">("suppliers");
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", email: "", phone: "" });
  const [isAddPoOpen, setIsAddPoOpen] = useState(false);
  const [poForm, setPoForm] = useState({ supplierId: "", poNumber: "", totalAmount: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [s, p] = await Promise.all([getSuppliers(organizationId), getPurchaseOrders(organizationId)]);
    setSuppliers(s);
    setPos(p);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const submitSupplier = async () => {
    if (!supplierForm.name.trim()) return;
    await createSupplier({ organizationId, ...supplierForm });
    setSupplierForm({ name: "", email: "", phone: "" });
    setIsAddSupplierOpen(false);
    load();
  };

  const removeSupplier = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    const res = await deleteSupplier(id);
    if (res && typeof res === 'object' && 'error' in res && res.error) { alert(res.error); return; }
    load();
  };

  const submitPo = async () => {
    if (!poForm.supplierId || !poForm.poNumber.trim()) return;
    await createPurchaseOrder({ organizationId, supplierId: poForm.supplierId, locationId: "", poNumber: poForm.poNumber, items: [] });
    setPoForm({ supplierId: "", poNumber: "", totalAmount: "" });
    setIsAddPoOpen(false);
    load();
  };

  const cyclePoStatus = async (po: any) => {
    const next: Record<string, string> = { DRAFT: "SENT", SENT: "RECEIVED", RECEIVED: "RECEIVED", PARTIAL: "RECEIVED" };
    await updatePurchaseOrderStatus(po.id, next[po.status] as any);
    load();
  };

  if (loading) return <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3 animate-in fade-in duration-500"><Loader2 className="animate-spin text-brand-500" size={24} /><p className="font-medium text-sm">Loading...</p></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-ink">Suppliers & Purchase Orders</h2>
        <button
          onClick={() => (view === "suppliers" ? setIsAddSupplierOpen(true) : setIsAddPoOpen(true))}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
        >
          <Plus size={16} /> {view === "suppliers" ? "Add Supplier" : "New Purchase Order"}
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setView("suppliers")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${view === "suppliers" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>Suppliers</button>
        <button onClick={() => setView("pos")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${view === "pos" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>Purchase Orders</button>
      </div>

      {view === "suppliers" ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Terms</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No suppliers yet.</td></tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-500">{s.email ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{s.paymentTerms ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeSupplier(s.id)} className="text-xs font-semibold text-red-500 hover:text-red-700">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr><th className="px-4 py-3">PO Number</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pos.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No purchase orders yet.</td></tr>
              ) : (
                pos.map((po) => (
                  <tr key={po.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{po.poNumber}</td>
                    <td className="px-4 py-3 text-slate-500">{po.supplierName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{po.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{po.totalAmount != null ? `${symbol}${po.totalAmount.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {po.status !== "RECEIVED" && (
                        <button onClick={() => cyclePoStatus(po)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Mark {po.status === "DRAFT" ? "Sent" : "Received"}</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
      )}

      {isAddSupplierOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Add Supplier</h3>
              <button onClick={() => setIsAddSupplierOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3">
              <input placeholder="Supplier name" value={supplierForm.name} onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
              <input placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
              <input placeholder="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddSupplierOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submitSupplier} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {isAddPoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">New Purchase Order</h3>
              <button onClick={() => setIsAddPoOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3">
              <select value={poForm.supplierId} onChange={(e) => setPoForm((f) => ({ ...f, supplierId: e.target.value }))} className={selectCls}>
                <option value="">Select supplier...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input placeholder="PO Number (e.g. PO-1001)" value={poForm.poNumber} onChange={(e) => setPoForm((f) => ({ ...f, poNumber: e.target.value }))} className={inputCls} />
              <input type="number" step="0.01" placeholder={`Total amount (${symbol})`} value={poForm.totalAmount} onChange={(e) => setPoForm((f) => ({ ...f, totalAmount: e.target.value }))} className={inputCls} />
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddPoOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submitPo} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
