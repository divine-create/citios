"use client";

import React, { useState } from "react";
import { Wrench, Plus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const MOCK_TICKETS = [
  { id: "MT-001", room: "204", issue: "AC not cooling", status: "PENDING", priority: "HIGH", reportedBy: "Front Desk" },
  { id: "MT-002", room: "305", issue: "Leaking sink", status: "IN_PROGRESS", priority: "MEDIUM", reportedBy: "Housekeeping" },
  { id: "MT-003", room: "112", issue: "TV remote batteries dead", status: "RESOLVED", priority: "LOW", reportedBy: "Guest" },
];

export default function MaintenanceDashboard() {
  const [filter, setFilter] = useState("ALL");

  const filteredTickets = MOCK_TICKETS.filter(t => {
    if (filter === "ALL") return true;
    return t.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'PENDING': return <AlertTriangle size={18} className="text-amber-500" />;
      case 'IN_PROGRESS': return <Clock size={18} className="text-blue-500" />;
      case 'RESOLVED': return <CheckCircle2 size={18} className="text-emerald-500" />;
      default: return <Wrench size={18} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="text-indigo-500" size={24} /> Maintenance Tickets
          </h2>
          <p className="text-sm text-slate-500 mt-1">Track and resolve property issues.</p>
        </div>
        
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm">
          <Plus size={18} /> New Ticket
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 border-b border-slate-100 flex gap-6 text-sm font-bold">
        {["ALL", "PENDING", "IN_PROGRESS", "RESOLVED"].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`pb-3 border-b-2 transition-colors ${
              filter === status ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {status.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
        <div className="space-y-4">
          {filteredTickets.map(ticket => (
            <div key={ticket.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {getStatusIcon(ticket.status)}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800">Room {ticket.room}</h3>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                      ticket.priority === 'HIGH' ? 'bg-rose-100 text-rose-700' :
                      ticket.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{ticket.issue}</p>
                  <p className="text-xs text-slate-400 mt-2 font-medium">Reported by {ticket.reportedBy} • {ticket.id}</p>
                </div>
              </div>

              <div className="flex gap-2 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                {ticket.status === 'PENDING' && (
                  <button className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-sm transition-colors">
                    Start Work
                  </button>
                )}
                {(ticket.status === 'PENDING' || ticket.status === 'IN_PROGRESS') && (
                  <button className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-sm transition-colors">
                    Resolve
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
