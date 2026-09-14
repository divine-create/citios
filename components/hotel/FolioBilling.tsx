"use client";

import React, { useState } from "react";
import { Users, Receipt, CreditCard, Plus, ArrowRight } from "lucide-react";

const MOCK_GUESTS = [
  { id: "RES-103", name: "Emma Watson", room: "305", status: "IN_HOUSE", balance: 120, totalCharges: 870 },
  { id: "RES-104", name: "David Miller", room: "112", status: "IN_HOUSE", balance: 0, totalCharges: 1400 },
];

const MOCK_FOLIO_CHARGES = [
  { id: "FC-1", date: "Today 08:30", desc: "Room Service - Breakfast", amount: 45.00 },
  { id: "FC-2", date: "Today 14:15", desc: "Spa Treatment - Massage", amount: 75.00 },
];

export default function FolioBilling() {
  const [selectedGuest, setSelectedGuest] = useState(MOCK_GUESTS[0]);

  return (
    <div className="flex h-full gap-6">
      
      {/* Left: Guest List */}
      <div className="w-1/3 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-indigo-500" size={20} /> In-House Guests
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30">
          {MOCK_GUESTS.map(guest => (
            <button
              key={guest.id}
              onClick={() => setSelectedGuest(guest)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedGuest.id === guest.id 
                  ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                  : "bg-white border-slate-200 hover:border-indigo-300"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-slate-800">{guest.name}</span>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  Rm {guest.room}
                </span>
              </div>
              <div className="flex justify-between items-end mt-3">
                <span className="text-xs text-slate-400 font-mono">{guest.id}</span>
                <span className={`text-sm font-bold ${guest.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  Bal: ${guest.balance}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Folio Detail */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Folio Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedGuest.name}</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Room {selectedGuest.room} • Folio {selectedGuest.id}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Balance</p>
            <p className={`text-3xl font-black tracking-tight ${selectedGuest.balance > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              ${selectedGuest.balance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Folio Ledger */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Receipt size={18} className="text-slate-400" /> Recent Charges
            </h3>
            <button className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={16} /> Post Charge
            </button>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <th className="pb-3 w-1/4">Date/Time</th>
                <th className="pb-3 w-1/2">Description</th>
                <th className="pb-3 w-1/4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-4 text-sm text-slate-500">Upon Booking</td>
                <td className="py-4 text-sm font-medium text-slate-800">Room Rate (2 Nights)</td>
                <td className="py-4 text-sm font-bold text-slate-800 text-right">$750.00</td>
              </tr>
              {selectedGuest.balance > 0 && MOCK_FOLIO_CHARGES.map(charge => (
                <tr key={charge.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 text-sm text-slate-500">{charge.date}</td>
                  <td className="py-4 text-sm font-medium text-slate-800">{charge.desc}</td>
                  <td className="py-4 text-sm font-bold text-slate-800 text-right">${charge.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Bar */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
            Print Invoice
          </button>
          <button className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2">
            <CreditCard size={18} /> Collect Payment
          </button>
        </div>

      </div>
    </div>
  );
}
