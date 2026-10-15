"use client";

import React, { useState, useEffect } from "react";
import { Plus, Receipt, FileText, CheckCircle, Clock, X, AlertCircle } from "lucide-react";
import {
  getServiceQuotes,
  getServiceInvoices,
  createServiceInvoice,
  createServiceQuote,
  markServiceInvoicePaid,
} from "@/lib/actions/service";
import { fmtNaira } from "@/lib/format";

export default function FinanceTab({
  organizationId,
  customers,
  onRefresh,
}: {
  organizationId: string;
  customers: any[];
  onRefresh: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"invoices" | "quotes">("invoices");
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [customerDataId, setCustomerDataId] = useState(customers[0]?.id || "");
  const [items, setItems] = useState<
    { description: string; quantity: number; unitPrice: number; subtotal: number }[]
  >([{ description: "Standard Service", quantity: 1, unitPrice: 5000, subtotal: 5000 }]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    const [q, inv] = await Promise.all([
      getServiceQuotes(organizationId),
      getServiceInvoices(organizationId),
    ]);
    setQuotes(q);
    setInvoices(inv);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const updateItem = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      if (field === "quantity" || field === "unitPrice") {
        const qty = field === "quantity" ? Number(val) || 0 : copy[index].quantity;
        const price = field === "unitPrice" ? Number(val) || 0 : copy[index].unitPrice;
        copy[index].subtotal = qty * price;
      }
      return copy;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, subtotal: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
  const total = Math.max(0, subtotal + Number(tax) - Number(discount));

  const handleCreateFinanceDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerDataId) {
      setErrorMsg("Please select a customer.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    let res;
    if (activeTab === "invoices") {
      res = await createServiceInvoice({
        organizationId,
        customerDataId,
        subtotal,
        tax: Number(tax),
        discount: Number(discount),
        total,
        items,
      });
    } else {
      res = await createServiceQuote({
        organizationId,
        customerDataId,
        total,
        tax: Number(tax),
        discount: Number(discount),
        notes,
        items,
      });
    }

    setSubmitting(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setIsAdding(false);
      setItems([{ description: "Standard Service", quantity: 1, unitPrice: 5000, subtotal: 5000 }]);
      await loadData();
      onRefresh();
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    setSubmitting(true);
    const res = await markServiceInvoicePaid({ organizationId, invoiceId });
    setSubmitting(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      await loadData();
      onRefresh();
    }
  };

  const getCustomerName = (custDataId: string) => {
    const c = customers.find((cust) => cust.id === custDataId);
    return c ? `${c.firstName} ${c.lastName}` : "Customer";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quotes & Invoices</h2>
          <p className="text-slate-500 text-sm">Manage billing, customer proposals, and collections.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-200/60 p-1 rounded-lg">
            <button
              onClick={() => {
                setActiveTab("invoices");
                setIsAdding(false);
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "invoices" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => {
                setActiveTab("quotes");
                setIsAdding(false);
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "quotes" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Quotes
            </button>
          </div>
          <button
            onClick={() => {
              setIsAdding(true);
              setErrorMsg(null);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm"
          >
            <Plus size={18} />
            {activeTab === "invoices" ? "New Invoice" : "New Quote"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Creation Modal */}
      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 text-lg">
              {activeTab === "invoices" ? "Create New Invoice" : "Create New Quote / Estimate"}
            </h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleCreateFinanceDoc} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Customer *
              </label>
              <select
                required
                value={customerDataId}
                onChange={(e) => setCustomerDataId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.phone || c.email || "No contact"})
                  </option>
                ))}
              </select>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Line Items
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <input
                      required
                      placeholder="Item description..."
                      value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      required
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-sm max-w-sm ml-auto">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">{fmtNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 items-center">
                <span>Tax:</span>
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                  className="w-20 p-1 bg-white border border-slate-200 rounded text-right text-xs"
                />
              </div>
              <div className="flex justify-between text-slate-600 items-center">
                <span>Discount:</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-20 p-1 bg-white border border-slate-200 rounded text-right text-xs"
                />
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total:</span>
                <span className="text-blue-600">{fmtNaira(total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm disabled:opacity-50"
              >
                {submitting ? "Saving..." : activeTab === "invoices" ? "Generate Invoice" : "Generate Quote"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tables View */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === "invoices" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Amount Paid</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {getCustomerName(inv.customerDataId)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{fmtNaira(inv.total)}</td>
                    <td className="px-6 py-4 text-slate-600">{fmtNaira(inv.amountPaid || 0)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          inv.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.status !== "PAID" && (
                        <button
                          onClick={() => handleMarkPaid(inv.id)}
                          disabled={submitting}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <Receipt size={36} className="mx-auto mb-2 opacity-30" />
                      No invoices found. Click "New Invoice" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "quotes" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Total Estimate</th>
                  <th className="px-6 py-4">Discount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {getCustomerName(q.customerDataId)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{fmtNaira(q.total)}</td>
                    <td className="px-6 py-4 text-slate-600">{fmtNaira(q.discount || 0)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {quotes.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      <FileText size={36} className="mx-auto mb-2 opacity-30" />
                      No quotes found. Click "New Quote" to create an estimate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
