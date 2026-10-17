'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  ArrowRight,
  Clock,
  Calendar,
  Briefcase,
  Search,
  CheckCircle2,
  X,
  MapPin,
  Sparkles,
  Car,
  Zap,
  Scissors,
  HeartPulse,
  AlertCircle,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Star,
  Heart,
  MessageSquare,
  Phone,
  Send,
} from 'lucide-react';
import { fmtNaira } from '@/lib/format';
import { bookResidentService } from '@/app/actions/service';
import {
  getOrganizationReviews,
  submitOrganizationReview,
  toggleOrganizationLike,
} from '@/lib/actions/service';
import { buildWhatsAppServiceUrl, buildWhatsAppInquiryUrl } from '@/lib/whatsapp';

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

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
  { id: 'All', label: 'All Services', icon: Briefcase },
  { id: 'Trades & Repair', label: 'Trades & Repair', icon: Wrench },
  { id: 'Home & Cleaning', label: 'Home & Cleaning', icon: Sparkles },
  { id: 'Tech & Solar', label: 'Tech & Solar', icon: Zap },
  { id: 'Automotive & Power', label: 'Automotive & Power', icon: Car },
  { id: 'Beauty & Wellness', label: 'Beauty & Wellness', icon: Scissors },
  { id: 'Health & Care', label: 'Health & Care', icon: HeartPulse },
];

const SPECIALIZED_HUBS = [
  {
    title: 'Healthcare & Care',
    desc: 'Consultations, home nursing & clinic visits',
    href: '/services/healthcare',
    icon: HeartPulse,
    badge: 'Verified Health',
    gradient: 'from-rose-500 to-red-600',
  },
  {
    title: 'Rides & Haulage',
    desc: 'On-demand transport, delivery & couriers',
    href: '/services/ride',
    icon: Car,
    badge: 'On-Demand',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    title: 'Local Trades',
    desc: 'Artisans, carpenters, welders & masonry',
    href: '/services/local',
    icon: Wrench,
    badge: 'Skilled Pros',
    gradient: 'from-teal-600 to-emerald-700',
  },
  {
    title: 'Tutors & Education',
    desc: 'Private tutors, academies & course bookings',
    href: '/services/education',
    icon: Briefcase,
    badge: 'Learning',
    gradient: 'from-blue-600 to-indigo-700',
  },
];

export default function CityServices({
  orgs,
  services = [],
  cityName = 'Calabar',
}: {
  orgs: CityServicesOrg[];
  services?: BookableServiceItem[];
  cityName?: string;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

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

  // Booking Modal State (WhatsApp Routing)
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
    const counts: Record<string, number> = { All: services.length };
    for (const s of services) {
      const cat = s.category || 'Trades & Repair';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [services]);

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

  // Open WhatsApp Booking Modal
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

  // Submit and Route Booking to WhatsApp
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setBookingSubmitting(true);
    setBookingError(null);

    // Compute target WhatsApp phone
    const targetPhone = selectedService.whatsapp || selectedService.phone || '2348112417171';

    // Build the WhatsApp deep link
    const waUrl = buildWhatsAppServiceUrl({
      phone: targetPhone,
      orgName: selectedService.orgName,
      serviceName: selectedService.name,
      price: selectedService.price,
      date: bookingDate,
      timeSlot: bookingTime,
      address: bookingAddress.trim() || undefined,
      notes: bookingNotes.trim() || undefined,
    });

    // Best-effort background task recording on CityOS so resident can track in /tasks
    try {
      await bookResidentService({
        serviceId: selectedService.id,
        date: bookingDate,
        timeSlot: bookingTime,
        address: bookingAddress.trim() || undefined,
        notes: bookingNotes.trim()
          ? `${bookingNotes.trim()} [Routed to WhatsApp]`
          : 'Service booking routed and initiated via WhatsApp.',
      });
    } catch {
      // Non-blocking: WhatsApp direct connection must always succeed
    }

    setBookingSubmitting(false);
    setBookingSuccessWaUrl(waUrl);

    // Immediately open WhatsApp in a new tab
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Direct Quick WhatsApp Chat with Provider
  const handleQuickWhatsApp = (service: BookableServiceItem) => {
    const targetPhone = service.whatsapp || service.phone || '2348112417171';
    const waUrl = buildWhatsAppServiceUrl({
      phone: targetPhone,
      orgName: service.orgName,
      serviceName: service.name,
      price: service.price,
    });
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Direct WhatsApp Inquiry for Provider
  const handleProviderWhatsApp = (org: CityServicesOrg) => {
    const targetPhone = org.whatsapp || org.phone || '2348112417171';
    const waUrl = buildWhatsAppInquiryUrl({
      phone: targetPhone,
      orgName: org.name,
      cityName,
    });
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Toggle Like with Optimistic Update
  const handleToggleLike = async (orgId: string) => {
    const current = likesMap[orgId] || { count: 0, liked: false };
    const nextLiked = !current.liked;
    const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);

    // Optimistic state
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
        // Rollback
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
      // Rollback
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

      // Refresh reviews
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-ink tracking-tight">Services</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/60">
              {cityName}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center gap-1">
              <WhatsAppIcon className="w-3 h-3 text-emerald-600" /> WhatsApp Direct
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Connect directly with verified local trades, maintenance pros, and personal services in {cityName} via WhatsApp.
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

      {/* WhatsApp Notice Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <WhatsAppIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-200">
              Instant WhatsApp Service Dispatch
            </h3>
            <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
              All bookings are routed and completed directly on WhatsApp with provider verification, upfront Naira pricing, and inspection-first guarantee.
            </p>
          </div>
        </div>
        <div className="text-[11px] font-bold text-emerald-200 bg-emerald-800/60 border border-emerald-700/60 px-3 py-1.5 rounded-xl shrink-0">
          Fast & Direct Booking
        </div>
      </div>

      {/* Specialized Hub Shortcuts */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Specialized City Hubs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SPECIALIZED_HUBS.map((hub) => (
            <Link
              key={hub.title}
              href={hub.href}
              className="group p-4 bg-white rounded-2xl border border-slate-100 hover:border-teal-200 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${hub.gradient} text-white shadow-xs`}>
                    <hub.icon size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                    {hub.badge}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-800 transition-colors">
                  {hub.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{hub.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-teal-800">
                <span>Explore Hub</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

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
            Showing <span className="font-bold text-slate-800">{filteredServices.length}</span> verified services
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
                  active
                    ? 'bg-teal-800 text-white shadow-teal-900/10'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <cat.icon size={13} className={active ? 'text-white' : 'text-slate-400'} />
                {cat.label}
                {count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                      active ? 'bg-teal-900 text-teal-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Bookable Services Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-ink">
            {activeCategory === 'All' ? 'Bookable Services in Calabar' : activeCategory}
          </h2>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-md flex items-center gap-1">
            <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
            WhatsApp Dispatch Ready
          </span>
        </div>

        {filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((s) => {
              const orgLikes = likesMap[s.organizationId] || { count: s.likesCount || 0, liked: Boolean(s.userHasLiked) };
              const displayRating = s.rating !== null && s.rating !== undefined ? s.rating : 5.0;
              const hasReviews = (s.reviewCount || 0) > 0;

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
                        <ShieldCheck size={14} className="text-teal-700 shrink-0" />
                      </div>

                      {/* Like button */}
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
                    </div>

                    {/* Service Name & Price */}
                    <div className="flex items-baseline justify-between gap-2 mt-1">
                      <h3 className="font-bold text-slate-900 text-sm leading-snug flex-1">
                        {s.name}
                      </h3>
                      <span className="text-sm font-black text-slate-900 shrink-0">
                        {fmtNaira(s.price)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {s.description || 'Professional service delivered by verified local providers in Calabar.'}
                    </p>

                    {/* Rating & Reviews Trigger */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReviews(s.organizationId, s.orgName)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-2 py-0.5 rounded-md transition-colors"
                      >
                        <Star size={11} className="fill-amber-400 text-amber-500" />
                        <span>{displayRating.toFixed(1)}</span>
                        <span className="text-amber-600/70">
                          ({hasReviews ? `${s.reviewCount} ${s.reviewCount === 1 ? 'review' : 'reviews'}` : 'New'})
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenReviews(s.organizationId, s.orgName)}
                        className="text-[11px] text-slate-400 hover:text-teal-800 font-medium transition-colors flex items-center gap-0.5"
                      >
                        <MessageSquare size={11} /> Review
                      </button>
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

                    {/* Booking Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* WhatsApp Direct Booking Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenBooking(s)}
                        className="w-full py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                        Book on WhatsApp
                      </button>

                      {/* Details Page Link */}
                      <Link
                        href={`/service/${s.id}`}
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1 text-center"
                      >
                        Details <ArrowRight size={12} />
                      </Link>
                    </div>

                    {/* Quick WhatsApp One-Click Chat */}
                    <button
                      type="button"
                      onClick={() => handleQuickWhatsApp(s)}
                      className="w-full py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center justify-center gap-1 hover:underline transition-all"
                    >
                      <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
                      Quick chat with provider on WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-white space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No services match your filter</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for another keyword or switch category.
              </p>
            </div>
            {(searchQuery || activeCategory !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
                className="px-4 py-2 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-xl text-xs font-bold transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* Service Businesses Directory */}
      <section className="rounded-2xl bg-white border border-slate-100 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-ink">Registered Service Providers</h2>
            <p className="text-xs text-slate-400 font-medium">
              18 verified businesses offering trade, technical, and maintenance services across {cityName}.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-md">
            {orgs.length} Active Businesses
          </span>
        </div>

        {orgs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-xs font-bold text-slate-600">No service providers registered in this city yet</p>
            <p className="text-[11px] text-slate-400 mt-1">Providers appear here as they register on CityOS.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {orgs.map((o) => {
              const orgLikes = likesMap[o.id] || { count: o.likesCount || 0, liked: Boolean(o.userHasLiked) };
              const displayRating = o.rating !== null && o.rating !== undefined ? o.rating : 5.0;

              return (
                <div
                  key={o.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-4 hover:shadow-md hover:border-slate-200 transition-all space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-800 to-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {o.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <Link href={`/org/${o.id}`} className="hover:underline">
                          <p className="text-xs font-black text-ink truncate">{o.name}</p>
                        </Link>
                        {/* Like Provider Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleLike(o.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                            orgLikes.liked
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                          }`}
                        >
                          <Heart
                            size={11}
                            className={orgLikes.liked ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}
                          />
                          <span>{orgLikes.count}</span>
                        </button>
                      </div>

                      <p className="text-[11px] font-medium text-slate-400 line-clamp-1 mt-0.5">
                        {o.description || 'Verified local service provider'}
                      </p>

                      {o.address && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                          <MapPin size={10} className="shrink-0 text-slate-400" />
                          <span className="truncate">{o.address}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Provider Actions: Reviews & WhatsApp */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReviews(o.id, o.name)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Star size={11} className="fill-amber-400 text-amber-500" />
                      <span>{displayRating.toFixed(1)}</span>
                      <span className="text-amber-600/70">
                        ({(o.reviewCount || 0) > 0 ? `${o.reviewCount}` : 'New'})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleProviderWhatsApp(o)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200/60 transition-colors"
                    >
                      <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
                      WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Provider Onboarding CTA Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-950 text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-teal-300 shrink-0">
            <Wrench className="w-6 h-6" />
          </span>
          <div>
            <h3 className="text-base font-black">Run a skilled trade or service business in Calabar?</h3>
            <p className="text-xs text-teal-100/70 font-medium mt-0.5 max-w-xl">
              Publish your catalog on CityOS, accept instant WhatsApp appointments, dispatch technicians, and manage invoices with ServiceOS.
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

      {/* Direct WhatsApp Booking Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded flex items-center gap-1">
                    <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
                    Direct WhatsApp Booking
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                    {selectedService.orgName}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Book {selectedService.name}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                  <span className="font-bold text-teal-800">{fmtNaira(selectedService.price)}</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {selectedService.durationMinutes} min
                  </span>
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

            {/* Success State: Directed to WhatsApp */}
            {bookingSuccessWaUrl ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <WhatsAppIcon className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Directing to WhatsApp!</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    We prepared your appointment details and opened a direct chat with{' '}
                    <span className="font-bold text-slate-800">{selectedService.orgName}</span> on WhatsApp.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left text-xs text-emerald-900 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Service:</span>
                    <span className="font-bold">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Fee:</span>
                    <span className="font-bold">{fmtNaira(selectedService.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Date & Slot:</span>
                    <span className="font-bold">{bookingDate} ({bookingTime})</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
                  <a
                    href={bookingSuccessWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    Open WhatsApp Chat Again
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
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
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

                {/* WhatsApp Routing Explanation */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold flex items-center gap-1">
                      <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                      Direct WhatsApp Completion
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Submitting opens WhatsApp with your pre-filled details to chat directly with {selectedService.orgName}. Pay {fmtNaira(selectedService.price)} upon job inspection.
                    </span>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 ml-2" />
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
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {bookingSubmitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Connecting to WhatsApp...
                      </>
                    ) : (
                      <>
                        <WhatsAppIcon className="w-4 h-4" />
                        Complete on WhatsApp
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
