'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart,
  ArrowLeft,
  Loader2,
  CalendarClock,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { FallbackImg, PriceTag } from '@/components/cityos/CityUI';
import { useCart } from '@/components/cityos/CartStore';
import { getCityServiceItem, bookResidentService } from '@/app/actions/service';

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00'
];

export default function ServiceDetail({ id }: { id: string }) {
  const { fmt } = useMoney();
  const router = useRouter();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default to tomorrow
    return d.toISOString().split('T')[0];
  });
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingAddress, setBookingAddress] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccessJobId, setBookingSuccessJobId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const prod = await getCityServiceItem(id);
      setS(prod);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20 animate-in fade-in duration-500">
        <Loader2 className="w-8 h-8 animate-spin text-teal-800 opacity-20" />
      </div>
    );
  }

  if (!s) {
    return (
      <div className="max-w-md mx-auto text-center py-20 animate-in fade-in zoom-in-95 duration-500">
        <h1 className="text-xl font-black text-ink mb-2">Service not found</h1>
        <p className="text-sm text-slate-500 mb-6">This service may have been removed or is no longer active.</p>
        <button onClick={() => router.back()} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors">
          Go back
        </button>
      </div>
    );
  }

  const handleAdd = () => {
    add({
      productId: s.id,
      qty: 1,
      name: s.name,
      price: s.price,
      image: s.imageAssetId,
      orgId: s.organizationId,
      orgName: s.organization?.name || 'Unknown',
      kind: 'service' as any
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSubmitting(true);
    setBookingError(null);

    try {
      const res = await bookResidentService({
        serviceId: s.id,
        date: bookingDate,
        timeSlot: bookingTime,
        address: bookingAddress,
        notes: bookingNotes,
      });

      if (res.requiresAuth) {
        const callback = encodeURIComponent(window.location.pathname);
        router.push(`/login?callbackUrl=${callback}`);
        return;
      }

      if (!res.success) {
        setBookingError(res.error || 'Failed to submit booking request.');
        return;
      }

      setBookingSuccessJobId(res.jobId || 'created');
    } catch (err: any) {
      setBookingError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="mb-4">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-800 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
      
      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
        {s.imageAssetId ? (
          <div className="aspect-video bg-slate-50 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/assets/${s.imageAssetId}`} alt={s.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-300">
            <FallbackImg alt="No Image" className="w-12 h-12 opacity-20 mb-3" />
            <p className="text-xs font-medium opacity-40 uppercase tracking-widest">No Image</p>
          </div>
        )}
        
        <div className="p-6 sm:p-8">
          <Link href={`/org/${s.organization?.slug || s.organizationId}`} className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            <span className="text-[11px] font-black tracking-wide uppercase text-teal-800 bg-teal-50 px-2 py-1 rounded-md">{s.organization?.name}</span>
          </Link>
          <h1 className="text-2xl font-black text-ink mt-3 leading-tight">{s.name}</h1>
          <div className="flex items-center gap-3 mt-4">
            <PriceTag amount={s.price} />
            {s.durationMinutes && (
              <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> {s.durationMinutes} min
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 font-medium leading-relaxed mt-6">
            {s.description || 'No description provided for this service.'}
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Verified City Pro</p>
                <p className="text-[11px] text-slate-500">Service backed by licensed provider</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <Clock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Prompt Scheduling</p>
                <p className="text-[11px] text-slate-500">Direct booking with guaranteed time slots</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 sm:p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-800 text-white text-sm font-black hover:bg-teal-900 transition-colors shadow-sm shadow-teal-900/10 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            Book Appointment
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-black hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-slate-500" />
            {added ? 'Added to bag!' : 'Add to cart'}
          </button>
        </div>
      </div>

      {/* Direct Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 sm:p-8 relative">
            <button
              onClick={() => {
                setShowBookingModal(false);
                setBookingSuccessJobId(null);
                setBookingError(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {bookingSuccessJobId ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  Appointment Requested!
                </h3>
                <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto leading-relaxed">
                  Your appointment for <span className="font-bold text-slate-900">{s.name}</span> has been dispatched to{' '}
                  <span className="font-bold text-slate-900">{s.organization?.name}</span>. The provider will confirm your booking shortly.
                </p>
                <div className="p-4 bg-slate-50 rounded-xl text-left text-xs space-y-2 mb-6 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date & Time:</span>
                    <span className="font-bold text-slate-800">{bookingDate} at {bookingTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Provider:</span>
                    <span className="font-bold text-slate-800">{s.organization?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fee:</span>
                    <span className="font-bold text-teal-800">{fmt(s.price)}</span>
                  </div>
                  {bookingAddress && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Address:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[200px]">{bookingAddress}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/tasks"
                    className="flex-1 py-3 px-4 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-sm text-center transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    View in Tasks <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => {
                      setShowBookingModal(false);
                      setBookingSuccessJobId(null);
                    }}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm text-center transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookSubmit}>
                <div className="mb-6">
                  <span className="text-[11px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                    Direct Booking
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-2">
                    Book {s.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Provided by <span className="font-semibold text-slate-700">{s.organization?.name}</span> • {fmt(s.price)}
                  </p>
                </div>

                {bookingError && (
                  <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Date Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Select Date
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-700 bg-white"
                    />
                  </div>

                  {/* Time Slot Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Select Time Slot
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setBookingTime(slot)}
                          className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                            bookingTime === slot
                              ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Location Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Service Address
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="e.g. 14 Marian Road, Calabar"
                        value={bookingAddress}
                        onChange={(e) => setBookingAddress(e.target.value)}
                        required
                        className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                  </div>

                  {/* Notes / Issue Details */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Special Instructions / Problem Description <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Describe what needs to be fixed or any special instructions for the technician..."
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-700 resize-none"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Total Service Fee</span>
                    <span className="text-lg font-black text-slate-900">{fmt(s.price)}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="py-3 px-6 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm shadow-teal-900/10 cursor-pointer"
                  >
                    {bookingSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>Confirm Booking</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
