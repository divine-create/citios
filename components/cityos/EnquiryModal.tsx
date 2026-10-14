'use client';

import { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, X, Send } from 'lucide-react';
import { submitCustomerEnquiry } from '@/lib/actions/enquiry';

interface EnquiryModalProps {
  organizationId: string;
  organizationName: string;
  locationId?: string;
  defaultService?: string;
  userEmail?: string;
  userName?: string;
}

export default function EnquiryModal({
  organizationId,
  organizationName,
  locationId,
  defaultService,
  userEmail = '',
  userName = '',
}: EnquiryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customerName, setCustomerName] = useState(userName);
  const [customerEmail, setCustomerEmail] = useState(userEmail);
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceRequested, setServiceRequested] = useState(defaultService || '');
  const [message, setMessage] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      setResult({ error: 'Please grant consent to share your details with this business.' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await submitCustomerEnquiry({
        organizationId,
        locationId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        serviceRequested: serviceRequested || undefined,
        message,
        consentGiven: true,
      });

      if (res.error) {
        setResult({ error: res.error });
      } else {
        setResult({
          success: true,
          message: res.message || 'Your enquiry has been successfully delivered to the business.',
        });
      }
    } catch (err: any) {
      setResult({ error: err.message || 'Failed to submit enquiry. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMessage('');
    setConsentGiven(false);
    setResult(null);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-all shadow-sm"
      >
        <Mail className="w-3.5 h-3.5" />
        Send Enquiry
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-teal-800 text-white">
              <div>
                <h3 className="text-base font-black">Contact {organizationName}</h3>
                <p className="text-[11px] text-teal-100 font-medium">
                  Direct lead routing powered by CityOS
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-teal-200 hover:text-white hover:bg-teal-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {result?.success ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-ink">Enquiry Dispatched!</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-sm mx-auto">
                      {result.message}
                    </p>
                  </div>
                  <button
                    onClick={resetForm}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {result?.error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{result.error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Amina Bello"
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Your Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 08012345678"
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Requested Offering / Service
                      </label>
                      <input
                        type="text"
                        value={serviceRequested}
                        onChange={(e) => setServiceRequested(e.target.value)}
                        placeholder="e.g. Catering, Consultation, Booking"
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Message / Enquiry Details *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Tell ${organizationName} what you need or ask for pricing and availability...`}
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 resize-none"
                    />
                  </div>

                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="consent"
                      required
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor="consent" className="text-[11px] text-slate-500 font-medium leading-tight">
                      I agree to share my contact information with {organizationName} so they can reply to this request.
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black transition-all shadow-sm"
                    >
                      {loading ? 'Sending...' : 'Send Enquiry'}
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
