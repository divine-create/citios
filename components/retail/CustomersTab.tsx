"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, Search, Phone, Mail, Minus, Star } from "lucide-react";
import { inputCls, TableSkeleton } from "./ShopUI";
import { getCustomers, getCustomer, createCustomer, deleteCustomer, adjustLoyaltyPoints } from '@/lib/actions/retail';
import { StatCard } from "./StatCard";


// =====================================================================
// Customers
// =====================================================================

export function CustomersTab({ organizationId, symbol = "$" }: { organizationId: string; symbol?: string }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const load = async () => {
    const rows = await getCustomers(organizationId);
    setCustomers(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search) || (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm({ name: "", phone: "", email: "", notes: "" });
    setError(null);
    setIsAddOpen(true);
  };

  const submit = async () => {
    setError(null);
    if (!form.name.trim()) { setError("Name is required."); return; }
    setIsSaving(true);
    try {
      const res = await createCustomer({ organizationId, name: form.name, phone: form.phone || undefined, email: form.email || undefined, notes: form.notes || undefined });
      if (res && typeof res === 'object' && 'error' in res && res.error) { setError(res.error); return; }
      setIsAddOpen(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-ink">Customers</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Customers" value={String(totalCustomers)} />
        <StatCard label="Revenue from Customers" value={`${symbol}${totalRevenue.toFixed(2)}`} />
        <StatCard label="Loyalty Points Issued" value={String(totalPoints)} />
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Total Spent</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3 text-right">Last Visit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <TableSkeleton cols={6} />
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{customers.length === 0 ? "No customers yet — add your first one." : "No customers found."}</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} onClick={() => setViewingId(c.id)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{c.name.slice(0, 2).toUpperCase()}</div>
                      <span className="font-semibold text-slate-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.phone && <div className="flex items-center gap-1 text-xs"><Phone size={12} /> {c.phone}</div>}
                    {c.email && <div className="flex items-center gap-1 text-xs mt-0.5"><Mail size={12} /> {c.email}</div>}
                    {!c.phone && !c.email && "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{c.orderCount}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{symbol}{c.totalSpent.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><Star size={12} fill="currentColor" /> {c.loyaltyPoints}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 text-xs">{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table></div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Add Customer</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
              <input placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
              <input placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls} />
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submit} disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg">
                {isSaving ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingId && (
        <CustomerDetailModal organizationId={organizationId} customerDataId={viewingId} onClose={() => setViewingId(null)} onChanged={load} symbol={symbol} />
      )}
    </div>
  );
}

function CustomerDetailModal({ organizationId, customerDataId, onClose, onChanged, symbol = "$" }: {
  organizationId: string; customerDataId: string; onClose: () => void; onChanged: () => void; symbol?: string;
}) {
  const [customer, setCustomer] = useState<any>(null);
  const [pointsDelta, setPointsDelta] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    const data = await getCustomer(organizationId, customerDataId);
    setCustomer(data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerDataId]);

  const applyPoints = async (sign: 1 | -1) => {
    const delta = parseInt(pointsDelta, 10);
    if (isNaN(delta) || delta <= 0) return;
    setIsSaving(true);
    try {
      await adjustLoyaltyPoints(customerDataId, delta * sign);
      setPointsDelta("");
      await load();
      onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete ${customer.name}?`)) return;
    const res = await deleteCustomer(customerDataId);
    if (res && typeof res === 'object' && 'error' in res && res.error) { alert(res.error); return; }
    onChanged();
    onClose();
  };

  if (!customer) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">{customer.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">{customer.name}</h3>
              <p className="text-xs text-slate-400">{customer.phone} {customer.phone && customer.email ? "·" : ""} {customer.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Orders</p>
              <p className="text-lg font-bold text-slate-800">{customer.orderCount}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Total Spent</p>
              <p className="text-lg font-bold text-slate-800">{symbol}{customer.totalSpent.toFixed(2)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-amber-600">Loyalty Points</p>
              <p className="text-lg font-bold text-amber-700 flex items-center justify-center gap-1"><Star size={14} fill="currentColor" /> {customer.loyaltyPoints}</p>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Adjust Points</label>
              <input type="number" value={pointsDelta} onChange={(e) => setPointsDelta(e.target.value)} placeholder="e.g. 50" className="w-full mt-1 p-2 border border-slate-200 rounded-lg" />
            </div>
            <button onClick={() => applyPoints(1)} disabled={isSaving} className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold hover:bg-emerald-200 disabled:opacity-50"><Plus size={16} /></button>
            <button onClick={() => applyPoints(-1)} disabled={isSaving} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 disabled:opacity-50"><Minus size={16} /></button>
          </div>

          {customer.notes && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Notes</p>
              <p className="text-sm text-slate-700">{customer.notes}</p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Order History</h4>
            {customer.orders.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {customer.orders.map((o: any) => (
                  <div key={o.id} className="flex justify-between items-center text-sm border border-slate-100 rounded-lg px-3 py-2">
                    <div>
                      <p className="font-medium text-slate-700">{new Date(o.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400">{o.items.length} item{o.items.length === 1 ? "" : "s"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{symbol}{o.totalAmount.toFixed(2)}</p>
                      <span className={`text-xs font-medium ${o.status === "REFUNDED" ? "text-red-500" : "text-emerald-600"}`}>{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button onClick={remove} className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors">Delete Customer</button>
        </div>
      </div>
    </div>
  );
}
