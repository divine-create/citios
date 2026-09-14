"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign, FileText, CreditCard, Users, AlertCircle, CheckCircle2, Clock, TrendingUp,
  Plus, Trash2, Edit2, X, Calendar,
} from "lucide-react";
import {
  createFeeType, updateFeeType, deleteFeeType,
  createFeeInvoice, updateFeeInvoice, deleteFeeInvoice, recordFeePayment,
  markStaffAttendance, createLeaveRequest, updateLeaveRequestStatus,
} from "@/lib/actions/school";

interface FinanceDashboardProps {
  organizationId: string;
  feeTypes: any[];
  feeInvoices: any[];
  feeInvoiceItems: any[];
  students: any[];
  staffAttendance: any[];
  leaveRequests: any[];
  staff: any[];
}

export default function FinanceDashboard({
  organizationId, feeTypes, feeInvoices, feeInvoiceItems, students, staffAttendance, leaveRequests, staff,
}: FinanceDashboardProps) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [activeTab, setActiveTab] = useState<"invoices" | "feetypes" | "staff">("invoices");

  const getStudentName = (studentId: string) => {
    const s = students.find((st) => st.id === studentId);
    return s ? `${s.firstName} ${s.lastName}` : "Unknown Student";
  };

  const totalBilled = feeInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalCollected = feeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalOutstanding = totalBilled - totalCollected;
  const overdueCount = feeInvoices.filter((inv) => inv.status !== "paid" && new Date(inv.dueDate) < new Date()).length;

  // ---- Invoice modal state ----
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

  const [markingStaffId, setMarkingStaffId] = useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState("PRESENT");
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ staffId: "", type: "annual", startDate: "", endDate: "", reason: "" });

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
        const res = await updateFeeInvoice(editInvoiceId, { dueDate: invoiceForm.dueDate, notes: invoiceForm.notes, status: invoiceForm.status });
        if (res.error) throw new Error(res.error);
      } else {
        const items = invoiceItems.filter((it) => it.description.trim() && it.amount > 0);
        if (items.length === 0) throw new Error("Add at least one valid line item.");
        const res = await createFeeInvoice({ organizationId, studentId: invoiceForm.studentId, dueDate: invoiceForm.dueDate, notes: invoiceForm.notes, items });
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
      const res = editFeeTypeId ? await updateFeeType(editFeeTypeId, feeTypeForm) : await createFeeType(organizationId, feeTypeForm);
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

  const markToday = async (staffId: string, status: string) => {
    const res = await markStaffAttendance({ organizationId, staffId, date: new Date().toISOString().slice(0, 10), status });
    if (res?.error) { alert(res.error); return; }
    setMarkingStaffId(null);
    refresh();
  };

  const openLeave = (staffId: string) => {
    setLeaveForm({ staffId, type: "annual", startDate: "", endDate: "", reason: "" });
    setError(null);
    setIsLeaveOpen(true);
  };

  const submitLeave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = await createLeaveRequest({ organizationId, ...leaveForm });
      if (res.error) throw new Error(res.error);
      setIsLeaveOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const reviewLeave = async (id: string, status: "approved" | "rejected") => {
    await updateLeaveRequestStatus(id, { status });
    refresh();
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAttendanceByStaff = (staffId: string) =>
    staffAttendance.find((a) => a.staffId === staffId && new Date(a.date).toISOString().slice(0, 10) === todayStr);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Bursar &amp; Finance Portal</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage tuition invoices, fee types, and staff attendance &amp; leave.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <DollarSign className="w-4 h-4" /> Billed
          </div>
          <h3 className="text-xl font-bold text-gray-900">${totalBilled.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <TrendingUp className="w-4 h-4" /> Collected
          </div>
          <h3 className="text-xl font-bold text-emerald-600">${totalCollected.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <Clock className="w-4 h-4" /> Outstanding
          </div>
          <h3 className="text-xl font-bold text-amber-600">${totalOutstanding.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">
            <AlertCircle className="w-4 h-4" /> Overdue
          </div>
          <h3 className="text-xl font-bold text-red-600">{overdueCount}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex gap-8">
          {[
            { id: "invoices", label: "Tuition & Invoices", icon: FileText },
            { id: "feetypes", label: "Fee Types & Collections", icon: CreditCard },
            { id: "staff", label: "Staff Attendance & Leave", icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Invoices */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Invoices</h3>
            <button onClick={openAddInvoice} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={15} /> Add Invoice
            </button>
          </div>
          <div className="overflow-x-auto">
            <div className="divide-y divide-gray-200 min-w-[600px]">
              {feeInvoices.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400">No invoices yet.</div>
              ) : (
                feeInvoices.map((item) => {
                  const isPaid = item.status === "paid";
                  const isOverdue = item.status !== "paid" && new Date(item.dueDate) < new Date();
                  return (
                    <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                          {getStudentName(item.studentId).charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{getStudentName(item.studentId)}</p>
                          <p className="text-xs text-gray-500">${item.paidAmount.toFixed(2)} of ${item.totalAmount.toFixed(2)} paid</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">${item.totalAmount.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">Due {new Date(item.dueDate).toLocaleDateString()}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isPaid ? "bg-green-100 text-green-800" : isOverdue ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {isPaid ? <CheckCircle2 size={11} /> : isOverdue ? <AlertCircle size={11} /> : <Clock size={11} />}
                          {item.status}
                        </span>
                        {!isPaid && (
                          <button onClick={() => openPay(item.id)} className="p-1.5 text-gray-400 hover:text-emerald-600" title="Record payment"><DollarSign size={16} /></button>
                        )}
                        <button onClick={() => openEditInvoice(item)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => removeInvoice(item.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fee Types */}
      {activeTab === "feetypes" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Fee Types</h3>
            <button onClick={openAddFeeType} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={15} /> Add Fee Type
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {feeTypes.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400">No fee types yet.</div>
            ) : (
              feeTypes.map((ft) => (
                <div key={ft.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ft.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{ft.frequency}{ft.description ? ` — ${ft.description}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-medium text-gray-900">${ft.amount.toFixed(2)}</p>
                    <button onClick={() => openEditFeeType(ft)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                    <button onClick={() => removeFeeType(ft.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Staff Attendance & Leave */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-800">Today's Staff Attendance</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {staff.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400">No staff on record.</div>
              ) : (
                staff.map((s) => {
                  const today = todayAttendanceByStaff(s.id);
                  return (
                    <div key={s.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          {s.userName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.userName}</p>
                          <p className="text-xs text-gray-500">{s.jobTitle || s.memberRole}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {today ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            today.status === "PRESENT" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                          }`}>{today.status}</span>
                        ) : markingStaffId === s.id ? (
                          <div className="flex items-center gap-2">
                            <select value={attendanceStatus} onChange={(e) => setAttendanceStatus(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
                              <option value="PRESENT">Present</option>
                              <option value="ABSENT">Absent</option>
                              <option value="LATE">Late</option>
                            </select>
                            <button onClick={() => markToday(s.id, attendanceStatus)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Save</button>
                          </div>
                        ) : (
                          <button onClick={() => setMarkingStaffId(s.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Mark attendance</button>
                        )}
                        <button onClick={() => openLeave(s.id)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1">
                          <Calendar size={12} /> Request leave
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-800">Leave Requests</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {leaveRequests.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400">No leave requests.</div>
              ) : (
                leaveRequests.map((lr) => {
                  const s = staff.find((st) => st.id === lr.staffId);
                  return (
                    <div key={lr.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s?.userName ?? "Unknown"} — <span className="capitalize">{lr.type}</span></p>
                        <p className="text-xs text-gray-500">{new Date(lr.startDate).toLocaleDateString()} – {new Date(lr.endDate).toLocaleDateString()}{lr.reason ? ` · ${lr.reason}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          lr.status === "approved" ? "bg-green-100 text-green-800" : lr.status === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                        }`}>{lr.status}</span>
                        {lr.status === "pending" && (
                          <>
                            <button onClick={() => reviewLeave(lr.id, "approved")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">Approve</button>
                            <button onClick={() => reviewLeave(lr.id, "rejected")} className="text-xs font-semibold text-red-600 hover:text-red-800">Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Modals ---- */}

      {isInvoiceOpen && (
        <Modal title={editInvoiceId ? "Edit Invoice" : "Add Invoice"} onClose={() => setIsInvoiceOpen(false)}>
          {error && <ErrorBanner text={error} />}
          {!editInvoiceId && (
            <div>
              <label className="text-sm font-medium text-slate-700">Student</label>
              <select value={invoiceForm.studentId} onChange={(e) => setInvoiceForm((f) => ({ ...f, studentId: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
          )}
          <TextField label="Due Date" value={invoiceForm.dueDate} onChange={(v) => setInvoiceForm((f) => ({ ...f, dueDate: v }))} type="date" />
          {editInvoiceId && (
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select value={invoiceForm.status} onChange={(e) => setInvoiceForm((f) => ({ ...f, status: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
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
                  <select value={item.feeTypeId} onChange={(e) => pickFeeType(idx, e.target.value)} className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs">
                    <option value="">Custom...</option>
                    {feeTypes.map((ft) => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                  </select>
                  <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                  <input type="number" placeholder="Amount" value={item.amount || ""} onChange={(e) => updateItem(idx, { amount: parseFloat(e.target.value) || 0 })} className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                  <button onClick={() => setInvoiceItems((items) => items.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600"><X size={14} /></button>
                </div>
              ))}
              <button onClick={() => setInvoiceItems((items) => [...items, { feeTypeId: "", description: "", amount: 0 }])} className="text-xs font-semibold text-blue-600 hover:text-blue-800">+ Add line item</button>
              <p className="text-xs text-slate-500 pt-1">Total: ${invoiceItems.reduce((s, it) => s + (it.amount || 0), 0).toFixed(2)}</p>
            </div>
          )}
          <ModalActions onCancel={() => setIsInvoiceOpen(false)} onSubmit={submitInvoice} disabled={isSaving || !invoiceForm.dueDate || (!editInvoiceId && !invoiceForm.studentId)} isSaving={isSaving} label={editInvoiceId ? "Save Changes" : "Add Invoice"} />
        </Modal>
      )}

      {payInvoiceId && (
        <Modal title="Record Payment" onClose={() => setPayInvoiceId(null)}>
          {error && <ErrorBanner text={error} />}
          <TextField label="Amount" value={payForm.amount} onChange={(v) => setPayForm((f) => ({ ...f, amount: v }))} type="number" placeholder="0.00" />
          <div>
            <label className="text-sm font-medium text-slate-700">Method</label>
            <select value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
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
            <select value={feeTypeForm.frequency} onChange={(e) => setFeeTypeForm((f) => ({ ...f, frequency: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="annual">Annual</option>
              <option value="termly">Termly</option>
              <option value="monthly">Monthly</option>
              <option value="one_time">One-time</option>
            </select>
          </div>
          <ModalActions onCancel={() => setIsFeeTypeOpen(false)} onSubmit={submitFeeType} disabled={isSaving || !feeTypeForm.name.trim() || !feeTypeForm.amount} isSaving={isSaving} label={editFeeTypeId ? "Save Changes" : "Add Fee Type"} />
        </Modal>
      )}

      {isLeaveOpen && (
        <Modal title="Request Leave" onClose={() => setIsLeaveOpen(false)}>
          {error && <ErrorBanner text={error} />}
          <div>
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select value={leaveForm.type} onChange={(e) => setLeaveForm((f) => ({ ...f, type: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="annual">Annual</option>
              <option value="sick">Sick</option>
              <option value="personal">Personal</option>
              <option value="other">Other</option>
            </select>
          </div>
          <TextField label="Start Date" value={leaveForm.startDate} onChange={(v) => setLeaveForm((f) => ({ ...f, startDate: v }))} type="date" />
          <TextField label="End Date" value={leaveForm.endDate} onChange={(v) => setLeaveForm((f) => ({ ...f, endDate: v }))} type="date" />
          <TextField label="Reason (optional)" value={leaveForm.reason} onChange={(v) => setLeaveForm((f) => ({ ...f, reason: v }))} />
          <ModalActions onCancel={() => setIsLeaveOpen(false)} onSubmit={submitLeave} disabled={isSaving || !leaveForm.startDate || !leaveForm.endDate} isSaving={isSaving} label="Submit Request" />
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
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
      <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
      <button onClick={onSubmit} disabled={disabled} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
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
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
    </div>
  );
}
