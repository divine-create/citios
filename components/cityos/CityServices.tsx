'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  ArrowRight,
  Clock,
  Calendar,
  Search,
  CheckCircle2,
  X,
  MapPin,
  AlertCircle,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Star,
  Heart,
  MessageSquare,
  Send,
} from 'lucide-react';
import RealisticIcon from '@/components/ui/RealisticIcon';
import { SERVICE_CATEGORIES } from '@/lib/service-categories';
import { bookResidentService } from '@/app/actions/service';
import {
  getOrganizationReviews,
  submitOrganizationReview,
  toggleOrganizationLike,
} from '@/lib/actions/service';
import { buildWhatsAppServiceUrl, buildWhatsAppInquiryUrl } from '@/lib/whatsapp';
import {
  ServicesVerticalConfig,
  DEFAULT_SERVICES_CONFIG,
} from '@/lib/services-config-constants';

export interface CityServicesOrg {
  id: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  rating?: number | null;
  reviewCount?: number;
  likesCount?: number;
  userHasLiked?: boolean;
}

export interface BookableServiceItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationMinutes: number;
  organizationId: string;
  orgName: string;
  category?: string;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  rating?: number | null;
  reviewCount?: number;
  likesCount?: number;
  userHasLiked?: boolean;
  isVerified?: boolean;
}

interface ReviewItem {
  id: string;
  organizationId: string;
  personId: string;
  rating: number;
  body: string | null;
  authorName: string;
  createdAt: string;
}

const CATEGORIES = [
  {
    id: 'All',
    slug: '',
    label: 'All Categories',
    iconKey: 'services',
    description: 'Explore all skilled trades and professional services in Calabar.',
  },
  ...SERVICE_CATEGORIES,
];

export default function CityServices({
  orgs = [],
  services = [],
  cityName = 'Calabar',
  initialCategory = 'All',
  initialCategoryCounts,
  config = DEFAULT_SERVICES_CONFIG,
}: {
  orgs?: CityServicesOrg[];
  services?: BookableServiceItem[];
  cityName?: string;
  initialCategory?: string;
  initialCategoryCounts?: Record<string, number>;
  config?: ServicesVerticalConfig;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  // Likes Local State for instant optimistic updates
  const [likesMap, setLikesMap] = useState<Record<string, { count: number; liked: boolean }>>(() => {
    const map: Record<string, { count: number; liked: boolean }> = {};
    for (const o of orgs) {
      map[o.id] = { count: o.likesCount || 0, liked: Boolean(o.userHasLiked) };
    }
    for (const s of services) {
      if (!map[s.organizationId]) {
        map[s.organizationId] = { count: s.likesCount || 0, liked: Boolean(s.userHasLiked) };
      }
    }
    return map;
  });

  // Booking Modal State
  const [selectedService, setSelectedService] = useState<BookableServiceItem | null>(null);
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

  // Reviews & Comments Modal State
  const [reviewModalOrg, setReviewModalOrg] = useState<{ id: string; name: string } | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([]);
  const [reviewsAvgRating, setReviewsAvgRating] = useState<number | null>(null);
  const [reviewsTotal, setReviewsTotal] = useState(0);

  // Review Form State inside Modal
  const [myRating, setMyRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  // Category counts
  const categoryCounts = useMemo(() => {
    if (initialCategoryCounts) return initialCategoryCounts;
    const counts: Record<string, number> = { All: services.length };
    for (const s of services) {
      const cat = s.category || 'Trades & Repair';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [services, initialCategoryCounts]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (activeCategory !== 'All' && s.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesDesc = (s.description || '').toLowerCase().includes(q);
        const matchesOrg = s.orgName.toLowerCase().includes(q);
        const matchesCat = (s.category || '').toLowerCase().includes(q);
        return matchesName || matchesDesc || matchesOrg || matchesCat;
      }
      return true;
    });
  }, [services, activeCategory, searchQuery]);

  // Group services by category for structured shelf display
  const servicesByCategory = useMemo(() => {
    const map = new Map<string, BookableServiceItem[]>();
    for (const cat of CATEGORIES) {
      if (cat.id === 'All') continue;
      map.set(cat.id, []);
    }
    for (const s of filteredServices) {
      const cat = s.category || 'Trades & Repair';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(s);
    }
    return map;
  }, [filteredServices]);

  // Categories list for shelf rendering
  const shelfCategories = useMemo(() => {
    const knownIds = CATEGORIES.filter((c) => c.id !== 'All').map((c) => c.id);
    const result: { id: string; label: string; iconKey: string }[] = CATEGORIES.filter(
      (c) => c.id !== 'All'
    );
    for (const catId of Array.from(servicesByCategory.keys())) {
      if (!knownIds.includes(catId)) {
        result.push({ id: catId, label: catId, iconKey: 'services' });
      }
    }
    return result;
  }, [servicesByCategory]);

  // Open Booking Modal
  const handleOpenBooking = (service: BookableServiceItem) => {
    setSelectedService(service);
    setBookingError(null);
    setBookingSuccessWaUrl(null);
    setBookingAddress(service.address || '');
    setBookingNotes('');
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setBookingDate(d.toISOString().split('T')[0]);
    setBookingTime('09:00');
  };

  // Submit Booking (opens chat with provider and records task in background)
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setBookingSubmitting(true);
    setBookingError(null);

    const targetPhone = selectedService.whatsapp || selectedService.phone;
    if (!targetPhone) {
      setBookingError('Provider direct line is currently unavailable.');
      setBookingSubmitting(false);
      return;
    }

    const waUrl = buildWhatsAppServiceUrl({
      phone: targetPhone,
      orgName: selectedService.orgName,
      serviceName: selectedService.name,
      date: bookingDate,
      timeSlot: bookingTime,
      address: bookingAddress.trim() || undefined,
      notes: bookingNotes.trim() || undefined,
    });

    try {
      await bookResidentService({
        serviceId: selectedService.id,
        date: bookingDate,
        timeSlot: bookingTime,
        address: bookingAddress.trim() || undefined,
        notes: bookingNotes.trim()
          ? `${bookingNotes.trim()} [Direct Booking]`
          : 'Service booking request initiated.',
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

  // Toggle Like with Optimistic Update
  const handleToggleLike = async (orgId: string) => {
    const current = likesMap[orgId] || { count: 0, liked: false };
    const nextLiked = !current.liked;
    const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);

    setLikesMap((prev) => ({
      ...prev,
      [orgId]: { count: nextCount, liked: nextLiked },
    }));

    try {
      const res = await toggleOrganizationLike(orgId);
      if (!res.success) {
        if (res.requiresAuth) {
          router.push(`/login?callbackUrl=/services`);
          return;
        }
        setLikesMap((prev) => ({ ...prev, [orgId]: current }));
      } else {
        setLikesMap((prev) => ({
          ...prev,
          [orgId]: {
            count: typeof res.likesCount === 'number' ? res.likesCount : nextCount,
            liked: Boolean(res.liked),
          },
        }));
      }
    } catch {
      setLikesMap((prev) => ({ ...prev, [orgId]: current }));
    }
  };

  // Open Reviews Modal
  const handleOpenReviews = async (orgId: string, orgName: string) => {
    setReviewModalOrg({ id: orgId, name: orgName });
    setReviewsLoading(true);
    setReviewFormError(null);
    setReviewSuccessMsg(null);
    setMyComment('');
    setMyRating(5);

    try {
      const res = await getOrganizationReviews(orgId);
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

  // Submit Review Form
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalOrg) return;

    setReviewSubmitting(true);
    setReviewFormError(null);
    setReviewSuccessMsg(null);

    try {
      const res = await submitOrganizationReview({
        organizationId: reviewModalOrg.id,
        rating: myRating,
        body: myComment.trim() || undefined,
      });

      if (!res.success) {
        if (res.requiresAuth) {
          router.push(`/login?callbackUrl=/services`);
          return;
        }
        setReviewFormError(res.error || 'Failed to submit review.');
        return;
      }

      setReviewSuccessMsg('Your review has been submitted successfully!');
      setMyComment('');

      const updated = await getOrganizationReviews(reviewModalOrg.id);
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

  // Reusable Service Card Component
  const renderServiceCard = (s: BookableServiceItem) => {
    const orgLikes = likesMap[s.organizationId] || { count: s.likesCount || 0, liked: Boolean(s.userHasLiked) };
    const hasReviews = Boolean(s.reviewCount && s.reviewCount > 0);
    const displayRating = hasReviews && s.rating !== null && s.rating !== undefined ? s.rating : null;

    return (
      <div
        key={s.id}
        className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between"
      >
        <div>
          {/* Provider Badge, Reviews, Likes */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 truncate max-w-[190px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md truncate">
                {s.orgName}
              </span>
              {s.isVerified && (
                <span title="Verified by CityOS Admin">
                  <ShieldCheck size={14} className="text-emerald-700 shrink-0" />
                </span>
              )}
            </div>

            {/* Like button */}
            {config.enableLikes !== false && (
              <button
                type="button"
                onClick={() => handleToggleLike(s.organizationId)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  orgLikes.liked
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 border border-slate-100'
                }`}
                title={orgLikes.liked ? 'Unlike provider' : 'Like provider'}
              >
                <Heart
                  size={12}
                  className={orgLikes.liked ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}
                />
                <span>{orgLikes.count}</span>
              </button>
            )}
          </div>

          {/* Service Name */}
          <div className="mt-1">
            <h3 className="font-bold text-slate-900 text-sm leading-snug">
              {s.name}
            </h3>
          </div>

          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {s.description || 'Professional service delivered by local trade and maintenance specialists in Calabar.'}
          </p>

          {/* Rating & Reviews Trigger */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {displayRating !== null && config.enableReviews !== false ? (
              <button
                type="button"
                onClick={() => handleOpenReviews(s.organizationId, s.orgName)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-2 py-0.5 rounded-md transition-colors"
              >
                <Star size={11} className="fill-amber-400 text-amber-500" />
                <span>{displayRating.toFixed(1)}</span>
                <span className="text-amber-600/70">
                  ({s.reviewCount} {s.reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </button>
            ) : null}

            {/* Verified Pro badge strictly for providers verified by admin */}
            {s.isVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                <CheckCircle2 size={11} className="text-emerald-600" />
                Verified Pro
              </span>
            )}

            {config.enableReviews !== false && (
              <button
                type="button"
                onClick={() => handleOpenReviews(s.organizationId, s.orgName)}
                className="text-[11px] text-slate-400 hover:text-teal-800 font-medium transition-colors flex items-center gap-0.5"
              >
                <MessageSquare size={11} /> {hasReviews ? 'Reviews' : 'Add review'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-slate-400" /> {s.durationMinutes} min
            </span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded truncate max-w-[150px]">
              {s.category || 'Trades & Repair'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className={`grid gap-2 pt-1 ${config.enableBooking || (config.enableDirectChat && (s.whatsapp || s.phone)) ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {config.enableBooking ? (
              <button
                type="button"
                onClick={() => handleOpenBooking(s)}
                className="w-full py-2 px-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Calendar size={13} />
                Book Pro
              </button>
            ) : config.enableDirectChat && (s.whatsapp || s.phone) ? (
              <a
                href={buildWhatsAppInquiryUrl({
                  phone: s.whatsapp || s.phone!,
                  orgName: s.orgName,
                  cityName,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs text-center"
              >
                <MessageSquare size={13} />
                Chat Pro
              </a>
            ) : null}

            <Link
              href={`/service/${s.id}`}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1 text-center"
            >
              Details <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-ink tracking-tight">Services</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/60">
              {cityName}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Book verified local trades, maintenance pros, and skilled services across {cityName}.
          </p>
        </div>

        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
        >
          <Clock size={14} className="text-teal-700" />
          My Scheduled Tasks & Jobs →
        </Link>
      </div>

      {/* Search & Category Filter Section */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by pro, trade, repair, laundry, electrical..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 font-medium">
            {activeCategory === 'All' && !searchQuery.trim() ? (
              <>
                Showing <span className="font-bold text-slate-800">{CATEGORIES.filter((c) => c.id !== 'All').length}</span> categories &bull; <span className="font-bold text-slate-800">{services.length}</span> verified services
              </>
            ) : searchQuery.trim() ? (
              <>
                Found <span className="font-bold text-slate-800">{filteredServices.length}</span> matching {filteredServices.length === 1 ? 'service' : 'services'}
              </>
            ) : (
              <>
                Showing <span className="font-bold text-slate-800">{filteredServices.length}</span> verified {filteredServices.length === 1 ? 'service' : 'services'} in {activeCategory}
              </>
            )}
          </div>
        </div>

        {/* Category Capsule Pills with Iconscout 3D Icons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth snap-x">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const active = activeCategory === cat.id;
            const href = cat.id === 'All' ? '/services' : `/services/${cat.slug}`;

            return (
              <Link
                key={cat.id}
                href={href}
                className={`px-3.5 py-2 rounded-full text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all border shrink-0 snap-start active:scale-95 flex items-center gap-2 ${
                  active
                    ? 'border-teal-800 bg-teal-800 text-white shadow-xs'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <RealisticIcon name={cat.iconKey} size={18} className="shrink-0" />
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                      active ? 'bg-teal-900 text-teal-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Main Services View */}
      {/* 1. HOME VIEW: Show ONLY Service Categories, NO Service Cards */}
      {activeCategory === 'All' && !searchQuery.trim() ? (
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-black text-ink tracking-tight">Service Categories</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Select a category to view bookable services and verified technicians across {cityName}.
              </p>
            </div>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/60 px-3 py-1 rounded-full self-start sm:self-auto">
              {CATEGORIES.filter((c) => c.id !== 'All').length} Categories Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.filter((c) => c.id !== 'All').map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              return (
                <Link
                  key={cat.id}
                  href={`/services/${cat.slug}`}
                  className="text-left group bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md hover:border-teal-700/40 hover:-translate-y-0.5 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-14 h-14 rounded-2xl bg-teal-50/70 border border-teal-100/70 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <RealisticIcon name={cat.iconKey} size={36} className="shrink-0" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 group-hover:bg-teal-800 group-hover:text-white transition-colors">
                        {count} {count === 1 ? 'service' : 'services'}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 group-hover:text-teal-800 transition-colors">
                      {cat.label}
                    </h3>
                    <p className="text-xs text-slate-500 font-normal mt-1.5 leading-relaxed line-clamp-2">
                      {cat.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-teal-800 group-hover:text-teal-900">
                    <span>Explore {cat.label}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : searchQuery.trim() ? (
        /* 2. SEARCH RESULTS VIEW: Shown when user actively searches */
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-ink">
                Search Results for &ldquo;{searchQuery}&rdquo;
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Found {filteredServices.length} matching {filteredServices.length === 1 ? 'service' : 'services'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
              className="text-xs font-bold text-slate-500 hover:text-teal-800 flex items-center gap-1 transition-colors"
            >
              ← Back to Categories
            </button>
          </div>

          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map(renderServiceCard)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-white space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">No services match your search</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching for another keyword or browse our service categories.
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
                className="px-4 py-2 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-xl text-xs font-bold transition-colors"
              >
                View All Categories
              </button>
            </div>
          )}
        </section>
      ) : (
        /* 3. CATEGORY VIEW: Shown when a specific category is chosen */
        <section className="space-y-6">
          {/* Category Banner with Back Button */}
          <div className="bg-gradient-to-r from-teal-900/5 via-teal-800/10 to-transparent rounded-2xl p-4 sm:p-5 border border-teal-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-teal-100 flex items-center justify-center shrink-0">
                <RealisticIcon
                  name={CATEGORIES.find((c) => c.id === activeCategory)?.iconKey || 'services'}
                  size={30}
                  className="shrink-0"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-ink tracking-tight">
                    {activeCategory}
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-800 text-white">
                    {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {CATEGORIES.find((c) => c.id === activeCategory)?.description || 'Verified local service providers in Calabar'}
                </p>
              </div>
            </div>

            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-teal-900 text-xs font-bold border border-slate-200 transition-colors shadow-2xs self-start sm:self-auto shrink-0"
            >
              ← Back to All Categories
            </Link>
          </div>

          {/* Services Grid for This Category */}
          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map(renderServiceCard)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-white space-y-3">
              <p className="text-sm font-bold text-slate-800">No services found in {activeCategory}</p>
              <Link
                href="/services"
                className="inline-block px-4 py-2 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-xl text-xs font-bold transition-colors"
              >
                Return to Categories
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Provider Onboarding CTA Banner */}
      {config.enableProviderOnboarding !== false && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-950 text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-teal-300 shrink-0">
              <Wrench className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-base font-black">Run a skilled trade or service business in Calabar?</h3>
              <p className="text-xs text-teal-100/70 font-medium mt-0.5 max-w-xl">
                Publish your catalog on CityOS, accept instant appointments, dispatch technicians, and manage invoices with ServiceOS.
              </p>
            </div>
          </div>
          <Link
            href="/business/register"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-teal-900 text-xs font-black hover:bg-teal-50 transition-colors shrink-0 shadow-sm"
          >
            Register Business <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Direct Booking Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                  {selectedService.orgName}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1.5">
                  Book {selectedService.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {selectedService.durationMinutes} min
                  </span>
                  <span>&bull;</span>
                  <span className="text-teal-800 font-semibold">Quote upon Inspection</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Success State */}
            {bookingSuccessWaUrl ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Booking Dispatched!</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Your request has been prepared and opened in chat with{' '}
                    <span className="font-bold text-slate-800">{selectedService.orgName}</span>.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service:</span>
                    <span className="font-bold">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date & Slot:</span>
                    <span className="font-bold">{bookingDate} ({bookingTime})</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
                  <a
                    href={bookingSuccessWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Open Chat Again
                  </a>
                  <Link
                    href="/tasks"
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors text-center"
                  >
                    Track in Tasks →
                  </Link>
                </div>
              </div>
            ) : (
              /* Booking Form */
              <form onSubmit={handleSubmitBooking} className="space-y-4">
                {bookingError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={15} />
                    {bookingError}
                  </div>
                )}

                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Select Appointment Date *
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setBookingDate(today);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        bookingDate === new Date().toISOString().split('T')[0]
                          ? 'bg-teal-50 text-teal-800 border-teal-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        setBookingDate(d.toISOString().split('T')[0]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        bookingDate ===
                        new Date(Date.now() + 86400000).toISOString().split('T')[0]
                          ? 'bg-teal-50 text-teal-800 border-teal-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Tomorrow
                    </button>
                  </div>
                  <input
                    required
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                  />
                </div>

                {/* Time Slot Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Preferred Time Slot *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { slot: '09:00', label: '09:00 AM' },
                      { slot: '11:00', label: '11:00 AM' },
                      { slot: '13:00', label: '01:00 PM' },
                      { slot: '15:00', label: '03:00 PM' },
                      { slot: '17:00', label: '05:00 PM' },
                      { slot: '18:30', label: '06:30 PM' },
                    ].map((t) => (
                      <button
                        key={t.slot}
                        type="button"
                        onClick={() => setBookingTime(t.slot)}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-all ${
                          bookingTime === t.slot
                            ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Address Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Service Address / Location
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Flat 4B, Marian Road, Calabar"
                    value={bookingAddress}
                    onChange={(e) => setBookingAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Leave blank if visiting the provider&apos;s workshop or hub in Calabar.
                  </p>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Special Instructions / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe issues, site access, or specific requirements..."
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                  />
                </div>

                {/* Inspection & Quote Policy Note */}
                <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-teal-900 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold block">Inspection & Quote Policy</span>
                    <span className="text-[11px] text-teal-700">
                      Direct chat to confirm your schedule. Free inspection and transparent quote agreed before work begins.
                    </span>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 ml-2" />
                </div>

                {/* Actions */}
                <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {bookingSubmitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} /> Confirm & Book
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reviews & Comments Modal */}
      {reviewModalOrg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                  Verified Reviews & Ratings
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {reviewModalOrg.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {reviewsAvgRating !== null ? (
                    <>
                      <div className="flex items-center gap-1 text-amber-500">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={
                              star <= Math.round(reviewsAvgRating)
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-slate-200'
                            }
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {reviewsAvgRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({reviewsTotal} {reviewsTotal === 1 ? 'review' : 'reviews'})
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">
                      No customer reviews yet
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOrg(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Reviews List & Comment Form */}
            <div className="overflow-y-auto flex-1 py-4 space-y-5 pr-1">
              {/* Write a Review Section */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Rate & Comment on this Provider
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
                  {/* Star Selector */}
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

                  {/* Comment Input */}
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

              {/* Reviews List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Resident Reviews ({reviewsList.length})
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
                      <div
                        key={rev.id}
                        className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold flex items-center justify-center">
                              {rev.authorName.slice(0, 1)}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {rev.authorName}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={11}
                                className={s <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}
                              />
                            ))}
                          </div>
                        </div>

                        {rev.body && (
                          <p className="text-xs text-slate-600 leading-relaxed pl-7">
                            {rev.body}
                          </p>
                        )}

                        <div className="text-[10px] text-slate-400 pl-7">
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

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setReviewModalOrg(null)}
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
