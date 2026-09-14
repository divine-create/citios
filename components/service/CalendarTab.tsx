import React, { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon } from "lucide-react";

export default function CalendarTab({
  organizationId,
  appointments,
  staff,
  services,
  customers,
  onRefresh,
}: {
  organizationId: string;
  appointments: any[];
  staff: any[];
  services: any[];
  customers: any[];
  onRefresh: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Calendar</h2>
          <p className="text-slate-500 text-sm">Manage appointments and staff scheduling.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Plus size={18} />
          New Appointment
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
        {/* Calendar Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button 
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1 font-medium text-sm text-slate-700 hover:bg-slate-100 rounded"
              >
                Today
              </button>
              <button 
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm text-sm font-medium">
            <button className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded">Day</button>
            <button className="px-3 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors">Week</button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto relative bg-slate-50/50">
          <div className="flex h-[1200px]">
            {/* Time labels */}
            <div className="w-20 flex-shrink-0 border-r border-slate-200 bg-white">
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className="h-24 border-b border-slate-100 flex items-start justify-center pt-2">
                  <span className="text-xs font-medium text-slate-400">
                    {i + 8}:00 {i + 8 < 12 ? "AM" : "PM"}
                  </span>
                </div>
              ))}
            </div>

            {/* Staff Columns */}
            {staff.length > 0 ? (
              staff.map((member) => (
                <div key={member.id} className="flex-1 border-r border-slate-200 min-w-[200px] relative">
                  <div className="h-12 border-b border-slate-200 bg-white sticky top-0 flex items-center justify-center font-bold text-slate-700 shadow-sm z-10">
                    {member.name}
                  </div>
                  {/* Grid Lines */}
                  {Array.from({ length: 13 }).map((_, i) => (
                    <div key={i} className="h-24 border-b border-slate-100"></div>
                  ))}
                  
                  {/* Appointments would be absolutely positioned here based on time */}
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col text-slate-400">
                <User size={48} className="mb-4 opacity-20" />
                <p>No staff members found.</p>
                <p className="text-sm">Add staff in the Services & Staff tab to view schedule.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
