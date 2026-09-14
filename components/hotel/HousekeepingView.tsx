"use client";

import React, { useState } from "react";
import { CheckCircle, Sparkles, SprayCan, AlertTriangle, Clock, MapPin, Search, Filter, Wrench } from "lucide-react";
import { updateRoomStatus } from "@/lib/actions/hotel";

type RoomStatus = "OCCUPIED" | "DIRTY" | "CLEANING" | "INSPECTED" | "AVAILABLE";

interface RoomTask {
  id: string;
  roomNumber: string;
  roomType: string;
  guestName?: string;
  status: RoomStatus;
  notes?: string;
  isPriority: boolean;
  type: "checkout" | "stayover";
}

const getStatusColor = (status: RoomStatus) => {
  switch (status) {
    case "OCCUPIED": return "bg-gray-100 text-gray-700 border-gray-200";
    case "DIRTY": return "bg-red-50 text-red-700 border-red-200";
    case "CLEANING": return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "INSPECTED": return "bg-blue-50 text-blue-700 border-blue-200";
    case "AVAILABLE": return "bg-green-50 text-green-700 border-green-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const getStatusIcon = (status: RoomStatus) => {
  switch (status) {
    case "OCCUPIED": return <Clock className="w-4 h-4" />;
    case "DIRTY": return <AlertTriangle className="w-4 h-4" />;
    case "CLEANING": return <SprayCan className="w-4 h-4" />;
    case "INSPECTED": return <Search className="w-4 h-4" />;
    case "AVAILABLE": return <Sparkles className="w-4 h-4" />;
    default: return null;
  }
};

const NEXT_STATUS: Record<RoomStatus, RoomStatus> = {
  OCCUPIED: "DIRTY",
  DIRTY: "CLEANING",
  CLEANING: "INSPECTED",
  INSPECTED: "AVAILABLE",
  AVAILABLE: "OCCUPIED",
};

export default function HousekeepingView({ initialTasks = [], organizationId }: { initialTasks?: RoomTask[], organizationId?: string | null }) {
  const [tasks, setTasks] = useState<RoomTask[]>(initialTasks);
  const [filter, setFilter] = useState<"all" | "checkout" | "stayover">("all");
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const handleStatusToggle = async (id: string) => {
    if (loadingIds.has(id)) return;
    
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const next = NEXT_STATUS[task.status as RoomStatus] || "DIRTY";
    
    setLoadingIds(prev => { const n = new Set(prev); n.add(id); return n; });
    
    const res = await updateRoomStatus(id, next);
    
    setLoadingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    
    if (res?.success) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: next } : t));
    } else {
      alert(res?.error || "Failed to update room status");
    }
  };

  const handleReportMaintenance = (roomNumber: string) => {
    alert(`Maintenance reported for Room ${roomNumber}`);
  };

  const filteredTasks = tasks.filter(t => filter === "all" || t.type === filter);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 sm:pb-0">
      {/* Header */}
      <header className="bg-white px-4 py-6 shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
            <p className="text-sm text-gray-500">Today&apos;s Assignments</p>
          </div>
          <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-semibold">
            JD
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <button 
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${filter === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            All Tasks ({tasks.length})
          </button>
          <button 
            onClick={() => setFilter("checkout")}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${filter === "checkout" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Checkouts ({tasks.filter(t => t.type === "checkout").length})
          </button>
          <button 
            onClick={() => setFilter("stayover")}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${filter === "stayover" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Stayovers ({tasks.filter(t => t.type === "stayover").length})
          </button>
        </div>
      </header>

      {/* Task List */}
      <main className="flex-1 p-4 space-y-4">
        {filteredTasks.map(task => (
          <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-gray-900">{task.roomNumber}</h2>
                    {task.isPriority && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded uppercase tracking-wider">
                        Priority
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {task.roomType} • {task.type === "checkout" ? "Checkout" : "Stayover"}
                  </p>
                </div>
                
                <button
                  onClick={() => handleStatusToggle(task.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors active:scale-95 ${getStatusColor(task.status)}`}
                >
                  {getStatusIcon(task.status)}
                  <span className="font-semibold">{task.status}</span>
                </button>
              </div>

              {task.guestName && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                  Guest: <span className="font-medium text-gray-900">{task.guestName}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-50 bg-gray-50/50 p-3 flex justify-end">
              <button
                onClick={() => handleReportMaintenance(task.roomNumber)}
                className="flex items-center space-x-1.5 text-sm text-gray-500 hover:text-amber-600 font-medium transition-colors"
              >
                <Wrench className="w-4 h-4" />
                <span>Report Maintenance</span>
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
