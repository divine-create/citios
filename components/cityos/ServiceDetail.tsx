'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
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
  Star,
  Heart,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { FallbackImg, PriceTag } from '@/components/cityos/CityUI';
import {
  getCityServiceItem,
  bookResidentService,
  getOrganizationReviews,
  submitOrganizationReview,
  toggleOrganizationLike,
} from '@/app/actions/service';
import { buildWhatsAppServiceUrl, buildWhatsAppInquiryUrl } from '@/lib/whatsapp';

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00'
];

interface ReviewItem {
  id: string;
  rating: number;
  body: string | null;
  authorName: string;
  createdAt: string;
}

export default function ServiceDetail({ id }: { id: string }) {
  const { fmt } = useMoney();
  const router = useRouter();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Like state
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // Booking Modal State (WhatsApp Direct)
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingAddress, setBookingAddress] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccessWaUrl, setBookingSuccessWaUrl] = useState<string | null>(null);

  // Reviews Modal State
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([]);
  const [reviewsAvgRating, setReviewsAvgRating] = useState<number | null>(null);
  const [reviewsTotal, setReviewsTotal] = useState(0);

  // Review Form inside modal
  const [myRating, setMyRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const prod = await getCityServiceItem(id);
      setS(prod);
      if (prod) {
        setLiked(Boolean(prod.userHasLiked));
        setLikesCount(prod.likesCount || 0);
        if (prod.address) setBookingAddress(prod.address);
      }
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

  const handleToggleLike = async () => {
    const nextLiked = !liked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLiked(nextLiked);
    setLikesCount(nextCount);

    try {
      const res = await toggleOrganizationLike(s.organizationId);
      if (!res.success) {
        if (res.requiresAuth) {
          router.push(`/login?callbackUrl=/service/${id}`);
          return;
        }
        setLiked(liked);
        setLikesCount(likesCount);
      } else {
        setLiked(Boolean(res.liked));
        if (typeof res.likesCount === 'number') {
          setLikesCount(res.likesCount);
        }
      }
    } catch {
      setLiked(liked);
      setLikesCount(likesCount);
    }
  };

  const handleOpenReviews = async () => {
    setShowReviewsModal(true);
    setReviewsLoading(true);
    setReviewFormError(null);
    setReviewSuccessMsg(null);
    setMyComment('');
    setMyRating(5);

    try {
      const res = await getOrganizationReviews(s.organizationId);
      if (res.success) {
        setReviewsList(res.reviews || []);
        setReviewsAvgRating(res.averageRating);
        setReviewsTotal(res.totalReviews);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitting(true);
    setReviewFormError(null);
    setReviewSuccessMsg(null);

    try {
      const res = await submitOrganizationReview({
        organizationId: s.organizationId,
        rating: myRating,
        body: myComment.trim() || undefined,
      });

      if (!res.success) {
        if (res.requiresAuth) {
          router.push(`/login?callbackUrl=/service/${id}`);
          return;
        }
        setReviewFormError(res.error || 'Failed to submit review.');
        return;
      }

      setReviewSuccessMsg('Your review has been submitted successfully!');
      setMyComment('');

      const updated = await getOrganizationReviews(s.organizationId);
      if (updated.success) {
        setReviewsList(updated.reviews || []);
        setReviewsAvgRating(updated.averageRating);
        setReviewsTotal(updated.totalReviews);
      }
    } catch (err: any) {
      setReviewFormError(err.message || 'Error submitting review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSubmitting(true);
    setBookingError(null);

    const targetPhone = s.whatsapp || s.phone || '2348112417171';
    const waUrl = buildWhatsAppServiceUrl({
      phone: targetPhone,
      orgName: s.organization?.name || 'Local Pro',
      serviceName: s.name,
      price: s.price,
      date: bookingDate,
      timeSlot: bookingTime,
      address: bookingAddress.trim() || undefined,
      notes: bookingNotes.trim() || undefined,
    });

    try {
      await bookResidentService({
        serviceId: s.id,
        date: bookingDate,
        timeSlot: bookingTime,
        address: bookingAddress.trim() || undefined,
        notes: bookingNotes.trim() ? `${bookingNotes.trim()} [Via WhatsApp]` : 'Service booking routed and completed via WhatsApp.',
      });
    } catch {
      // Non-blocking
    }

    setBookingSubmitting(false);
    setBookingSuccessWaUrl(waUrl);

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleQuickWhatsApp = () => {
    const targetPhone = s.whatsapp || s.phone || '2348112417171';
    const waUrl = buildWhatsAppServiceUrl({
      phone: targetPhone,
      orgName: s.organization?.name || 'Local Pro',
      serviceName: s.name,
      price: s.price,
    });
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const displayRating = s.rating !== null && s.rating !== undefined ? s.rating : 5.0;

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pb-20 px-2 sm:px-0">
      <div className="mb-4">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-800 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Services
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
          {/* Provider badge, rating & like button */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <Link href={`/org/${s.organization?.slug || s.organizationId}`} className="inline-flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
              <span className="text-[11px] font-black tracking-wide uppercase text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md">
                {s.organization?.name}
              </span>
            </Link>

            <div className="flex items-center gap-2">
              {/* Rating Trigger */}
              <button
                type="button"
                onClick={handleOpenReviews}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors border border-amber-200/60"
              >
                <Star size={12} className="fill-amber-400 text-amber-500" />
                <span>{displayRating.toFixed(1)}</span>
                <span className="text-amber-600/70">
                  ({(s.reviewCount || 0) > 0 ? `${s.reviewCount}` : 'Reviews'})
                </span>
              </button>

              {/* Like Button */}
              <button
                type="button"
                onClick={handleToggleLike}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  liked
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 border border-slate-100'
                }`}
                title={liked ? 'Unlike provider' : 'Like provider'}
              >
                <Heart size={13} className={liked ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
                <span>{likesCount}</span>
              </button>
            </div>
          </div>

          <h1 className="text-2xl font-black text-ink mt-2 leading-tight">{s.name}</h1>
          
          <div className="flex items-center gap-3 mt-4">
            <PriceTag amount={s.price} />
            {s.durationMinutes && (
              <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> {s.durationMinutes} min
              </span>
            )}
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/60 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-teal-700" /> Direct Scheduling
            </span>
          </div>

          <p className="text-sm text-slate-600 font-medium leading-relaxed mt-5">
            {s.description || 'Verified local service pro in Calabar with guaranteed satisfaction and upfront pricing.'}
          </p>

          {s.address && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-3">
              <MapPin size={13} className="text-slate-400 shrink-0" />
              <span>{s.address}</span>
            </p>
          )}

          <div className="mt-7 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Verified City Pro</p>
                <p className="text-[11px] text-slate-500">Service backed by licensed provider in Calabar</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <Clock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Direct Scheduling</p>
                <p className="text-[11px] text-slate-500">Confirm date & slot directly with the verified local provider</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions Bar */}
        <div className="p-6 sm:p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-800 text-white text-sm font-black hover:bg-teal-900 transition-colors shadow-sm shadow-teal-950/10 cursor-pointer"
          >
            <CalendarClock className="w-4 h-4" />
            Book Appointment
          </button>
          
          <button
            onClick={handleQuickWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-bold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-teal-700" />
            Chat Provider
          </button>

          <button
            onClick={handleOpenReviews}
            className="px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <MessageSquare className="w-4 h-4 text-slate-500" />
            Reviews
          </button>
        </div>
      </div>

      {/* Direct WhatsApp Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 sm:p-8 relative">
            <button
              onClick={() => {
                setShowBookingModal(false);
                setBookingSuccessWaUrl(null);
                setBookingError(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {bookingSuccessWaUrl ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  Booking Dispatched!
                </h3>
                <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto leading-relaxed">
                  Your appointment for <span className="font-bold text-slate-900">{s.name}</span> has been prepared. Continue in chat with{' '}
                  <span className="font-bold text-slate-900">{s.organization?.name}</span> to finalize details.
                </p>
                <div className="p-4 bg-slate-50 rounded-xl text-left text-xs space-y-2 mb-6 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date & Slot:</span>
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
                  <a
                    href={bookingSuccessWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 px-4 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-sm text-center transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <MessageSquare className="w-4 h-4" /> Continue to Chat
                  </a>
                  <Link
                    href="/tasks"
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm text-center transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    View in Tasks <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookSubmit}>
                <div className="mb-6">
                  <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200/60 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                    <CalendarClock className="w-3 h-3 text-teal-600" />
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
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
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

                  {/* Inspection-First Policy Note */}
                  <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl text-teal-950 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold block flex items-center gap-1 text-slate-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                        Inspection-First Policy
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Direct chat to confirm your schedule and inspect details. Pay {fmt(s.price)} upon satisfactory job completion.
                      </span>
                    </div>
                    <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 ml-2" />
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
                    className="py-3 px-6 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm shadow-teal-950/10 cursor-pointer"
                  >
                    {bookingSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm Booking
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {showReviewsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                  Verified Reviews & Ratings
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {s.organization?.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={
                          reviewsAvgRating && star <= Math.round(reviewsAvgRating)
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-200'
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    {reviewsAvgRating !== null ? reviewsAvgRating.toFixed(1) : '5.0'}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({reviewsTotal} {reviewsTotal === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 space-y-5 pr-1">
              <div className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Rate & Review this Provider
                </h4>

                {reviewFormError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-1.5">
                    <AlertCircle size={13} />
                    {reviewFormError}
                  </div>
                )}

                {reviewSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-1.5">
                    <CheckCircle2 size={13} />
                    {reviewSuccessMsg}
                  </div>
                )}

                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Your Rating (1 to 5 Stars)
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setMyRating(star)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={20}
                            className={
                              (hoverRating || myRating) >= star
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-slate-300'
                            }
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-bold text-slate-600">
                        {hoverRating || myRating} / 5
                      </span>
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={myComment}
                      onChange={(e) => setMyComment(e.target.value)}
                      placeholder="Share your experience (punctuality, skill quality, pricing, communication)..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="px-4 py-2 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      {reviewSubmitting ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <Send size={12} /> Post Review
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Customer Reviews ({reviewsList.length})
                </h4>

                {reviewsLoading ? (
                  <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                    <Loader2 size={16} className="animate-spin" /> Loading reviews...
                  </div>
                ) : reviewsList.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-slate-400">
                    <p className="text-xs font-semibold">No reviews yet for this provider.</p>
                    <p className="text-[11px] mt-0.5">Be the first verified resident in Calabar to leave feedback!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviewsList.map((rev) => (
                      <div key={rev.id} className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{rev.authorName}</span>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {[1, 2, 3, 4, 5].map((st) => (
                              <Star
                                key={st}
                                size={11}
                                className={st <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}
                              />
                            ))}
                          </div>
                        </div>
                        {rev.body && (
                          <p className="text-xs text-slate-600 leading-relaxed">{rev.body}</p>
                        )}
                        <div className="text-[10px] text-slate-400">
                          {new Date(rev.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowReviewsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
