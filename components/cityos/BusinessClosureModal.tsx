'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  Trash2,
  Archive,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Ban,
  Wallet,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import {
  getBusinessClosureEligibility,
  closeOrDeleteOrganization,
  reopenOrganization,
} from '@/lib/actions/business-lifecycle';
import { toast } from 'sonner';

interface BusinessClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: {
    id: string;
    name: string;
    type: string;
    status?: string;
    role: string;
  };
  onSuccess?: (action: 'PURGED' | 'CLOSED' | 'REOPENED') => void;
}

export default function BusinessClosureModal({
  isOpen,
  onClose,
  business,
  onSuccess,
}: BusinessClosureModalProps) {
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [eligibility, setEligibility] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => {
    if (!isOpen || !business?.id) return;

    let mounted = true;
    setLoadingEligibility(true);
    setActionError(null);
    setConfirmName('');

    getBusinessClosureEligibility(business.id)
      .then((res: any) => {
        if (!mounted) return;
        if (res.error) {
          setActionError(res.error);
        } else {
          setEligibility(res);
        }
        setLoadingEligibility(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setActionError(err?.message || 'Failed to inspect business closure eligibility.');
        setLoadingEligibility(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, business?.id]);

  if (!isOpen) return null;

  const isOwner = business.role === 'OWNER';
  const isClosed = business.status === 'CLOSED' || eligibility?.status === 'CLOSED';
  const isPurgeTier = eligibility?.tier === 'PURGE';
  const isArchiveTier = eligibility?.tier === 'ARCHIVE';

  const handleAction = async () => {
    if (isPurgeTier && confirmName.trim().toLowerCase() !== business.name.trim().toLowerCase()) {
      setActionError(`Please type "${business.name}" to confirm permanent deletion.`);
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      if (isClosed) {
        const res = await reopenOrganization(business.id);
        if ('error' in res && res.error) {
          setActionError(res.error);
          setIsSubmitting(false);
          return;
        }
        const successMessage = ('message' in res && res.message) ? res.message : 'Business has been reopened.';
        toast.success(successMessage);
        onSuccess?.('REOPENED');
        onClose();
      } else {
        const res = await closeOrDeleteOrganization(business.id);
        if ('error' in res && res.error) {
          setActionError(res.error);
          setIsSubmitting(false);
          return;
        }
        const successMessage = ('message' in res && res.message) ? res.message : 'Business status updated successfully.';
        toast.success(successMessage);
        if ('action' in res && res.action) {
          onSuccess?.(res.action as any);
        }
        onClose();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isClosed
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isPurgeTier
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {isClosed ? (
                <RotateCcw className="w-4 h-4" />
              ) : isPurgeTier ? (
                <Trash2 className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-black text-sm text-white">
                {isClosed
                  ? 'Reopen Business'
                  : isPurgeTier
                  ? 'Delete Test Business'
                  : 'Close & Archive Business'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">{business.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {actionError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          {!isOwner && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium flex items-center gap-2">
              <Ban className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Only the business <strong>OWNER</strong> can close or delete this organization. You currently hold the{' '}
                <strong>{business.role}</strong> role.
              </span>
            </div>
          )}

          {loadingEligibility ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">
                Auditing financial ledger, active orders & bookings...
              </p>
            </div>
          ) : isClosed ? (
            /* Reopen Case */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-black">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Business is Currently Closed / Archived</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Reopening will restore your public directory listing on Explore, re-enable food & storefront orders,
                  and make the workspace active for staff.
                </p>
              </div>
            </div>
          ) : isPurgeTier ? (
            /* Tier 1: Fast Purge (0 Activity) */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-1.5">
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-wider">
                  Tier 1: Zero-Activity Instant Purge
                </span>
                <p className="text-xs text-red-200/90 font-medium leading-relaxed">
                  This business has processed <strong>zero orders, bookings, or wallet transactions</strong>.
                  Deleting it will permanently erase all configuration data and immediately release its web address.
                </p>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60 space-y-2 text-xs text-slate-300">
                <p className="font-bold text-slate-200">The following will be permanently removed:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Organization profile & branch locations</li>
                  <li>Default empty wallet & ledger linkage</li>
                  <li>Discovery listing & branded microsite slug</li>
                  <li>Staff roles & category catalogs</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Type <span className="text-white underline">{business.name}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={business.name}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          ) : (
            /* Tier 2: Safe Archival (Operating Business) */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  Tier 2: Safe Closure & Archival
                </span>
                <p className="text-xs text-amber-200/90 font-medium leading-relaxed">
                  This business has recorded <strong>{eligibility?.metrics?.totalOrdersCount ?? 0} order(s)</strong> and
                  financial ledger activity. To protect resident receipts, tax accounting, and historical warranties,
                  closing will safely archive this organization.
                </p>
              </div>

              {/* Pre-conditions Checklist */}
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 space-y-2.5">
                <p className="text-xs font-black text-slate-200 uppercase tracking-wider">Pre-Closure Clearance</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-slate-500" /> Wallet Balance:
                    </span>
                    <span
                      className={`font-black ${
                        Math.abs(eligibility?.metrics?.walletBalance || 0) < 0.01
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      ₦{(eligibility?.metrics?.walletBalance || 0).toLocaleString()} (Must be ₦0)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-500" /> Active Orders:
                    </span>
                    <span
                      className={`font-black ${
                        (eligibility?.metrics?.activeOrdersCount || 0) === 0
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {eligibility?.metrics?.activeOrdersCount || 0} active
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> Pending Refunds:
                    </span>
                    <span
                      className={`font-black ${
                        (eligibility?.metrics?.pendingRefundsCount || 0) === 0
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {eligibility?.metrics?.pendingRefundsCount || 0} pending
                    </span>
                  </div>
                </div>

                {!eligibility?.eligible && eligibility?.reasons?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-amber-300 space-y-1">
                    <p className="font-bold">Action required before closing:</p>
                    <ul className="list-disc list-inside text-amber-200/80 space-y-0.5">
                      {eligibility.reasons.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/40 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">What happens after closing:</p>
                <p>• The business is immediately delisted from Explore, City Market, and food feeds.</p>
                <p>• New orders and bookings are rejected.</p>
                <p>• You retain read-only access to past reports, receipts, and invoices.</p>
                <p>• You can reopen this business at any time.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {isClosed ? (
            <button
              type="button"
              onClick={handleAction}
              disabled={isSubmitting || !isOwner}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Reopen Business
            </button>
          ) : isPurgeTier ? (
            <button
              type="button"
              onClick={handleAction}
              disabled={
                isSubmitting ||
                !isOwner ||
                confirmName.trim().toLowerCase() !== business.name.trim().toLowerCase()
              }
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Permanently Delete Business
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAction}
              disabled={isSubmitting || !isOwner || !eligibility?.eligible}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Close & Archive Business
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
