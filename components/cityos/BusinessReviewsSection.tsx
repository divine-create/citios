'use client';

import React, { useState, useRef } from 'react';
import {
  Star,
  Camera,
  CheckCircle2,
  MessageSquare,
  Loader2,
  X,
  Sparkles,
  Reply,
  ShieldCheck,
} from 'lucide-react';
import {
  submitBusinessReview,
  replyToBusinessReview,
  getOrganizationReviews,
  type HydratedReviewItem,
} from '@/lib/actions/reviews';
import {
  REVIEW_VIBE_TAGS,
  RATING_LABELS,
  type RatingDistribution,
} from '@/lib/reviews';
import LoginModal from '@/components/LoginModal';
import { cn } from '@/lib/utils';

function getYelpStarBg(rating: number, active: boolean) {
  if (!active) return 'bg-slate-200 text-slate-400';
  if (rating >= 5) return 'bg-[#f43939] text-white';
  if (rating === 4) return 'bg-[#ff643d] text-white';
  if (rating === 3) return 'bg-[#ff9242] text-white';
  if (rating === 2) return 'bg-[#ffad42] text-white';
  return 'bg-[#ffcc4b] text-white';
}

export function YelpStarRow({
  rating,
  size = 'sm',
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const boxSize =
    size === 'lg'
      ? 'w-8 h-8 rounded-lg'
      : size === 'md'
      ? 'w-6 h-6 rounded-md'
      : 'w-5 h-5 rounded-md';
  const iconSize =
    size === 'lg' ? 'w-4 h-4' : size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= rating;
        return (
          <span
            key={star}
            className={cn(
              'inline-flex items-center justify-center transition-colors shadow-2xs',
              boxSize,
              getYelpStarBg(rating, active)
            )}
          >
            <Star className={cn(iconSize, 'fill-current')} />
          </span>
        );
      })}
    </div>
  );
}

interface BusinessReviewsSectionProps {
  organizationId: string;
  organizationName: string;
  initialReviews: HydratedReviewItem[];
  initialDistribution: RatingDistribution;
  initialMyReview: HydratedReviewItem | null;
  isManager?: boolean;
  isLoggedIn?: boolean;
}

export default function BusinessReviewsSection({
  organizationId,
  organizationName,
  initialReviews,
  initialDistribution,
  initialMyReview,
  isManager = false,
  isLoggedIn = false,
}: BusinessReviewsSectionProps) {
  const [reviews, setReviews] = useState<HydratedReviewItem[]>(initialReviews);
  const [distribution, setDistribution] = useState<RatingDistribution>(initialDistribution);
  const [myReview, setMyReview] = useState<HydratedReviewItem | null>(initialMyReview);

  // Write Review Form State
  const [showWriteForm, setShowWriteForm] = useState<boolean>(!initialMyReview);
  const [rating, setRating] = useState<number>(initialMyReview?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [body, setBody] = useState<string>(initialMyReview?.text ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialMyReview?.tags ?? []);
  const [photos, setPhotos] = useState<string[]>(initialMyReview?.photos ?? []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Lightbox State
  const [filter, setFilter] = useState<'all' | 'photos' | '5star'>('all');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Owner Reply State
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    setUploadingPhoto(true);
    setErrorMsg(null);

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        if (photos.length + uploadedUrls.length >= 6) break;
        const formData = new FormData();
        formData.append('file', files[i]);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          uploadedUrls.push(data.url);
        } else {
          setErrorMsg(data.error || 'Failed to upload photo.');
        }
      }
      if (uploadedUrls.length > 0) {
        setPhotos((prev) => [...prev, ...uploadedUrls].slice(0, 6));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading photo.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await submitBusinessReview({
        organizationId,
        rating,
        body,
        photos,
        tags: selectedTags,
      });

      if (!res.success) {
        if (res.requiresAuth) {
          setShowLoginModal(true);
        } else {
          setErrorMsg(res.error || 'Could not submit review.');
        }
        return;
      }

      const fresh = await getOrganizationReviews(organizationId);
      setReviews(fresh.reviews);
      setDistribution(fresh.distribution);
      setMyReview(fresh.myReview);
      setShowWriteForm(false);
      setSuccessMsg('Your review has been published here and shared to the CityFeed!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await replyToBusinessReview({
        reviewId,
        replyText,
      });
      if (res.success) {
        const fresh = await getOrganizationReviews(organizationId);
        setReviews(fresh.reviews);
        setReplyingReviewId(null);
        setReplyText('');
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'photos') return r.photos.length > 0;
    if (filter === '5star') return r.rating === 5;
    return true;
  });

  const displayStar = hoverRating ?? rating;

  return (
    <section id="reviews" className="bg-white rounded-3xl border border-slate-100 p-5 md:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg md:text-xl font-black text-ink flex items-center gap-2">
            Reviews & Ratings
            {distribution.totalReviews > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
                {distribution.totalReviews}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Community reviews for {organizationName} · Automatically shared on CityFeed
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isLoggedIn) {
              setShowLoginModal(true);
              return;
            }
            setShowWriteForm((v) => !v);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#f43939] hover:bg-[#d92b2b] text-white text-xs font-black transition-all shadow-sm shrink-0"
        >
          <Star className="w-4 h-4 fill-white" />
          {myReview ? (showWriteForm ? 'Close Editor' : 'Edit Your Review') : 'Write a Review'}
        </button>
      </div>

      {/* Rating Breakdown Summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-50/80 rounded-2xl p-5 border border-slate-100">
        <div className="md:col-span-4 flex flex-col items-center sm:items-start text-center sm:text-left space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900">
              {distribution.averageRating ? distribution.averageRating.toFixed(1) : '—'}
            </span>
            <span className="text-xs font-bold text-slate-400">out of 5</span>
          </div>
          <YelpStarRow rating={Math.round(distribution.averageRating || 0)} size="md" />
          <p className="text-xs font-bold text-slate-500">
            {distribution.totalReviews === 0
              ? 'No reviews yet — be the first!'
              : `Based on ${distribution.totalReviews} verified resident review${
                  distribution.totalReviews === 1 ? '' : 's'
                }`}
          </p>
        </div>

        <div className="md:col-span-8 space-y-1.5">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = distribution.counts[star] || 0;
            const pct =
              distribution.totalReviews > 0
                ? Math.round((count / distribution.totalReviews) * 100)
                : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-bold text-slate-600 shrink-0">{star} stars</span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      star >= 4 ? 'bg-[#f43939]' : star === 3 ? 'bg-[#ff9242]' : 'bg-amber-400'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right font-bold text-slate-400 shrink-0">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {successMsg}
          </span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Write / Edit Review Form */}
      {showWriteForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border-2 border-slate-200/90 bg-white p-5 space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {myReview ? `Update your review for ${organizationName}` : `Rate your experience at ${organizationName}`}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Select a star rating, share your experience, and attach optional photos.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= displayStar;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-2xs',
                        getYelpStarBg(displayStar, active)
                      )}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-black text-slate-700 min-w-[95px]">
                {RATING_LABELS[displayStar]}
              </span>
            </div>
          </div>

          {/* Quick Vibe Tags */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
              What stood out? (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REVIEW_VIBE_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-bold transition-all border',
                      active
                        ? 'bg-teal-800 text-white border-teal-800 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-teal-400'
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Commentary */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Your Review
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Share details of your experience with ${organizationName} — what did you order, try, or like best?`}
              className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-3.5 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-700 transition-colors"
            />
          </div>

          {/* Optional Photo Attachment */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
                Attach Photos (Optional · Up to 6)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploadingPhoto || photos.length >= 6}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 text-teal-700" />
                    Add Photos
                  </>
                )}
              </button>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-1">
                {photos.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group"
                  >
                    <img
                      src={url}
                      alt={`Review attachment ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      title="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              {errorMsg}
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              Automatically publishes as a Yelp-style Review Card in the CityFeed
            </span>

            <button
              type="submit"
              disabled={submitting || uploadingPhoto}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black transition-all shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing Review...
                </>
              ) : myReview ? (
                'Update Review'
              ) : (
                'Post Review'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Filter Pills */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: `All Reviews (${reviews.length})` },
            {
              id: 'photos',
              label: `With Photos (${reviews.filter((r) => r.photos.length > 0).length})`,
            },
            {
              id: '5star',
              label: `5 Stars (${reviews.filter((r) => r.rating === 5).length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border',
                filter === tab.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {filteredReviews.map((r) => (
            <div key={r.id} className="py-5 first:pt-2 last:pb-1 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {r.avatarUrl ? (
                    <img
                      src={r.avatarUrl}
                      alt={r.authorName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {r.authorInitials}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900">{r.authorName}</span>
                      {r.isVerifiedCustomer && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                          <CheckCircle2 className="w-3 h-3" /> Verified Customer
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <YelpStarRow rating={r.rating} size="sm" />
                      <span className="text-[11px] font-bold text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString('en-NG', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {isManager && !r.ownerReply && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingReviewId(replyingReviewId === r.id ? null : r.id);
                      setReplyText('');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:underline"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Reply
                  </button>
                )}
              </div>

              {r.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {r.text && (
                <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">
                  {r.text}
                </p>
              )}

              {r.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {r.photos.map((photoUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxUrl(photoUrl)}
                      className="relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group"
                    >
                      <img
                        src={photoUrl}
                        alt={`${organizationName} review photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Owner Reply Form */}
              {replyingReviewId === r.id && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Official Business Response
                  </label>
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Write a public response from ${organizationName}...`}
                    className="w-full rounded-xl bg-white border border-slate-200 p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyingReviewId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingReply || !replyText.trim()}
                      onClick={() => handleOwnerReply(r.id)}
                      className="px-4 py-1.5 rounded-lg bg-teal-800 text-white text-xs font-black hover:bg-teal-900 disabled:opacity-50"
                    >
                      {submittingReply ? 'Posting...' : 'Post Reply'}
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Owner Reply */}
              {r.ownerReply && (
                <div className="ml-4 sm:ml-8 mt-2 p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-teal-950">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                    <span>Response from {r.ownerReply.authorName}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {r.ownerReply.text}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-black text-slate-800">No reviews match this filter yet</p>
          <p className="text-xs text-slate-500">
            Share your experience above to help other residents in the city.
          </p>
        </div>
      )}

      {/* Fullscreen Photo Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-xs p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Review photo full size"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={`Sign in to write a review for ${organizationName}.`}
      />
    </section>
  );
}
