"use client";

import { useState } from "react";
import { ChevronRight, Lock, Loader2 } from "lucide-react";
import { btnPrimary, inputCls, selectCls } from "./ShopUI";
import { openShift, createRegister } from '@/lib/actions/retail';


export function OpenShiftPrompt({ organizationId, locationId, registers, currentUserId, onOpened, symbol = "$" }: {
  organizationId: string; locationId?: string | null; registers: any[]; currentUserId: string; onOpened: () => void; symbol?: string;
}) {
  const [registerId, setRegisterId] = useState(registers[0]?.id ?? "");
  const [openingFloat, setOpeningFloat] = useState("100");
  const [newRegisterName, setNewRegisterName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addRegister = async () => {
    if (!newRegisterName.trim()) return;
    const res = await createRegister(organizationId, newRegisterName, locationId);
    if (res && typeof res === 'object' && 'register' in res && res.register) {
      setRegisterId(res.register.id);
      setNewRegisterName("");
      onOpened();
    }
  };

  const submit = async () => {
    setError(null);
    if (!registerId) { setError("Select or create a register first."); return; }
    const float = parseFloat(openingFloat);
    if (isNaN(float) || float < 0) { setError("Enter a valid opening cash float."); return; }
    setIsSaving(true);
    try {
      const res = await openShift({ organizationId, registerId, openingFloat: float, locationId });
      if (res && typeof res === 'object' && 'error' in res && res.error) { setError(res.error); return; }
      onOpened();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 bg-brand-50 text-brand-700 rounded-xl flex items-center justify-center mx-auto"><Lock size={28} /></div>
        <h3 className="font-black text-ink text-lg">No Register Open</h3>
        <p className="text-sm text-slate-500">Open a register shift to start ringing up sales.</p>
        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 text-left">{error}</div>}

        {registers.length > 0 ? (
          <div className="text-left space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Register</label>
            <select value={registerId} onChange={(e) => setRegisterId(e.target.value)} className={selectCls}>
              {registers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        ) : (
          <div className="text-left space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">New Register Name</label>
            <div className="flex gap-2">
              <input value={newRegisterName} onChange={(e) => setNewRegisterName(e.target.value)} placeholder="Register 1" className={`${inputCls} flex-1`} />
              <button onClick={addRegister} className="px-3 bg-ink text-white rounded-lg font-semibold text-sm">Add</button>
            </div>
          </div>
        )}

        <div className="text-left space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Opening Cash Float ({symbol})</label>
          <input type="number" step="0.01" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} className={inputCls} />
        </div>

        <button
          onClick={submit}
          disabled={isSaving || !registerId}
          className={`${btnPrimary} w-full py-3 rounded-xl`}
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
          Open Shift
        </button>
      </div>
    </div>
  );
}
