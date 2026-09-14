"use client";

import React, { useState } from "react";
import { PieChart, Plus, Search, FileText, CheckCircle2, AlertCircle, Clock, Trash2, Edit2, DollarSign, X } from "lucide-react";
import {
  createFeeType, updateFeeType, deleteFeeType,
  createFeeInvoice, updateFeeInvoice, deleteFeeInvoice, recordFeePayment,
} from "@/lib/actions/school";

export type TabId = "invoices" | "feetypes" | "reports";

export const ACCOUNTING_TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "invoices", label: "Student Invoices", icon: FileText },
  { id: "feetypes", label: "Fee Types", icon: DollarSign },
  { id: "reports", label: "Financial Reports", icon: PieChart },
];

interface AccountingManagerProps {
  organizationId: string;
  activeTab: TabId;
  feeInvoices: any[];
  feeTypes: any[];
  students: any[];
  refresh: () => void;
}

export default function AccountingManager({ organizationId, activeTab, feeInvoices, feeTypes, students, refresh }: AccountingManagerProps) {
  const [search, setSearch] = useState("");

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({ studentId: "", dueDate: "", notes: "", status: "unpaid" });
  const [invoiceItems, setInvoiceItems] = useState<{ feeTypeId: string; description: string; amount: number }[]>([
    { feeTypeId: "", description: "", amount: 0 },
  ]);

  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "cash", reference: "" });

  const [isFeeTypeOpen, setIsFeeTypeOpen] = useState(false);
  const [editFeeTypeId, setEditFeeTypeId] = useState<string | null>(null);
  const [feeTypeForm, setFeeTypeForm] = useState({ name: "", description: "", amount: 0, frequency: "annual", active: true });

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getStudentName = (studentId: string) => {
    const s = students.find((st) => st.id === studentId);
    return s ? `${s.firstName} ${s.lastName}` : "Unknown Student";
  };

  // ---- Invoices ----

  const openAddInvoice = () => {
    setEditInvoiceId(null);
    setInvoiceForm({ studentId: students[0]?.id ?? "", dueDate: "", notes: "", status: "unpaid" });
    setInvoiceItems([{ feeTypeId: "", description: "", amount: 0 }]);
    setError(null);
    setIsInvoiceOpen(true);
  };

  const openEditInvoice = (inv: any) => {
    setEditInvoiceId(inv.id);
    setInvoiceForm({
      studentId: inv.studentId,
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "",
      notes: inv.notes || "",
      status: inv.status,
    });
    setError(null);
    setIsInvoiceOpen(true);
  };

  const updateItem = (idx: number, patch: Partial<{ feeTypeId: string; description: string; amount: number }>) => {
    setInvoiceItems((items) => items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const pickFeeType = (idx: number, feeTypeId: string) => {
    const ft = feeTypes.find((f) => f.id === feeTypeId);
    updateItem(idx, { feeTypeId, description: ft?.name ?? "", amount: ft?.amount ?? 0 });
  };

  const submitInvoice = async () => {
    setError(null);
    setIsSaving(true);
    try {
      if (editInvoiceId) {
        const res = await updateFeeInvoice(editInvoiceId, {
          dueDate: invoiceForm.dueDate, notes: invoiceForm.notes, status: invoiceForm.status,
        });
        if (res.error) throw new Error(res.error);
      } else {
        const items = invoiceItems.filter((it) => it.description.trim() && it.amount > 0);
        if (items.length === 0) throw new Error("Add at least one valid line item.");
        const res = await createFeeInvoice({
          organizationId, studentId: invoiceForm.studentId, dueDate: invoiceForm.dueDate, notes: invoiceForm.notes, items,
        });
        if (res.error) throw new Error(res.error);
      }
      setIsInvoiceOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeInvoice = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    const res = await deleteFeeInvoice(id);
    if (res?.error) { alert(res.error); return; }
    refresh();
  };

  const openPay = (invoiceId: string) => {
    setPayInvoiceId(invoiceId);
    setPayForm({ amount: "", method: "cash", reference: "" });
    setError(null);
  };

  const submitPayment = async () => {
    if (!payInvoiceId) return;
    setError(null);
    setIsSaving(true);
    try {
      const amount = parseFloat(payForm.amount);
      if (!amount || amount <= 0) throw new Error("Enter a valid payment amount.");
      const res = await recordFeePayment({ invoiceId: payInvoiceId, amount, method: payForm.method, reference: payForm.reference });
      if (res.error) throw new Error(res.error);
      setPayInvoiceId(null);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderInvoicesTable = () => {
    const filtered = feeInvoices.filter((inv) =>
      getStudentName(inv.studentId).toLowerCase().includes(search.toLowerCase()) ||
      inv.status.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Total Amount</th>
              <th className="px-6 py-4">Amount Paid</th>
              <th className="px-6 py-4">Due Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No invoices found.</td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const isPaid = inv.status === "paid";
                const isOverdue = new Date(inv.dueDate) < new Date() && !isPaid;

                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FileText size={14} />
                        </div>
                        <div>
                          <p>{getStudentName(inv.studentId)}</p>
                          <p className="text-xs text-slate-500">Issue Date: {new Date(inv.issueDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">${inv.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">${inv.paidAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        isPaid ? "bg-emerald-100 text-emerald-700" :
                        isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {isPaid && <CheckCircle2 size={12} />}
                        {isOverdue && <AlertCircle size={12} />}
                        {!isPaid && !isOverdue && <Clock size={12} />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {!isPaid && (
                        <button onClick={() => openPay(inv.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors" title="Record payment"><DollarSign size={16} /></button>
                      )}
                      <button onClick={() => openEditInvoice(inv)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => removeInvoice(inv.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors ml-1"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>
    );
  };

  // ---- Fee Types ----

  const openAddFeeType = () => {
    setEditFeeTypeId(null);
    setFeeTypeForm({ name: "", description: "", amount: 0, frequency: "annual", active: true });
    setError(null);
    setIsFeeTypeOpen(true);
  };

  const openEditFeeType = (ft: any) => {
    setEditFeeTypeId(ft.id);
    setFeeTypeForm({ name: ft.name, description: ft.description || "", amount: ft.amount, frequency: ft.frequency, active: ft.active });
    setError(null);
    setIsFeeTypeOpen(true);
  };

  const submitFeeType = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = editFeeTypeId
        ? await updateFeeType(editFeeTypeId, feeTypeForm)
        : await createFeeType(organizationId, feeTypeForm);
      if (res.error) throw new Error(res.error);
      setIsFeeTypeOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeFeeType = async (id: string) => {
    if (!confirm("Delete this fee type?")) return;
    const res = await deleteFeeType(id);
    if (res?.error) { alert(res.error); return; }
    refresh();
  };

  const renderFeeTypesTable = () => {
    const filtered = feeTypes.filter((ft) =>
      ft.name?.toLowerCase().includes(search.toLowerCase()) ||
      ft.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Frequency</th>
              <th className="px-6 py-4">Default Amount</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No fee types found.</td>
              </tr>
            ) : (
              filtered.map((ft) => (
                <tr key={ft.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{ft.name}</td>
                  <td className="px-6 py-4 text-slate-600">{ft.description || "—"}</td>
                  <td className="px-6 py-4">
                    <span className="capitalize bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">
                      {ft.frequency}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">${ft.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditFeeType(ft)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => removeFeeType(ft.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors ml-1"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
    );
  };

  // ---- Reports ----

  const renderReports = () => {
    const totalBilled = feeInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalCollected = feeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = totalBilled - totalCollected;
    const overdueCount = feeInvoices.filter((inv) => inv.status !== "paid" && new Date(inv.dueDate) < new Date()).length;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Billed</p>
            <p className="text-2xl font-bold text-slate-800">${totalBilled.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Collected</p>
            <p className="text-2xl font-bold text-emerald-600">${totalCollected.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-amber-600">${totalOutstanding.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Overdue Invoices</p>
            <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          </div>
        </div>
        {feeInvoices.length === 0 && (
          <div className="py-8 text-center text-slate-400">
            <PieChart size={32} className="mx-auto mb-3 opacity-30" />
            <p>No invoices yet — reports will populate once invoices are created.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">{ACCOUNTING_TABS.find((t) => t.id === activeTab)?.label ?? "Accounting"}</h1>
        <div className="flex items-center gap-3">
          {activeTab !== "reports" && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
          {activeTab === "invoices" && (
            <button onClick={openAddInvoice} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> <span className="hidden sm:inline">Add Invoice</span>
            </button>
          )}
          {activeTab === "feetypes" && (
            <button onClick={openAddFeeType} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> <span className="hidden sm:inline">Add Fee Type</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {activeTab === "invoices" && renderInvoicesTable()}
        {activeTab === "feetypes" && renderFeeTypesTable()}
        {activeTab === "reports" && renderReports()}
      </div>

      {isInvoiceOpen && (
        <Modal title={editInvoiceId ? "Edit Invoice" : "Add Invoice"} onClose={() => setIsInvoiceOpen(false)}>
          {error && <ErrorBanner text={error} />}
          {!editInvoiceId && (
            <div>
              <label className="text-sm font-medium text-slate-700">Student</label>
              <select
                value={invoiceForm.studentId}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, studentId: e.target.value }))}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
          )}
          <TextField label="Due Date" value={invoiceForm.dueDate} onChange={(v) => setInvoiceForm((f) => ({ ...f, dueDate: v }))} type="date" />
          {editInvoiceId && (
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select
                value={invoiceForm.status}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, status: e.target.value }))}
                className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          )}
          <TextField label="Notes (optional)" value={invoiceForm.notes} onChange={(v) => setInvoiceForm((f) => ({ ...f, notes: v }))} />

          {!editInvoiceId && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Line Items</label>
              {invoiceItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.feeTypeId}
                    onChange={(e) => pickFeeType(idx, e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">Custom...</option>
                    {feeTypes.map((ft) => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                  </select>
                  <input
                    type="text" placeholder="Description" value={item.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="number" placeholder="Amount" value={item.amount || ""}
                    onChange={(e) => updateItem(idx, { amount: parseFloat(e.target.value) || 0 })}
                    className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <button onClick={() => setInvoiceItems((items) => items.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600"><X size={14} /></button>
                </div>
              ))}
              <button
                onClick={() => setInvoiceItems((items) => [...items, { feeTypeId: "", description: "", amount: 0 }])}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                + Add line item
              </button>
              <p className="text-xs text-slate-500 pt-1">
                Total: ${invoiceItems.reduce((s, it) => s + (it.amount || 0), 0).toFixed(2)}
              </p>
            </div>
          )}

          <ModalActions
            onCancel={() => setIsInvoiceOpen(false)} onSubmit={submitInvoice}
            disabled={isSaving || !invoiceForm.dueDate || (!editInvoiceId && !invoiceForm.studentId)}
            isSaving={isSaving} label={editInvoiceId ? "Save Changes" : "Add Invoice"}
          />
        </Modal>
      )}

      {payInvoiceId && (
        <Modal title="Record Payment" onClose={() => setPayInvoiceId(null)}>
          {error && <ErrorBanner text={error} />}
          <TextField label="Amount" value={payForm.amount} onChange={(v) => setPayForm((f) => ({ ...f, amount: v }))} type="number" placeholder="0.00" />
          <div>
            <label className="text-sm font-medium text-slate-700">Method</label>
            <select
              value={payForm.method}
              onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <TextField label="Reference (optional)" value={payForm.reference} onChange={(v) => setPayForm((f) => ({ ...f, reference: v }))} />
          <ModalActions onCancel={() => setPayInvoiceId(null)} onSubmit={submitPayment} disabled={isSaving || !payForm.amount} isSaving={isSaving} label="Record Payment" />
        </Modal>
      )}

      {isFeeTypeOpen && (
        <Modal title={editFeeTypeId ? "Edit Fee Type" : "Add Fee Type"} onClose={() => setIsFeeTypeOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <TextField label="Name" value={feeTypeForm.name} onChange={(v) => setFeeTypeForm((f) => ({ ...f, name: v }))} placeholder="Tuition" />
          <TextField label="Description (optional)" value={feeTypeForm.description} onChange={(v) => setFeeTypeForm((f) => ({ ...f, description: v }))} />
          <TextField label="Amount" value={String(feeTypeForm.amount || "")} onChange={(v) => setFeeTypeForm((f) => ({ ...f, amount: parseFloat(v) || 0 }))} type="number" />
          <div>
            <label className="text-sm font-medium text-slate-700">Frequency</label>
            <select
              value={feeTypeForm.frequency}
              onChange={(e) => setFeeTypeForm((f) => ({ ...f, frequency: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="annual">Annual</option>
              <option value="termly">Termly</option>
              <option value="monthly">Monthly</option>
              <option value="one_time">One-time</option>
            </select>
          </div>
          <ModalActions onCancel={() => setIsFeeTypeOpen(false)} onSubmit={submitFeeType} disabled={isSaving || !feeTypeForm.name.trim() || !feeTypeForm.amount} isSaving={isSaving} label={editFeeTypeId ? "Save Changes" : "Add Fee Type"} />
        </Modal>
      )}
    </div>
  );
}

// =====================================================================
// Shared bits
// =====================================================================

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSubmit, disabled, isSaving, label }: { onCancel: () => void; onSubmit: () => void; disabled: boolean; isSaving: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isSaving ? "Saving..." : label}
      </button>
    </div>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
      <AlertCircle size={14} />
      {text}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
