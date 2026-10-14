"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X, Receipt, Trash2 } from "lucide-react";
import { inputCls, selectCls } from "./ShopUI";
import { getExpenses, createExpense, deleteExpense, getExpenseSummary } from '@/lib/actions/retail';
import { uploadAsset } from "@/lib/actions/microsite";
import { StatCard } from "./StatCard";


// =====================================================================
// Expenses
// =====================================================================

const EXPENSE_CATEGORIES = ["Rent", "Utilities", "Supplies", "Payroll", "Maintenance", "Marketing", "Other"];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(",");
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ExpensesTab({ organizationId, currentUserId, symbol = "$" }: { organizationId: string; currentUserId: string; symbol?: string }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ totalThisMonth: number; countThisMonth: number; totalAllTime: number; byCategory: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0], description: "", amount: "", expenseDate: todayInputValue(), paymentMethod: "CASH", vendorName: "" });
  const [receiptAssetId, setReceiptAssetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    const [exp, sum] = await Promise.all([getExpenses(organizationId), getExpenseSummary(organizationId)]);
    setExpenses(exp);
    setSummary(sum);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const openAdd = () => {
    setForm({ category: EXPENSE_CATEGORIES[0], description: "", amount: "", expenseDate: todayInputValue(), paymentMethod: "CASH", vendorName: "" });
    setReceiptAssetId(null);
    setError(null);
    setIsAddOpen(true);
  };

  const handleReceiptUpload = async (file: File) => {
    setUploading(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await uploadAsset(organizationId, { fileName: file.name, mimeType, base64Data: base64 });
      if (res && typeof res === 'object' && 'assetId' in res && res.assetId) setReceiptAssetId(res.assetId);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError(null);
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { setError("Enter a valid amount."); return; }
    setIsSaving(true);
    try {
      const res = await createExpense({
        organizationId,
        category: form.category,
        description: form.description || undefined,
        amount,
        expenseDate: form.expenseDate,
        paymentMethod: form.paymentMethod as "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER",
        vendorName: form.vendorName || undefined,
        receiptAssetId: receiptAssetId ?? undefined,
      });
      if (res && typeof res === 'object' && 'error' in res && res.error) { setError(res.error); return; }
      setIsAddOpen(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this expense record?")) return;
    await deleteExpense(id);
    load();
  };

  if (loading || !summary) return <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3 animate-in fade-in duration-500"><Loader2 className="animate-spin text-brand-500" size={24} /><p className="font-medium text-sm">Loading...</p></div>;

  const maxCategoryAmount = Math.max(1, ...Object.values(summary.byCategory));

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-ink">Expenses</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
          <Plus size={16} /> Record Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="This Month" value={`${symbol}${summary.totalThisMonth.toFixed(2)}`} />
        <StatCard label="Expenses This Month" value={String(summary.countThisMonth)} />
        <StatCard label="All Time Total" value={`${symbol}${summary.totalAllTime.toFixed(2)}`} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-bold text-slate-800 mb-4">This Month by Category</h3>
        <div className="space-y-3">
          {EXPENSE_CATEGORIES.map((cat) => {
            const amount = summary.byCategory[cat] ?? 0;
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-24 text-sm text-slate-600 flex-shrink-0">{cat}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${(amount / maxCategoryAmount) * 100}%` }} />
                </div>
                <span className="w-20 text-right text-sm font-semibold text-slate-700 flex-shrink-0">{symbol}{amount.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-slate-800 mb-3">Recent Expenses</h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Vendor / Description</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No expenses recorded yet.</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600">{new Date(e.expenseDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{e.category}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {e.vendorName && <span className="font-medium">{e.vendorName}</span>}
                      {e.vendorName && e.description && " — "}
                      {e.description && <span className="text-slate-500">{e.description}</span>}
                      {!e.vendorName && !e.description && "—"}
                      {e.receiptAssetId && (
                        <a href={`/api/assets/${e.receiptAssetId}`} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center text-blue-500 hover:text-blue-700">
                          <Receipt size={14} />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{e.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{symbol}{e.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(e.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Record Expense</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={selectCls}>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Amount ({symbol})</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                  <input type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} className={selectCls}>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Vendor</label>
                <input value={form.vendorName} onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))} className={inputCls} placeholder="e.g. City Power & Light" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Optional note" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Receipt</label>
                <div className="flex items-center gap-3">
                  {receiptAssetId ? (
                    <img src={`/api/assets/${receiptAssetId}`} alt="Receipt" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-300"><Receipt size={18} /></div>
                  )}
                  <label className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                    {uploading ? <Loader2 size={14} className="animate-spin inline" /> : (receiptAssetId ? "Replace" : "Upload")}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleReceiptUpload(e.target.files[0])} />
                  </label>
                  {receiptAssetId && <button onClick={() => setReceiptAssetId(null)} className="text-xs font-semibold text-slate-400 hover:text-red-600">Remove</button>}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submit} disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg">
                {isSaving ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
