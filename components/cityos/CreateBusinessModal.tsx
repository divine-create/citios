'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  UtensilsCrossed,
  Wrench,
  GraduationCap,
  Building2,
  Ticket,
  Stethoscope,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';
import { useSession } from 'next-auth/react';
import { quickCreateBusiness } from '@/lib/actions/business';
import { useCity } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

export interface VerticalOption {
  type: string;
  title: string;
  osName: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  badgeTone: string;
  placeholderName: string;
  placeholderBio: string;
}

export const VERTICAL_OPTIONS: VerticalOption[] = [
  {
    type: 'RETAIL',
    title: 'Retail & Store',
    osName: 'ShopOS',
    tagline: 'Products, inventory & storefront',
    description: 'Sell physical products, manage inventory stock, process orders, and run your online store.',
    icon: Store,
    tone: 'from-emerald-700 to-teal-600',
    badgeTone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    placeholderName: 'e.g. Lekki Fresh Organics',
    placeholderBio: 'Daily fresh produce, bakery treats, and household groceries.',
  },
  {
    type: 'RESTAURANT',
    title: 'Restaurant & Cafe',
    osName: 'RestaurantOS',
    tagline: 'Menu, kitchen & dining',
    description: 'Manage digital menus, table bookings, dine-in service, takeout and delivery orders.',
    icon: UtensilsCrossed,
    tone: 'from-orange-600 to-amber-500',
    badgeTone: 'bg-orange-50 text-orange-800 border-orange-200',
    placeholderName: 'e.g. Mama Put Kitchen & Lounge',
    placeholderBio: 'Authentic local delicacies and continental dishes made fresh daily.',
  },
  {
    type: 'SERVICES',
    title: 'Services & Trades',
    osName: 'ServiceOS',
    tagline: 'Bookings, quotes & field staff',
    description: 'Provide professional trades, home repairs, cleaning, plumbing, quotes, and dispatch jobs.',
    icon: Wrench,
    tone: 'from-cyan-700 to-sky-600',
    badgeTone: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    placeholderName: 'e.g. Swift Cooling & AC Experts',
    placeholderBio: 'Commercial & residential AC installation, maintenance, and emergency repairs.',
  },
  {
    type: 'SCHOOL',
    title: 'School & Academy',
    osName: 'SchoolOS',
    tagline: 'Students, classes & gradebooks',
    description: 'Manage academic terms, student admissions, attendance tracking, teacher timetables, and report cards.',
    icon: GraduationCap,
    tone: 'from-blue-700 to-indigo-600',
    badgeTone: 'bg-blue-50 text-blue-800 border-blue-200',
    placeholderName: 'e.g. Crown Heights Academy',
    placeholderBio: 'Inspiring future leaders with modern STEM and arts curriculum.',
  },
  {
    type: 'HOTEL',
    title: 'Hotel & Hospitality',
    osName: 'HotelOS',
    tagline: 'Rooms, reservations & guests',
    description: 'Manage guest check-ins, room inventory, reservations, night audits, and housekeeping.',
    icon: Building2,
    tone: 'from-purple-700 to-violet-600',
    badgeTone: 'bg-purple-50 text-purple-800 border-purple-200',
    placeholderName: 'e.g. Grand Azure Suites & Spa',
    placeholderBio: 'Luxury boutique accommodation with high-speed Wi-Fi and 24/7 room service.',
  },
  {
    type: 'EVENT_ORGANIZER',
    title: 'Events & Venues',
    osName: 'EventsOS',
    tagline: 'Tickets, guestlists & passes',
    description: 'Host conferences, concerts, exhibitions, sell tickets, and manage attendee check-ins.',
    icon: Ticket,
    tone: 'from-rose-700 to-pink-600',
    badgeTone: 'bg-rose-50 text-rose-800 border-rose-200',
    placeholderName: 'e.g. Lagos City Vibes Experience',
    placeholderBio: 'Curating the finest lifestyle events, music festivals, and business networking mixers.',
  },
  {
    type: 'HEALTHCARE',
    title: 'Healthcare & Clinic',
    osName: 'ClinicOS',
    tagline: 'Appointments & prescriptions',
    description: 'Schedule doctor appointments, manage patient visits, digital records, and health consultations.',
    icon: Stethoscope,
    tone: 'from-teal-800 to-emerald-700',
    badgeTone: 'bg-teal-50 text-teal-800 border-teal-200',
    placeholderName: 'e.g. Primus Family Health Center',
    placeholderBio: 'Comprehensive outpatient care, diagnostic tests, and specialist consultations.',
  },
];

export default function CreateBusinessModal() {
  const { isCreateModalOpen, closeCreateModal, preselectedType, refreshBusinesses, switchToBusiness } = useAccountSwitcher();
  const { city } = useCity();
  const { update } = useSession();

  const [selectedType, setSelectedType] = useState<string>('RETAIL');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync preselected type if provided
  useEffect(() => {
    if (preselectedType) {
      setSelectedType(preselectedType);
    }
  }, [preselectedType]);

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateModalOpen && !isSubmitting) {
        closeCreateModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen, isSubmitting, closeCreateModal]);

  // Reset form when modal opens
  useEffect(() => {
    if (isCreateModalOpen) {
      setName('');
      setDescription('');
      setAddress(city?.name ? `${city.name}` : '');
      setError(null);
      if (preselectedType) setSelectedType(preselectedType);
    }
  }, [isCreateModalOpen, preselectedType, city?.name]);

  if (!isCreateModalOpen) return null;

  const currentOption = VERTICAL_OPTIONS.find((v) => v.type === selectedType) || VERTICAL_OPTIONS[0];
  const Icon = currentOption.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a business or page name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await quickCreateBusiness({
        name: name.trim(),
        type: selectedType,
        description: description.trim(),
        address: address.trim(),
        citySlug: city?.slug,
      });

      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
        return;
      }

      if (res.success && res.business) {
        // Sync the newly minted OWNER membership into the active session
        try {
          if (update) await update();
        } catch {}

        // Persist active business id locally for immediate pickup
        try {
          localStorage.setItem('cityconnect_active_business_id', res.business.id);
        } catch {}

        // Refresh businesses list
        await refreshBusinesses();
        // Switch to the newly created business
        switchToBusiness(res.business as any);
        closeCreateModal();

        // Direct browser to the newly created workspace
        window.location.href = res.business.workspaceUrl;
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create business page. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closeCreateModal} />

      {/* Dialog Window */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 z-10">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">Create a Business Page</h2>
              <p className="text-[11px] text-teal-100/70 font-medium mt-0.5">
                Launch your business presence on CityConnect in under 30 seconds
              </p>
            </div>
          </div>
          <button
            onClick={closeCreateModal}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(85vh-80px)] overflow-y-auto">
          {/* Step 1: Vertical Selector */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2.5">
              1. Choose your vertical category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {VERTICAL_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.type;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedType(opt.type)}
                    className={cn(
                      'text-left p-3 rounded-2xl border transition-all relative flex flex-col justify-between h-[100px]',
                      isSelected
                        ? 'border-teal-700 bg-teal-50/50 ring-2 ring-teal-600/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-xl flex items-center justify-center text-white bg-gradient-to-br',
                          opt.tone
                        )}
                      >
                        <OptIcon className="w-3.5 h-3.5" />
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-700" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">{opt.osName}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-ink leading-tight">{opt.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{opt.tagline}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Basic Business Details */}
          <div className="space-y-4">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
              2. Business Information
            </label>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business / Page Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={currentOption.placeholderName}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-sm font-medium text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Short Description / Bio <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={currentOption.placeholderBio}
                rows={2}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-xs font-medium text-slate-900 placeholder:text-slate-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                City / Location <span className="text-slate-400 font-normal">(Auto-assigned)</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Victoria Island, Lagos"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-xs font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Facebook-style Live Page Preview */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
              Page Live Preview
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br shadow-md shrink-0',
                    currentOption.tone
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-ink leading-tight truncate">
                      {name.trim() || 'Your Business Name'}
                    </h3>
                    <span
                      className={cn(
                        'text-[10px] font-black px-2 py-0.5 rounded-full border',
                        currentOption.badgeTone
                      )}
                    >
                      {currentOption.title} · {currentOption.osName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 line-clamp-2">
                    {description.trim() || currentOption.placeholderBio}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                    📍 {address || city?.name || 'CityOS Network'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error ? (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={closeCreateModal}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Page...
                </>
              ) : (
                <>
                  Create Business Page
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
