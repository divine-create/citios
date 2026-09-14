"use client";

import React, { useState } from "react";
import { Plus, X, Loader2, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/Shared";
import { createMaintenanceTicket, getMaintenanceTickets, updateMaintenanceTicketStatus } from "@/lib/actions/hotel";

type Room = { id: string; roomNumber: string };

type Ticket = {
  id: string;
  roomId: string | null;
  title: string;
  description: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
};

interface MaintenanceViewProps {
  organizationId: string | null;
  rooms: Room[];
  initialTickets: Ticket[];
}

const PRIORITY_STYLES: Record<Ticket["priority"], string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-orange-100 text-orange-700",
  HIGH: "bg-red-100 text-red-700",
};

const COLUMNS: { status: Ticket["status"]; label: string }[] = [
  { status: "OPEN", label: "Open" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "RESOLVED", label: "Resolved" },
];

export default function MaintenanceView({ organizationId, rooms, initialTickets }: MaintenanceViewProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", roomId: "", priority: "MEDIUM" as Ticket["priority"] });
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const refresh = async () => {
    if (!organizationId) return;
    setTickets(await getMaintenanceTickets(organizationId));
  };

  const submitTicket = async () => {
    if (!organizationId) return;
    setError(null);
    setIsBusy(true);
    try {
      const result = await createMaintenanceTicket({
        organizationId,
        roomId: form.roomId || null,
        title: form.title,
        description: form.description,
        priority: form.priority,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsNewOpen(false);
      setForm({ title: "", description: "", roomId: "", priority: "MEDIUM" });
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const advance = async (ticketId: string, status: "IN_PROGRESS" | "RESOLVED") => {
    await updateMaintenanceTicketStatus(ticketId, status);
    await refresh();
  };

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Maintenance Ticketing</h1>
          <p className="text-sm text-gray-500">Snap a ticket, dispatch to the maintenance crew, track to resolution.</p>
        </div>
        <button
          onClick={() => setIsNewOpen(true)}
          disabled={!organizationId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={16} /> New Ticket
        </button>
      </header>

      <div className="p-6 grid md:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {COLUMNS.map((col) => (
          <div key={col.status} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 text-sm">
                {col.label} ({tickets.filter((t) => t.status === col.status).length})
              </h3>
            </div>
            <div className="p-3 space-y-3 min-h-[120px]">
              {tickets
                .filter((t) => t.status === col.status)
                .map((t) => {
                  const room = rooms.find((r) => r.id === t.roomId);
                  return (
                    <div key={t.id} className="border border-gray-200 rounded-xl p-3">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-sm text-gray-900">{t.title}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_STYLES[t.priority]}`}>
                          {t.priority}
                        </span>
                      </div>
                      {room && <p className="text-xs text-gray-400 mb-1">Room {room.roomNumber}</p>}
                      {t.description && <p className="text-xs text-gray-500 mb-2">{t.description}</p>}
                      {t.status === "OPEN" && (
                        <button
                          onClick={() => advance(t.id, "IN_PROGRESS")}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Start work <ArrowRight size={12} />
                        </button>
                      )}
                      {t.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => advance(t.id, "RESOLVED")}
                          className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-800"
                        >
                          Mark resolved <CheckCircle2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              {tickets.filter((t) => t.status === col.status).length === 0 && (
                <p className="text-sm text-gray-300 text-center py-6">Nothing here.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {isNewOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsNewOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New Maintenance Ticket</h2>
              <button onClick={() => setIsNewOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AC unit not cooling"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Room (optional)</label>
                <select
                  value={form.roomId}
                  onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— No specific room —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>Room {r.roomNumber}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Marks the room Out of Order until resolved.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Ticket["priority"] }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe the issue..."
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setIsNewOpen(false)}>
                Cancel
              </Button>
              <button
                onClick={submitTicket}
                disabled={isBusy || !form.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-blue-700 disabled:opacity-50"
              >
                {isBusy && <Loader2 size={14} className="animate-spin" />}
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
