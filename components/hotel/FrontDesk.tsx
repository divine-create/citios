"use client";

import React, { useState } from "react";
import { Search, LogIn, LogOut, KeyRound, User, CreditCard, AlertCircle } from "lucide-react";

// Mock Data
const MOCK_RESERVATIONS = [
  { id: "RES-101", guestName: "Sarah Jenkins", type: "ARRIVAL", roomType: "King Suite", roomAssigned: null, nights: 3, balance: 450, status: "CONFIRMED" },
  { id: "RES-102", guestName: "Michael Chen", type: "ARRIVAL", roomType: "Double Room", roomAssigned: "204", nights: 1, balance: 0, status: "CONFIRMED" },
  { id: "RES-103", guestName: "Emma Watson", type: "DEPARTURE", roomType: "King Suite", roomAssigned: "305", nights: 2, balance: 120, status: "CHECKED_IN" }, // Balance owed (room service)
  { id: "RES-104", guestName: "David Miller", type: "DEPARTURE", roomType: "Double Room", roomAssigned: "112", nights: 4, balance: 0, status: "CHECKED_IN" },
  { id: "RES-105", guestName: "Olivia Pope", type: "IN_HOUSE", roomType: "Suite", roomAssigned: "401", nights: 5, balance: 0, status: "CHECKED_IN" },
];

export default function FrontDesk() {
  const [activeTab, setActiveTab] = useState<"ARRIVALS" | "DEPARTURES" | "IN_HOUSE">("ARRIVALS");
  const [search, setSearch] = useState("");

  const filteredReservations = MOCK_RESERVATIONS.filter(res => {
    const matchesTab = activeTab === "ARRIVALS" ? res.type === "ARRIVAL" 
                     : activeTab === "DEPARTURES" ? res.type === "DEPARTURE" 
                     : res.type === "IN_HOUSE";
    const matchesSearch = res.guestName.toLowerCase().includes(search.toLowerCase()) || res.id.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Header & Search */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab("ARRIVALS")}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "ARRIVALS" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Arrivals (2)
          </button>
          <button 
            onClick={() => setActiveTab("DEPARTURES")}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "DEPARTURES" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Departures (2)
          </button>
          <button 
            onClick={() => setActiveTab("IN_HOUSE")}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "IN_HOUSE" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            In-House (1)
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search guest or reservation #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
        <div className="space-y-4">
          {filteredReservations.map(res => (
            <div key={res.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === "ARRIVALS" ? "bg-emerald-50 text-emerald-600" :
                  activeTab === "DEPARTURES" ? "bg-rose-50 text-rose-600" :
                  "bg-blue-50 text-blue-600"
                }`}>
                  {activeTab === "ARRIVALS" ? <LogIn size={24} /> : activeTab === "DEPARTURES" ? <LogOut size={24} /> : <User size={24} />}
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{res.guestName}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">
                      <KeyRound size={14} /> {res.roomAssigned ? `Room ${res.roomAssigned}` : 'Unassigned'}
                    </span>
                    <span>{res.roomType}</span>
                    <span>•</span>
                    <span>{res.nights} Nights</span>
                    <span>•</span>
                    <span className="text-slate-400 font-mono text-xs">{res.id}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                {/* Balance Warning */}
                {res.balance > 0 && (
                  <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg text-sm font-bold shrink-0">
                    <AlertCircle size={16} /> Balance: ${res.balance}
                  </div>
                )}
                
                {/* Action Buttons */}
                {activeTab === "ARRIVALS" && (
                  <button className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm shadow-indigo-600/20">
                    Check In
                  </button>
                )}

                {activeTab === "DEPARTURES" && (
                  <button 
                    className={`w-full md:w-auto px-6 py-2.5 rounded-xl font-bold transition-colors shadow-sm ${
                      res.balance > 0 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20' 
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                    }`}
                  >
                    {res.balance > 0 ? 'Settle & Check Out' : 'Check Out'}
                  </button>
                )}

                {activeTab === "IN_HOUSE" && (
                  <button className="w-full md:w-auto px-6 py-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                    <CreditCard size={18} /> Post Charge
                  </button>
                )}
              </div>

            </div>
          ))}

          {filteredReservations.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Search size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No {activeTab.toLowerCase()} found</h3>
              <p className="text-slate-500 mt-1">Try adjusting your search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
