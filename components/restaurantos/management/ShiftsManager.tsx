'use client';

import React, { useState } from 'react';
import { Button, Input, Badge } from '@/components/ui';
import { Clock, Plus, Ban, CheckCircle, Calculator, Info, FileText } from 'lucide-react';
import { openShift, closeShift } from '@/lib/actions/restaurantos';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@/lib/utils';

export function ShiftsManager({
  organizationId,
  locationId,
  initialShifts
}: {
  organizationId: string;
  locationId?: string;
  initialShifts: any[];
}) {
  const router = useRouter();
  const [shifts, setShifts] = useState(initialShifts);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosingId, setIsClosingId] = useState<string | null>(null);
  
  const [openingFloat, setOpeningFloat] = useState<number>(0);
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(false);

  const activeShift = shifts.find(s => s.status === 'OPEN');

  const handleOpenShift = async () => {
    setLoading(true);
    const res: any = await openShift({
      organizationId,
      locationId,
      openingFloat
    });
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else if (res.shift) {
      toast.success('Shift opened successfully');
      setShifts([res.shift, ...shifts]);
      setIsOpening(false);
      setOpeningFloat(0);
      router.refresh();
    }
  };

  const handleCloseShift = async () => {
    if (!isClosingId) return;
    setLoading(true);
    const res: any = await closeShift({
      shiftId: isClosingId,
      actualCash,
      notes
    });
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else if (res.shift) {
      toast.success('Shift closed successfully');
      setShifts(shifts.map((s: any) => s.id === isClosingId ? res.shift : s));
      setIsClosingId(null);
      setActualCash(0);
      setNotes('');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Register</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {activeShift ? 'The register is currently open.' : 'The register is closed.'}
          </p>
        </div>
        {!activeShift && !isOpening && (
          <Button onClick={() => setIsOpening(true)} leftIcon={<Clock size={16} />}>
            Open Shift
          </Button>
        )}
        {activeShift && isClosingId !== activeShift.id && (
          <Button variant="danger" onClick={() => setIsClosingId(activeShift.id)}>
            Close Shift
          </Button>
        )}
      </div>

      {isOpening && !activeShift && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl max-w-lg">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock size={16} className="text-indigo-600" /> Start New Shift
          </h3>
          <div className="space-y-4">
            <Input 
              label="Opening Float (Starting Cash)" 
              type="number" 
              min={0} 
              value={openingFloat} 
              onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
              leftIcon={<span className="text-slate-400 font-black">₦</span>}
            />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={() => setIsOpening(false)}>Cancel</Button>
              <Button onClick={handleOpenShift} isLoading={loading}>Open Register</Button>
            </div>
          </div>
        </div>
      )}

      {isClosingId && (
        <div className="p-6 bg-rose-50/50 border border-rose-200 rounded-2xl max-w-lg">
          <h3 className="text-sm font-black text-rose-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calculator size={16} className="text-rose-600" /> End of Shift Cash Count
          </h3>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-rose-100 flex justify-between items-center text-sm font-bold text-slate-700">
              <span>Expected Cash in Drawer:</span>
              <span>{formatNaira(activeShift?.expectedCash || 0)}</span>
            </div>
            
            <Input 
              label="Actual Counted Cash" 
              type="number" 
              min={0} 
              value={actualCash} 
              onChange={(e) => setActualCash(parseFloat(e.target.value) || 0)}
              leftIcon={<span className="text-slate-400 font-black">₦</span>}
            />
            <Input 
              label="Closing Notes (Optional)" 
              placeholder="e.g. Drawer was short by 500, paid delivery guy." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
            />
            
            {actualCash > 0 && activeShift?.expectedCash !== undefined && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                actualCash === activeShift.expectedCash ? 'bg-emerald-100 text-emerald-800' : 
                actualCash > activeShift.expectedCash ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                Variance: {formatNaira(actualCash - activeShift.expectedCash)}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={() => setIsClosingId(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleCloseShift} isLoading={loading}>Confirm Close Shift</Button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 mt-8">Past Shifts</h3>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Shift ID</th>
                <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Duration</th>
                <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Float</th>
                <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Expected</th>
                <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.filter((s: any) => s.status !== 'OPEN').length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500 font-medium">
                    No closed shifts recorded yet.
                  </td>
                </tr>
              ) : (
                shifts.filter((s: any) => s.status !== 'OPEN').map(shift => {
                  const variance = (shift.actualCash || 0) - (shift.expectedCash || 0);
                  return (
                    <tr key={shift.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{shift.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-700">
                          {new Date(String(shift.openedAt)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {new Date(String(shift.openedAt)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - 
                          {shift.closedAt ? new Date(String(shift.closedAt)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Ongoing'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="default">{shift.status}</Badge>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-600">
                        {formatNaira(shift.openingFloat)}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-600">
                        {formatNaira(shift.expectedCash || 0)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-bold text-slate-900">{formatNaira(shift.actualCash || 0)}</div>
                        {variance !== 0 && (
                          <div className={`text-[11px] font-bold mt-0.5 ${variance > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {variance > 0 ? '+' : ''}{formatNaira(variance)}
                          </div>
                        )}
                        {shift.notes && (
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1" title={shift.notes}>
                            <FileText size={12} /> Note attached
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
