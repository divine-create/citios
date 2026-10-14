'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Phone,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  PhoneCall,
} from 'lucide-react';
import { reviewOrganizationClaim } from '@/lib/actions/claim';

interface ClaimItem {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationType: string;
  listedAddress: string;
  status: string;
  claimantPersonId: string;
  claimantAccountName: string;
  submittedInfo: {
    name: string;
    phone: string;
    address: string;
    role: string;
  };
  claimantNotes?: string | null;
  listedContactPoints: Array<{ type: string; value: string; isPrimary: boolean }>;
  createdAt: string;
}

export default function ClaimsManager({ initialClaims }: { initialClaims: ClaimItem[] }) {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimItem[]>(initialClaims);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleReview = async (claimId: string, decision: 'APPROVE' | 'REJECT') => {
    setLoadingId(claimId);
    setMessage(null);

    const notes = decision === 'REJECT' ? rejectionNotes[claimId] || 'Information could not be verified' : 'Verified phone and address';

    try {
      const res = await reviewOrganizationClaim(claimId, decision, notes);
      if (res.error) {
        setMessage({ text: res.error, type: 'error' });
      } else {
        setMessage({
          text: `Claim ${decision === 'APPROVE' ? 'approved' : 'rejected'} successfully.`,
          type: 'success',
        });
        setClaims((prev) => prev.filter((c) => c.id !== claimId));
        setActiveRejectId(null);
        router.refresh();
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Operation failed', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  if (claims.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">All Business Claims Clear</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          There are currently no pending ownership claims awaiting administrative verification.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {claims.map((claim) => (
          <div
            key={claim.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 hover:border-slate-700 transition-colors"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {claim.organizationName}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-400 uppercase tracking-wider">
                      {claim.organizationType}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    Directory Address: {claim.listedAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Submitted: {new Date(claim.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Comparison Grid: Claimant Submission vs Directory Records */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Claimant Information */}
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-400" />
                    Claimant Information (To Verify)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-300">
                    {claim.submittedInfo.role}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Full Name</span>
                    <span className="font-semibold text-white">{claim.submittedInfo.name}</span>
                    <span className="text-slate-500 text-[11px] ml-1.5">({claim.claimantAccountName})</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] block">Contact Phone</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-white font-mono">{claim.submittedInfo.phone}</span>
                      {claim.submittedInfo.phone !== 'Not provided' && (
                        <a
                          href={`tel:${claim.submittedInfo.phone}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 text-[10px] font-bold transition-colors"
                        >
                          <PhoneCall className="w-3 h-3" /> Call to Verify
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] block">Claimed Business Address</span>
                    <span className="text-slate-300">{claim.submittedInfo.address}</span>
                  </div>

                  {claim.claimantNotes && (
                    <div className="pt-1">
                      <span className="text-slate-500 text-[11px] block">Claimant Notes</span>
                      <p className="text-slate-400 italic bg-slate-900/50 p-2 rounded-lg border border-slate-800 text-[11px]">
                        "{claim.claimantNotes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Known Directory Public Info */}
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  Known Public Directory Contacts
                </h4>

                <div className="space-y-2 text-xs">
                  {claim.listedContactPoints.length > 0 ? (
                    claim.listedContactPoints.map((cp, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-0">
                        <span className="text-slate-400 uppercase text-[10px] font-bold">{cp.type}</span>
                        <span className="font-mono text-slate-200">{cp.value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic py-2">
                      No public contact points were discovered in initial map data.
                    </p>
                  )}

                  <div className="pt-2">
                    <a
                      href={`/org/${claim.organizationId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:underline font-bold"
                    >
                      Inspect Public Listing Page <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">
                Approving this claim grants <strong>{claim.submittedInfo.name}</strong> full OWNER management and provisions the organization wallet.
              </p>

              <div className="flex items-center gap-2">
                {activeRejectId === claim.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Reason for rejection..."
                      value={rejectionNotes[claim.id] || ''}
                      onChange={(e) => setRejectionNotes({ ...rejectionNotes, [claim.id]: e.target.value })}
                      className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                      disabled={loadingId === claim.id}
                      onClick={() => handleReview(claim.id, 'REJECT')}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => setActiveRejectId(null)}
                      className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      disabled={loadingId === claim.id}
                      onClick={() => setActiveRejectId(claim.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      Reject
                    </button>
                    <button
                      disabled={loadingId === claim.id}
                      onClick={() => handleReview(claim.id, 'APPROVE')}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {loadingId === claim.id ? 'Approving...' : 'Approve Claim'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
