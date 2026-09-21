"use client";

import React, { useState } from "react";
import { Users, Receipt, CreditCard, Plus, ArrowRight } from "lucide-react";
import { addFolioCharge, settleFolio } from "@/lib/actions/hotel";
import { useRouter } from "next/navigation";

export default function FolioBilling({ reservations = [], rooms = [], folioCharges = [] }: { reservations?: any[], rooms?: any[], folioCharges?: any[] }) {
  const router = useRouter();

  const inHouseGuests = reservations
    .filter(res => res.status === "CHECKED_IN")
    .map(res => {
      const room = rooms.find(r => r.id === res.roomId);
      const guestCharges = folioCharges.filter(c => c.reservationId === res.id);
      const totalCharges = guestCharges.reduce((sum, c) => sum + c.amount, 0);
      const balance = (res.totalPrice || 0) + totalCharges;
      return {
        id: res.id,
        name: res.guestName,
        room: room?.roomNumber || "Unassigned",
        status: res.status,
        balance,
        totalCharges,
        charges: guestCharges,
        roomCharge: res.totalPrice || 0
      };
    });

  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const selectedGuest = inHouseGuests.find(g => g.id === selectedGuestId) || inHouseGuests[0] || null;

  const [isPostingCharge, setIsPostingCharge] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  const handlePostCharge = async () => {
    if (!selectedGuest || !desc || !amount) return;
    await addFolioCharge({
      reservationId: selectedGuest.id,
      description: desc,
      amount: parseFloat(amount),
      category: "OTHER"
    });
    setDesc("");
    setAmount("");
    setIsPostingCharge(false);
    router.refresh();
  };

  const handleSettle = async () => {
    if (!selectedGuest) return;
    await settleFolio(selectedGuest.id);
    router.refresh();
  };

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
          {inHouseGuests.map(guest => (
            <button
              key={guest.id}
              onClick={() => setSelectedGuestId(guest.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedGuest?.id === guest.id 
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
      {selectedGuest ? (
        <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Folio Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedGuest.name}</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">Room {selectedGuest.room} • Folio {selectedGuest.id.slice(0,8)}</p>
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
              {!isPostingCharge ? (
                <button onClick={() => setIsPostingCharge(true)} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={16} /> Post Charge
                </button>
              ) : (
                <div className="flex gap-2">
                  <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Desc" className="border px-2 py-1 text-sm rounded" />
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" type="number" className="border px-2 py-1 text-sm rounded w-20" />
                  <button onClick={handlePostCharge} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-bold">Save</button>
                  <button onClick={() => setIsPostingCharge(false)} className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-sm font-bold">Cancel</button>
                </div>
              )}
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
                  <td className="py-4 text-sm font-medium text-slate-800">Room Rate (Total)</td>
                  <td className="py-4 text-sm font-bold text-slate-800 text-right">${selectedGuest.roomCharge.toFixed(2)}</td>
                </tr>
                {selectedGuest.charges.map((charge: any) => (
                  <tr key={charge.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 text-sm text-slate-500">{(charge.createdAt ? new Date(charge.createdAt.epochMilliseconds || charge.createdAt).toLocaleDateString() : "Today")}</td>
                    <td className="py-4 text-sm font-medium text-slate-800">{charge.description}</td>
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
            <button onClick={handleSettle} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2">
              <CreditCard size={18} /> Collect Payment
            </button>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-400">
          No in-house guests
        </div>
      )}
    </div>
  );
}
