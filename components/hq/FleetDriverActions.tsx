'use client';

import React, { useState } from 'react';
import { MoreVertical, ShieldAlert, CheckCircle2, Moon, AlertOctagon } from 'lucide-react';
import { setDriverStatus } from '@/lib/actions/hq-fleet';
import { toast } from 'sonner';

interface FleetDriverActionsProps {
  driverId: string;
  driverType: 'GIG' | 'PROVIDER';
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'SUSPENDED';
}

export default function FleetDriverActions({
  driverId,
  driverType,
  status,
}: FleetDriverActionsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Gig drivers are self-dispatched via the CityDrive resident app
  if (driverType === 'GIG') {
    return null;
  }

  const handleUpdate = async (newStatus: 'ONLINE' | 'OFFLINE' | 'SUSPENDED') => {
    setLoading(true);
    const res = await setDriverStatus(driverId, newStatus);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Driver status changed to ${newStatus}`);
    }
    setLoading(false);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        title="Driver Management"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 rounded-xl shadow-2xl bg-slate-850 ring-1 ring-slate-700 z-30 overflow-hidden border border-slate-700 bg-slate-900">
            <div className="p-1 space-y-0.5 text-xs">
              {status !== 'ONLINE' && (
                <button
                  onClick={() => handleUpdate('ONLINE')}
                  disabled={loading}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors font-semibold disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Set Online
                </button>
              )}
              {status !== 'OFFLINE' && (
                <button
                  onClick={() => handleUpdate('OFFLINE')}
                  disabled={loading}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors font-semibold disabled:opacity-50"
                >
                  <Moon className="w-3.5 h-3.5 text-slate-400" />
                  Set Offline
                </button>
              )}
              {status !== 'SUSPENDED' && (
                <button
                  onClick={() => handleUpdate('SUSPENDED')}
                  disabled={loading}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-red-400 hover:bg-slate-800 rounded-lg transition-colors font-semibold disabled:opacity-50"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Suspend Driver
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
