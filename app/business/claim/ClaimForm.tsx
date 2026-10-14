'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck, CheckCircle2, AlertCircle, Phone, MapPin, User, ArrowRight } from 'lucide-react';
import { submitOrganizationClaim } from '@/lib/actions/claim';

interface ClaimFormProps {
  organizationId: string;
  organizationName: string;
  organizationType: string;
  address?: string;
  initialName?: string;
}

export default function ClaimForm({
  organizationId,
  organizationName,
  organizationType,
  address = '',
  initialName = '',
}: ClaimFormProps) {
  const router = useRouter();
  const [claimantName, setClaimantName] = useState(initialName);
  const [claimantPhone, setClaimantPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState(address);
  const [businessRole, setBusinessRole] = useState('Owner / Founder');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await submitOrganizationClaim({
        organizationId,
        claimantName,
        claimantPhone,
        businessAddress,
        businessRole,
        notes: notes || undefined,
      });

      if (res.error) {
        setResult({ error: res.error });
      } else {
        setResult({
          success: true,
          message: res.message || 'Your claim request has been submitted. A CityOS administrator will verify your information.',
        });
      }
    } catch (err: any) {
      setResult({ error: err.message || 'Failed to submit claim. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (result?.success) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center space-y-4 shadow-sm animate-in fade-in duration-300">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-ink">Claim Request Submitted</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          {result.message}
        </p>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 max-w-sm mx-auto text-left text-xs text-slate-600 space-y-1.5">
          <p className="font-bold text-slate-800">What happens next?</p>
          <p>1. A CityOS administrator will review the phone and address information you submitted.</p>
          <p>2. The admin may reach out via phone at <strong className="text-teal-900">{claimantPhone}</strong> to confirm identity.</p>
          <p>3. Once verified, you will be granted OWNER access to manage {organizationName}.</p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => router.push(`/org/${organizationId}`)}
            className="px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-black transition-colors"
          >
            Return to Business Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 space-y-6 shadow-sm">
      {result?.error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{result.error}</span>
        </div>
      )}

      {/* Target Business Banner */}
      <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-teal-950">{organizationName}</h3>
          <p className="text-xs text-teal-700 font-medium">{organizationType} {address ? `· ${address}` : ''}</p>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-600 text-xs leading-relaxed space-y-1">
        <p className="font-bold text-slate-800 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-700" />
          No document uploads required
        </p>
        <p>
          Simply provide your contact details, phone number, and physical business address. A CityOS administrator will verify the information before activating your owner dashboard.
        </p>
      </div>

      {/* Form Fields: Name & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-teal-700" /> Your Full Name *
          </label>
          <input
            type="text"
            required
            value={claimantName}
            onChange={(e) => setClaimantName(e.target.value)}
            placeholder="e.g. Tunde Adeleke"
            className="w-full px-4 py-3 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-teal-700" /> Contact Phone Number *
          </label>
          <input
            type="tel"
            required
            value={claimantPhone}
            onChange={(e) => setClaimantPhone(e.target.value)}
            placeholder="e.g. 08031234567"
            className="w-full px-4 py-3 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          />
          <p className="text-[11px] text-slate-400 mt-1">Our admin team may call this line to verify the claim.</p>
        </div>
      </div>

      {/* Physical Address */}
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-teal-700" /> Physical Business Address *
        </label>
        <input
          type="text"
          required
          value={businessAddress}
          onChange={(e) => setBusinessAddress(e.target.value)}
          placeholder="e.g. 12 Ikija Road, Abeokuta"
          className="w-full px-4 py-3 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
        />
        <p className="text-[11px] text-slate-400 mt-1">Confirm the current physical street address or shop unit of the business.</p>
      </div>

      {/* Role */}
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
          Your Role in this Business *
        </label>
        <select
          value={businessRole}
          onChange={(e) => setBusinessRole(e.target.value)}
          className="w-full px-4 py-3 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
        >
          <option value="Owner / Founder">Owner / Founder</option>
          <option value="Managing Director / CEO">Managing Director / CEO</option>
          <option value="General Manager / Store Manager">General Manager / Store Manager</option>
          <option value="Partner / Co-owner">Partner / Co-owner</option>
          <option value="Authorized Representative">Authorized Representative</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
          Verification Notes (Optional)
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Near the main market junction, operating daily 9am - 6pm. Call in the afternoon."
          className="w-full px-4 py-3 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 resize-none"
        />
      </div>

      {/* Terms & Submit */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
        <p className="text-[11px] text-slate-400 font-medium max-w-sm">
          By submitting, you confirm you are legally authorized to manage this business on CityOS.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-800 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black transition-all shadow-sm shrink-0"
        >
          {loading ? 'Submitting Claim...' : 'Submit Claim Request'}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
