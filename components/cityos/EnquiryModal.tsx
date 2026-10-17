'use client';

import { useState } from 'react';
import { MessageSquare, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { resolveOrgWhatsAppPhone } from '@/app/actions/checkout';
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
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceRequested, setServiceRequested] = useState(defaultService || '');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const cleanPhone = await resolveOrgWhatsAppPhone(organizationId, locationId);

      // Best-effort log of enquiry
      if (userEmail) {
        submitCustomerEnquiry({
          organizationId,
          locationId,
          customerName: customerName || 'Customer',
          customerEmail: userEmail,
          customerPhone: customerPhone || undefined,
          serviceRequested: serviceRequested || undefined,
          message,
          consentGiven: true,
        }).catch(() => {});
      }

      const waLines = [
        `👋 Hello *${organizationName}*!`,
        `--------------------------------`,
        customerName ? `👤 *Name:* ${customerName}` : null,
        customerPhone ? `📞 *Phone:* ${customerPhone}` : null,
        serviceRequested ? `🛍️ *Item / Service:* ${serviceRequested}` : null,
        `💬 *Enquiry:* ${message}`,
        `--------------------------------`,
        `_Sent via CityOS_`,
      ].filter(Boolean);

      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waLines.join('\n'))}`;
      window.open(waUrl, '_blank');

      setResult({
        success: true,
        message: `Your WhatsApp chat with ${organizationName} has been opened.`,
      });
    } catch (err: any) {
      setResult({ error: err.message || 'Failed to open WhatsApp chat. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMessage('');
    setResult(null);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black transition-all shadow-sm"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Chat on WhatsApp
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#075E54] text-white">
              <div>
                <h3 className="text-base font-black">WhatsApp {organizationName}</h3>
                <p className="text-[11px] text-emerald-100 font-medium">
                  Direct WhatsApp inquiry & booking
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
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
                    <h4 className="text-base font-black text-ink">WhatsApp Opened!</h4>
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
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Your WhatsApp / Phone
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 0803 123 4567"
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Product / Service / Booking Subject
                    </label>
                    <input
                      type="text"
                      value={serviceRequested}
                      onChange={(e) => setServiceRequested(e.target.value)}
                      placeholder="e.g. Product availability, Custom order, Booking"
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Write your message to ${organizationName}...`}
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 resize-none"
                    />
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
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] disabled:opacity-50 text-white text-xs font-black transition-all shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {loading ? 'Opening WhatsApp...' : 'Continue on WhatsApp'}
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
