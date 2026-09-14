import React, { useState, useEffect } from "react";
import { Plus, Receipt, FileText } from "lucide-react";
import { getServiceQuotes, getServiceInvoices } from "@/lib/actions/service";

export default function FinanceTab({
  organizationId,
  customers,
  onRefresh,
}: {
  organizationId: string;
  customers: any[];
  onRefresh: () => void;
}) {
  const [activeTab, setActiveTab] = useState("invoices");
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    getServiceQuotes(organizationId).then(setQuotes);
    getServiceInvoices(organizationId).then(setInvoices);
  }, [organizationId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Quotes & Invoices</h2>
          <p className="text-slate-500 text-sm">Manage billing, payments, and estimates.</p>
        </div>
        <div className="flex bg-slate-200/60 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "invoices" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab("quotes")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "quotes" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Quotes
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === "invoices" && (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
            <Receipt size={48} className="text-slate-300 mb-4" />
            <p className="font-medium text-slate-700">No Invoices</p>
            <p className="text-sm mt-1">Create an invoice from a completed job or appointment.</p>
          </div>
        )}
        {activeTab === "quotes" && (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
            <FileText size={48} className="text-slate-300 mb-4" />
            <p className="font-medium text-slate-700">No Quotes</p>
            <p className="text-sm mt-1">Create an estimate for a potential job.</p>
          </div>
        )}
      </div>
    </div>
  );
}
