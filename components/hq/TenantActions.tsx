'use client';
import React, { useState } from 'react';
import { MoreVertical, ShieldAlert, CheckCircle, Eye } from 'lucide-react';
import { suspendOrganization, reactivateOrganization } from '@/lib/actions/hq';
import { toast } from 'sonner';

export default function TenantActions({ orgId, status }: { orgId: string, status: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSuspend = async () => {
    if (!confirm('Are you sure you want to suspend this organization? It will instantly block their access.')) return;
    setLoading(true);
    const res = await suspendOrganization(orgId);
    if (res.error) toast.error(res.error);
    else toast.success('Organization suspended');
    setLoading(false);
    setOpen(false);
  };

  const handleReactivate = async () => {
    setLoading(true);
    const res = await reactivateOrganization(orgId);
    if (res.error) toast.error(res.error);
    else toast.success('Organization reactivated');
    setLoading(false);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button 
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 z-20 overflow-hidden border border-slate-700">
            <div className="py-1">
              {status === 'ACTIVE' ? (
                <button
                  onClick={handleSuspend}
                  disabled={loading}
                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700/50 transition-colors font-bold disabled:opacity-50"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Suspend
                </button>
              ) : (
                <button
                  onClick={handleReactivate}
                  disabled={loading}
                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-emerald-400 hover:bg-slate-700/50 transition-colors font-bold disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Reactivate
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
