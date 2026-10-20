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
import { useSession } from 'next-auth/react';
import LoginModal from '@/components/LoginModal';
import { FallbackImg, getTwoLetterInitials, getAvatarGradient } from '@/components/cityos/CityUI';
import {
  getCityServiceItem,
  bookResidentService,
  getOrganizationReviews,
  submitOrganizationReview,
  toggleOrganizationLike,
} from '@/app/actions/service';
import { buildWhatsAppServiceUrl } from '@/lib/whatsapp';

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
  authorInitials?: string;
  avatarUrl?: string | null;
  isVerifiedCustomer?: boolean;
  tags?: string[];
  photos?: string[];
  ownerReply?: {
    text: string;
    repliedAt: string;
    authorName: string;
  } | null;
  createdAt: string;
}

export default function ServiceDetail({ id }: { id: string }) {
  const router = useRouter();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Like state
  const [liked, setLiked] = useState(false);
  const { data: session } = useSession();
  const [likesCount, setLikesCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);

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

  // Reviews State (Loaded directly inline)
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([]);
  const [reviewsAvgRating, setReviewsAvgRating] = useState<number | null>(null);
  const [reviewsTotal, setReviewsTotal] = useState(0);

  // Write Review State
  const [showWriteReview, setShowWriteReview] = useState(false);
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

        // Fetch reviews immediately on page load
        setReviewsLoading(true);
        try {
          const res = await getOrganizationReviews(prod.organizationId);
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

  const handleScrollToReviews = () => {
    const el = document.getElementById('reviews-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenWriteReview = () => {
    if (!session?.user) {
      setShowLoginModal(true);
      return;
    }
    setShowWriteReview(true);
    handleScrollToReviews();
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setShowLoginModal(true);
      return;
    }
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
    const targetPhone = s.whatsapp || s.phone;
    if (!targetPhone) {
      alert('Provider contact is currently unavailable.');
      return;
    }
    const waUrl = buildWhatsAppServiceUrl({
      phone: targetPhone,
      orgName: s.organization?.name || 'Local Pro',
      serviceName: s.name,
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
            <img src={s.imageAssetId.startsWith('http') || s.imageAssetId.startsWith('/') ? s.imageAssetId : `/api/assets/${s.imageAssetId}`} alt={s.name} className="w-full h-full object-cover" />
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
                onClick={handleScrollToReviews}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors border border-amber-200/60 cursor-pointer"
              >
                <Star size={12} className="fill-amber-400 text-amber-500" />
                <span>{reviewsAvgRating !== null ? reviewsAvgRating.toFixed(1) : displayRating.toFixed(1)}</span>
                <span className="text-amber-600/70">
                  ({reviewsTotal > 0 ? `${reviewsTotal}` : (s.reviewCount || 0) > 0 ? `${s.reviewCount}` : 'Reviews'})
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
            {s.durationMinutes && (
              <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> {s.durationMinutes} min
              </span>
            )}
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/60 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-teal-700" /> Direct Scheduling
            </span>
            <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
              Quote on Inspection
            </span>
          </div>

          <p className="text-sm text-slate-600 font-medium leading-relaxed mt-5">
            {s.description || 'Verified local service pro in Calabar with guaranteed satisfaction and transparent quotes.'}
          </p>

          {s.address && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-3">
              <MapPin size={13} className="text-slate-400 shrink-0" />
              <span>{s.address}</span>
            </p>
          )}

          <div className="mt-7 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {s.isVerified && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Verified City Pro</p>
                  <p className="text-[11px] text-slate-500">Service backed by licensed provider in Calabar</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <Clock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-800">Direct Inquiries</p>
                <p className="text-[11px] text-slate-500">Confirm schedule and inspect quotes directly with the provider</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions Bar */}
        <div className="p-6 sm:p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          {s.isBookingEnabled && (
            <button
              onClick={() => setShowBookingModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-800 text-white text-sm font-black hover:bg-teal-900 transition-colors shadow-sm shadow-teal-950/10 cursor-pointer"
            >
              <CalendarClock className="w-4 h-4" />
              Book Appointment
            </button>
          )}
          
          <button
            onClick={handleQuickWhatsApp}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-colors shadow-xs cursor-pointer ${
              s.isBookingEnabled
                ? 'bg-white border border-slate-200 text-slate-800 text-sm font-bold hover:bg-slate-50'
                : 'bg-teal-800 hover:bg-teal-900 text-white text-sm font-black'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            Chat Provider via WhatsApp
          </button>

          <button
            type="button"
            onClick={handleScrollToReviews}
            className="px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            Reviews ({reviewsTotal > 0 ? reviewsTotal : (s.reviewCount || 0)})
          </button>
        </div>
      </div>

      {/* Customer Reviews & Ratings Section */}
      <section id="reviews-section" className="mt-8 bg-white rounded-[24px] border border-slate-100 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-ink tracking-tight">Customer Reviews</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200/60 px-2.5 py-0.5 rounded-md">
                Verified Resident Feedback
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real reviews and ratings from other residents in {s.organization?.name ? s.organization.name : 'Calabar'}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!session?.user) {
                setShowLoginModal(true);
                return;
              }
              setShowWriteReview(!showWriteReview);
              setReviewSuccessMsg(null);
              setReviewFormError(null);
            }}
            className="px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shadow-xs cursor-pointer"
          >
            <Star size={13} className="fill-amber-300 text-amber-300" />
            <span>{showWriteReview ? 'Hide Review Form' : 'Write a Review'}</span>
          </button>
        </div>

        {/* Rating Breakdown & Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-5 rounded-2xl bg-slate-50/70 border border-slate-100 items-center">
          <div className="text-center sm:text-left sm:border-r sm:border-slate-200/80 sm:pr-6">
            <div className="text-4xl font-black text-ink tracking-tight">
              {reviewsAvgRating !== null ? reviewsAvgRating.toFixed(1) : (s.rating ? Number(s.rating).toFixed(1) : '5.0')}
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-1 mt-1.5 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  className={
                    (reviewsAvgRating ?? s.rating ?? 5) >= star
                      ? 'fill-amber-400 text-amber-500'
                      : (reviewsAvgRating ?? s.rating ?? 5) >= star - 0.5
                      ? 'fill-amber-300 text-amber-400'
                      : 'text-slate-200'
                  }
                />
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1.5">
              Based on {reviewsTotal > 0 ? reviewsTotal : (s.reviewCount || 0)} {reviewsTotal === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviewsList.filter((r) => Math.round(r.rating) === star).length;
              const pct = reviewsList.length > 0 ? Math.round((count / reviewsList.length) * 100) : star === 5 ? 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-600 w-3">{star}</span>
                  <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                  <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold w-8 text-right">
                    {reviewsList.length > 0 ? `${pct}%` : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Write a Review Section */}
        {showWriteReview && (
          <div className="p-5 bg-teal-50/40 border border-teal-100 rounded-2xl space-y-4 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-black text-slate-800">Leave Your Review</h3>
              <p className="text-xs text-slate-500">
                Share your feedback to help fellow residents make confident decisions.
              </p>
            </div>

            {reviewFormError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{reviewFormError}</span>
              </div>
            )}

            {reviewSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{reviewSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setMyRating(star)}
                      className="p-1 transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star
                        size={22}
                        className={
                          (hoverRating || myRating) >= star
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-300'
                        }
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {hoverRating || myRating} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Your Feedback
                </label>
                <textarea
                  rows={3}
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  placeholder="Share details about the service (speed, quality, pricing, communication)..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWriteReview(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {reviewSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={13} /> Submit Review
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews Feed */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Reviews from Other Users ({reviewsList.length})
          </h3>

          {reviewsLoading ? (
            <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
              <Loader2 size={16} className="animate-spin" /> Loading reviews...
            </div>
          ) : reviewsList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <MessageSquare size={18} />
              </div>
              <p className="text-xs font-bold text-slate-700">No reviews yet for this provider.</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Be the first resident to leave feedback and help fellow residents discover trusted services!
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!session?.user) {
                    setShowLoginModal(true);
                    return;
                  }
                  setShowWriteReview(true);
                }}
                className="mt-2 px-3.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Star size={11} className="fill-amber-300 text-amber-300" />
                Write First Review
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {reviewsList.map((rev) => {
                return (
                  <div
                    key={rev.id}
                    className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-2.5 transition-all hover:border-slate-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <FallbackImg
                          src={rev.avatarUrl || undefined}
                          alt={rev.authorName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          icon={<span className="text-white font-bold text-xs select-none">{getTwoLetterInitials(rev.authorName)}</span>}
                          gradient={getAvatarGradient(rev.authorName)}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{rev.authorName}</span>
                            {rev.isVerifiedCustomer && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded">
                                <ShieldCheck size={10} className="text-emerald-600" />
                                Verified Customer
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(rev.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <Star
                            key={st}
                            size={13}
                            className={st <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}
                          />
                        ))}
                      </div>
                    </div>

                    {rev.tags && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {rev.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {rev.body && (
                      <p className="text-xs text-slate-700 leading-relaxed font-normal pt-1">
                        {rev.body}
                      </p>
                    )}

                    {rev.ownerReply && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                          <span className="text-teal-800 font-extrabold">{rev.ownerReply.authorName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            • {new Date(rev.ownerReply.repliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 italic">
                          "{rev.ownerReply.text}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

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
                    Provided by <span className="font-semibold text-slate-700">{s.organization?.name}</span>
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

                  {/* Inspection & Quote Policy Note */}
                  <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl text-teal-950 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold block flex items-center gap-1 text-slate-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                        Inspection & Quote Policy
                      </span>
                      <span className="text-[11px] text-slate-600">
                        Direct chat to confirm your schedule and inspect details. Transparent quote agreed before work begins.
                      </span>
                    </div>
                    <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 ml-2" />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Pricing</span>
                    <span className="text-sm font-bold text-slate-800">Quote upon Inspection</span>
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

      {/* Login Modal for unauthenticated reviewers */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Sign in to write a review"
        message="Sign in or register to share your honest review with the city."
        callbackUrl={`/service/${id}`}
      />
    </div>
  );
}
