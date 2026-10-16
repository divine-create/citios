'use client';

import React, { useState, useMemo } from 'react';
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
  CalendarClock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { fmtNaira } from '@/lib/format';
import { bookResidentService } from '@/app/actions/service';

export interface CityServicesOrg {
  id: string;
  name: string;
  description?: string | null;
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
  cityName = 'the City',
}: {
  orgs: CityServicesOrg[];
  services?: BookableServiceItem[];
  cityName?: string;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Booking Modal State
  const [selectedService, setSelectedService] = useState<BookableServiceItem | null>(null);
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

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: services.length };
    for (const s of services) {
      const cat = s.category || 'General Services';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [services]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      // Category match
      if (activeCategory !== 'All' && s.category !== activeCategory) {
        return false;
      }
      // Search match
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

  const handleOpenBooking = (service: BookableServiceItem) => {
    setSelectedService(service);
    setBookingError(null);
    setBookingSuccessJobId(null);
    setBookingAddress('');
    setBookingNotes('');
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setBookingDate(d.toISOString().split('T')[0]);
    setBookingTime('09:00');
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setBookingSubmitting(true);
    setBookingError(null);

    const res = await bookResidentService({
      serviceId: selectedService.id,
      date: bookingDate,
      timeSlot: bookingTime,
      address: bookingAddress.trim() || undefined,
      notes: bookingNotes.trim() || undefined,
    });

    setBookingSubmitting(false);

    if (!res.success) {
      if (res.error === 'UNAUTHORIZED') {
        router.push(`/login?callbackUrl=/services`);
        return;
      }
      setBookingError(res.message || 'Failed to submit appointment request.');
    } else {
      setBookingSuccessJobId(res.jobId || 'success');
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
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Book verified local trades, maintenance pros, and personal services across {cityName}.
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
              placeholder="Search by trade, repair, pro or company..."
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
            {activeCategory === 'All' ? 'Bookable Services' : activeCategory}
          </h2>
          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md">
            Instant Scheduling
          </span>
        </div>

        {filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((s) => (
              <div
                key={s.id}
                className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md truncate">
                        {s.orgName}
                      </span>
                      <ShieldCheck size={14} className="text-teal-700 shrink-0" />
                    </div>
                    <span className="text-sm font-black text-slate-900 shrink-0">
                      {fmtNaira(s.price)}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-1 leading-snug">
                    {s.name}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {s.description || 'Professional service delivered by verified local providers.'}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" /> {s.durationMinutes} min
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                      {s.category || 'General'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenBooking(s)}
                      className="w-full py-2 px-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Calendar size={13} />
                      Book Pro
                    </button>
                    <Link
                      href={`/service/${s.id}`}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1 text-center"
                    >
                      Details <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-ink">Registered Service Providers</h2>
            <p className="text-xs text-slate-400 font-medium">
              Verified businesses offering trade, technical, and maintenance services in {cityName}.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400">{orgs.length} Active Businesses</span>
        </div>

        {orgs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-xs font-bold text-slate-600">No service providers registered in this city yet</p>
            <p className="text-[11px] text-slate-400 mt-1">Providers appear here as they register on CityOS.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orgs.map((o) => (
              <Link
                key={o.id}
                href={`/org/${o.id}`}
                className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-white p-3.5 hover:shadow-md hover:border-slate-200 transition-all"
              >
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-800 to-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {o.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-ink truncate">{o.name}</p>
                  <p className="text-[11px] font-medium text-slate-400 truncate">
                    {o.description || 'Verified local service provider'}
                  </p>
                </div>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </Link>
            ))}
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
            <h3 className="text-base font-black">Run a skilled trade or service business?</h3>
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

            {/* Success State */}
            {bookingSuccessJobId ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Appointment Request Sent!</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Your request has been dispatched to {selectedService.orgName}. You will receive status updates in your resident tasks.
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Done
                  </button>
                  <Link
                    href={`/tasks`}
                    className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
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
                    Leave blank if visiting the provider's workshop.
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

                {/* Payment Policy Note */}
                <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-teal-900 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold block">Inspection-First Policy</span>
                    <span className="text-[11px] text-teal-700">Pay {fmtNaira(selectedService.price)} upon satisfactory job completion via Transfer or Cash.</span>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
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
                        <CheckCircle2 size={14} /> Confirm Booking
                      </>
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
