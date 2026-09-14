"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Search, Filter, Plus, Calendar as CalendarIcon, User, Wrench } from "lucide-react";

// Mock Data
const ROOMS = [
  { id: "101", number: "101", type: "Standard King", status: "CLEAN", floor: 1 },
  { id: "102", number: "102", type: "Standard Double", status: "OCCUPIED", floor: 1 },
  { id: "103", number: "103", type: "Standard King", status: "DIRTY", floor: 1 },
  { id: "201", number: "201", type: "Deluxe King", status: "CLEAN", floor: 2 },
  { id: "202", number: "202", type: "Oceanview Suite", status: "CLEAN", floor: 2 },
  { id: "301", number: "301", type: "Presidential Suite", status: "MAINTENANCE", floor: 3 },
];

const RESERVATIONS = [
  { id: "R1", roomId: "101", guest: "Alice Smith", checkIn: 2, checkOut: 5, status: "CONFIRMED", color: "bg-blue-500" },
  { id: "R2", roomId: "102", guest: "Bob Johnson", checkIn: 1, checkOut: 4, status: "IN_HOUSE", color: "bg-emerald-500" },
  { id: "R3", roomId: "201", guest: "Charlie Davis", checkIn: 4, checkOut: 7, status: "CONFIRMED", color: "bg-blue-500" },
  { id: "R4", roomId: "202", guest: "Diana Prince", checkIn: 2, checkOut: 8, status: "CONFIRMED", color: "bg-purple-500" },
  { id: "R5", roomId: "301", guest: "Maintenance Block", checkIn: 1, checkOut: 3, status: "OUT_OF_ORDER", color: "bg-rose-500" },
  { id: "R6", roomId: "103", guest: "Eve Adams", checkIn: 6, checkOut: 9, status: "CONFIRMED", color: "bg-blue-500" },
];

const DAYS_IN_VIEW = 14;

export default function TapeChart({ initialRooms = [], initialReservations = [] }: { initialRooms?: any[], initialReservations?: any[] }) {
  // Use real data if provided, fallback to mock if empty
  const rooms = initialRooms.length > 0 ? initialRooms.map(r => ({
    id: r.id,
    number: r.roomNumber,
    type: r.type,
    status: r.status,
    floor: parseInt(r.roomNumber[0]) || 1
  })) : ROOMS;

  const [startDate, setStartDate] = useState(() => {
    // Start view near the first reservation date or today
    if (initialReservations.length > 0 && initialReservations[0].checkInDate) {
       const d = new Date(initialReservations[0].checkInDate);
       d.setHours(0, 0, 0, 0);
       d.setDate(d.getDate() - 2); // Show 2 days before first booking
       return d;
    }
    return new Date(2026, 8, 4); // Fallback mock date near the DB dates
  });

  const dates = Array.from({ length: DAYS_IN_VIEW }).map((_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const reservations = initialReservations.length > 0 ? initialReservations.map(r => {
    const ci = new Date(r.checkInDate);
    const co = new Date(r.checkOutDate);
    ci.setHours(0,0,0,0);
    co.setHours(0,0,0,0);
    
    // Calculate offset and width in days relative to startDate
    const msPerDay = 1000 * 60 * 60 * 24;
    const offsetDays = Math.round((ci.getTime() - startDate.getTime()) / msPerDay);
    const durationDays = Math.round((co.getTime() - ci.getTime()) / msPerDay);

    let color = "bg-blue-500";
    if (r.status === "CHECKED_IN") color = "bg-emerald-500";
    if (r.status === "CHECKED_OUT") color = "bg-slate-500";
    if (r.status === "CANCELLED") color = "bg-rose-500";

    return {
      id: r.id,
      roomId: r.roomId,
      guest: r.guestName || "Unknown",
      checkIn: offsetDays,
      checkOut: offsetDays + Math.max(1, durationDays),
      status: r.status,
      color
    };
  }) : RESERVATIONS.map(r => ({
    ...r,
    checkIn: r.checkIn - 1, // Fix mock 1-indexed to 0-indexed offset
    checkOut: r.checkOut - 1
  }));

  const handleNext = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 7);
    setStartDate(d);
  };

  const handlePrev = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 7);
    setStartDate(d);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon size={20} className="text-indigo-500" />
            Tape Chart (Reservation Calendar)
          </h2>
          <p className="text-sm text-slate-500">Visual overview of room inventory and bookings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-lg border border-slate-200 p-1">
            <button onClick={handlePrev} className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="px-3 py-1 text-sm font-semibold text-slate-700 flex items-center border-x border-slate-100">
              {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {dates[dates.length-1].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <button onClick={handleNext} className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Plus size={16} /> New Booking
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search guests..." className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
        </div>
        <button className="flex items-center gap-2 text-slate-600 text-sm font-medium hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg">
          <Filter size={16} /> Filter Rooms
        </button>
        <div className="ml-auto flex items-center gap-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Confirmed</span>
          <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> In-House</span>
          <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"></div> VIP</span>
          <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500"></div> Blocked</span>
        </div>
      </div>

      {/* Tape Chart Grid */}
      <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
        <div className="min-w-max border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
          {/* Calendar Header */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div className="w-48 shrink-0 border-r border-slate-200 p-3 font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center bg-white sticky left-0 z-20 shadow-[1px_0_0_0_#e2e8f0]">
              Room Type
            </div>
            {dates.map((date, i) => (
              <div key={i} className="w-20 shrink-0 border-r border-slate-100 p-2 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div className={`text-sm font-bold ${date.getDate() === new Date().getDate() ? "text-indigo-600 bg-indigo-50 w-6 h-6 rounded-full flex items-center justify-center mx-auto mt-0.5" : "text-slate-700 mt-1"}`}>
                  {date.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Room Rows */}
          {rooms.map((room) => (
            <div key={room.id} className="flex border-b border-slate-100 hover:bg-slate-50/80 group">
              {/* Room Info Column (Sticky) */}
              <div className="w-48 shrink-0 border-r border-slate-200 p-3 bg-white group-hover:bg-slate-50/80 sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  {room.number}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide ${room.status === "CLEAN" ? "bg-emerald-100 text-emerald-700" : room.status === "DIRTY" ? "bg-amber-100 text-amber-700" : room.status === "MAINTENANCE" || room.status === "OUT_OF_ORDER" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
                    {room.status.substring(0, 1)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5" title={room.type}>{room.type}</div>
              </div>

              {/* Date Cells & Reservations */}
              <div className="flex relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTAwJSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PC9zdmc+')]">
                {dates.map((_, i) => (
                  <div key={i} className="w-20 shrink-0 h-14 relative group/cell">
                    <div className="hidden group-hover/cell:block absolute inset-0 bg-indigo-50/50 cursor-crosshair"></div>
                  </div>
                ))}
                
                {/* Render Reservations for this Room */}
                {reservations.filter(r => r.roomId === room.id).map(res => {
                  const leftPos = res.checkIn * 80; 
                  const width = ((res.checkOut - res.checkIn) * 80) - 4; // -4 for padding

                  // Only render if it falls within our view
                  if (res.checkOut <= 0 || res.checkIn >= DAYS_IN_VIEW) return null;

                  return (
                    <div 
                      key={res.id} 
                      className={`absolute top-1.5 h-11 rounded-md shadow-sm border border-black/10 cursor-pointer overflow-hidden transition-transform hover:scale-[1.02] hover:shadow-md ${res.color} text-white z-10 flex flex-col justify-center px-2`}
                      style={{ left: `${leftPos + 2}px`, width: `${width}px` }}
                      title={`${res.guest} (${res.status})`}
                    >
                      <div className="text-xs font-bold truncate leading-tight flex items-center gap-1.5">
                        {(res.status === "IN_HOUSE" || res.status === "CHECKED_IN") && <User size={10} />}
                        {res.status === "OUT_OF_ORDER" && <Wrench size={10} />}
                        {res.guest}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
