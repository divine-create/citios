"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, AlertCircle, RefreshCcw, Search, Filter } from "lucide-react";
import { updateRoom } from "@/lib/actions/hotel";
import { useRouter } from "next/navigation";

export default function HousekeepingDashboard({ rooms = [] }: { rooms?: any[] }) {
  const [filter, setFilter] = useState("ALL");
  const router = useRouter();

  const mappedRooms = rooms.map(room => ({
    ...room,
    priority: "NORMAL",
    assignedTo: "Unassigned"
  }));

  const filteredRooms = mappedRooms.filter(room => {
    if (filter === "ALL") return true;
    return room.status === filter;
  });

  const changeStatus = async (id: string, status: string) => {
    await updateRoom(id, { status });
    router.refresh();
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'CLEAN': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'DIRTY': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'INSPECTING': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header & Filter */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="text-indigo-500" size={24} /> Housekeeping Operations
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage room cleaning status and assignments.</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {["ALL", "DIRTY", "INSPECTING", "CLEAN"].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                filter === status 
                  ? "bg-slate-800 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRooms.map(room => (
            <div key={room.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col">
              
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Room {room.roomNumber}</h3>
                  <p className="text-sm font-medium text-slate-500">{room.type}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(room.status)}`}>
                  {room.status}
                </div>
              </div>

              {room.priority !== "NORMAL" && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 w-fit px-2 py-1 rounded-md mb-4">
                  <AlertCircle size={14} /> {room.priority} PRIORITY
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned To</span>
                  <span className="text-sm font-semibold text-slate-700">{room.assignedTo}</span>
                </div>
                
                <div className="flex gap-2">
                  {room.status === "DIRTY" && (
                    <button onClick={() => changeStatus(room.id, "CLEAN")} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors" title="Mark as Clean">
                      <CheckCircle2 size={20} />
                    </button>
                  )}
                  {room.status === "CLEAN" && (
                    <button onClick={() => changeStatus(room.id, "DIRTY")} className="p-2 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors" title="Mark as Dirty">
                      <RefreshCcw size={20} />
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
