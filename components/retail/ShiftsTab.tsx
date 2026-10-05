"use client";

import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { openShift, closeShift, getShiftHistory } from '@/lib/actions/retail';


// =====================================================================
// Cash & Shifts
// =====================================================================

export function ShiftsTab({ organizationId, locationId, registers, openShift: openShiftData, currentUserId, onChanged, symbol = "$", setActiveMenu, setSalesShiftFilter }: {
  organizationId: string; locationId?: string | null; registers: any[]; openShift: any | null; currentUserId: string; onChanged: () => void; symbol?: string; setActiveMenu: (m: string) => void; setSalesShiftFilter: (id: string | null) => void;
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [actualCash, setActualCash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ expectedCash: number; discrepancy: number } | null>(null);

  const loadHistory = async () => {
    const rows = await getShiftHistory(organizationId);
    setHistory(rows);
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openShiftData?.id]);

  const submitClose = async () => {
    setError(null);
    const cash = parseFloat(actualCash);
    if (isNaN(cash) || cash < 0) { setError("Enter the counted cash amount."); return; }
    setIsSaving(true);
    try {
      const res = await closeShift(openShiftData.id, { actualCash: cash });
      if (res && typeof res === 'object' && 'error' in res && res.error) { setError(res.error); return; }
      setResult({ expectedCash: res.expectedCash as number, discrepancy: res.discrepancy as number });
      setActualCash("");
      onChanged();
      loadHistory();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-black text-ink">Cash & Shifts</h2>

      {openShiftData ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">{openShiftData.registerName}</h3>
              <p className="text-sm text-slate-500">Opening float: {symbol}{openShiftData.openingFloat.toFixed(2)}</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">OPEN</span>
          </div>

          {result ? (
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Expected Cash</span><span className="font-semibold">{symbol}{result.expectedCash.toFixed(2)}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">Discrepancy</span>
                <span className={`font-semibold ${result.discrepancy === 0 ? "text-slate-700" : result.discrepancy > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {result.discrepancy > 0 ? "+" : ""}{symbol}{result.discrepancy.toFixed(2)}
                </span>
              </div>
              <p className="text-emerald-600 font-medium pt-1 flex items-center gap-1"><CheckCircle2 size={14} /> Shift closed.</p>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Counted Cash in Drawer ({symbol})</label>
                <input type="number" step="0.01" value={actualCash} onChange={(e) => setActualCash(e.target.value)} className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg" />
              </div>
              <button onClick={submitClose} disabled={isSaving} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg font-semibold">
                {isSaving ? "Closing..." : "Close Shift"}
              </button>
            </div>
          )}
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400">No register is currently open.</div>
      )}

      <div>
        <h3 className="font-bold text-slate-800 mb-3">Shift History</h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Opening Float</th>
                <th className="px-4 py-3 text-right">Discrepancy</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No shifts recorded yet.</td></tr>
              ) : (
                history.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">{new Date(s.openedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{symbol}{s.openingFloat.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{s.discrepancy != null ? `${symbol}${s.discrepancy.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSalesShiftFilter(s.id);
                          setActiveMenu("Sales & Returns");
                        }}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-800 transition-colors"
                      >
                        View Orders
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}
