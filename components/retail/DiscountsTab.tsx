"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Loader2, Tag, Trash2, Pencil } from "lucide-react";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/lib/actions/retail";

interface Coupon {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSpend: number;
  isActive: boolean;
  usageLimit: number | null;
  timesUsed: number;
  expiresAt: string | null;
  description: string | null;
}

const EMPTY_FORM = { code: "", type: "PERCENT" as "PERCENT" | "FIXED", value: "", minSpend: "", usageLimit: "", expiresAt: "", description: "" };

export default function DiscountsTab({ organizationId, symbol = "$" }: { organizationId: string; symbol?: string }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    const rows = await getCoupons(organizationId);
    setCoupons(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minSpend: String(c.minSpend || ""),
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
      description: c.description ?? "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const submit = async () => {
    setError(null);
    if (!form.code.trim()) { setError("Coupon code is required."); return; }
    const value = parseFloat(form.value);
    if (isNaN(value) || value <= 0) { setError("Coupon value must be greater than zero."); return; }
    setIsSaving(true);
    try {
      if (editId) {
        const res = await updateCoupon(editId, {
          value,
          minSpend: form.minSpend ? parseFloat(form.minSpend) : 0,
          usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
          expiresAt: form.expiresAt || null,
          description: form.description || null,
        });
        if ((res as any)?.error) { setError((res as any).error); return; }
      } else {
        const res = await createCoupon({
          organizationId,
          code: form.code,
          type: form.type,
          value,
          minSpend: form.minSpend ? parseFloat(form.minSpend) : undefined,
          usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
          expiresAt: form.expiresAt || null,
          description: form.description || null,
        });
        if ((res as any)?.error) { setError((res as any).error); return; }
      }
      setIsModalOpen(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = async (c: Coupon) => {
    const res = await updateCoupon(c.id, { isActive: !c.isActive });
    if ((res as any)?.error) { alert((res as any).error); return; }
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this coupon? Applied orders keep their recorded discount.")) return;
    const res = await deleteCoupon(id);
    if ((res as any)?.error) { alert((res as any).error); return; }
    load();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Discounts</h2>
          <p className="text-sm text-slate-500 mt-1">
            Coupon codes your cashiers can apply at the register. Percent coupons cap at 100%.
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
          <Plus size={16} /> New Coupon
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-xs border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Min Spend</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <Tag size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No coupons yet — create one and type its code at the register.</p>
                </td>
              </tr>
            ) : (
              coupons.map((c) => {
                const exhausted = c.usageLimit != null && c.timesUsed >= c.usageLimit;
                return (
                  <tr key={c.id} className={`hover:bg-slate-50 ${!c.isActive ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-bold text-slate-800">{c.code}</td>
                    <td className="px-4 py-3">
                      {c.type === "PERCENT" ? `${c.value}% off` : `${symbol}${c.value.toFixed(2)} off`}
                      {c.description ? <span className="block text-xs text-slate-400">{c.description}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{c.minSpend > 0 ? `${symbol}${c.minSpend.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {c.timesUsed}{c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                      {exhausted && <span className="block text-xs text-amber-600 font-semibold">Limit reached</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}
                      {c.expiresAt && new Date(c.expiresAt).getTime() < Date.now() && <span className="block text-xs text-red-600 font-semibold">Expired</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(c)} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors ${c.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => remove(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">{editId ? "Edit Coupon" : "New Coupon"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-4 bg-slate-50 max-h-[70vh] overflow-y-auto">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Code</label>
                  <input
                    value={form.code}
                    disabled={!!editId}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="w-full p-2 border border-slate-200 rounded-lg uppercase font-bold"
                    placeholder="WELCOME10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "PERCENT" | "FIXED" }))} className="w-full p-2 border border-slate-200 rounded-lg bg-white">
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FIXED">Fixed amount</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{form.type === "PERCENT" ? "Percent off" : `Amount off (${symbol})`}</label>
                  <input type="number" step="any" min="0" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" placeholder={form.type === "PERCENT" ? "10" : "5.00"} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Min spend (optional)</label>
                  <input type="number" step="any" min="0" value={form.minSpend} onChange={(e) => setForm((f) => ({ ...f, minSpend: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="0" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Usage limit (optional)</label>
                  <input type="number" min="1" value={form.usageLimit} onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="Unlimited" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Expires (optional)</label>
                  <input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description (optional)</label>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="e.g. 10% off first order" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={submit} disabled={isSaving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
                {isSaving ? <Loader2 size={16} className="animate-spin inline" /> : (editId ? "Save Changes" : "Create Coupon")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}