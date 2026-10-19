'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  BedDouble,
  MapPin,
  Banknote,
  Users,
  Image as ImageIcon,
  Link2,
  Sparkles,
  Building2,
  User as UserIcon,
  ArrowLeft,
  Loader2,
  Check,
  Share2,
  Plus,
  Upload,
  X,
  Phone,
  Home,
  Bath,
  Zap,
} from 'lucide-react';
import { createUniversalStay, type StayCategory } from '@/lib/actions/stays';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';
import { useCity } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

const STAY_CATEGORIES: { id: StayCategory; label: string; badge: string }[] = [
  { id: 'Short-Let', label: 'Short-Let Apartment', badge: 'Most Popular' },
  { id: 'Serviced Suite', label: 'Serviced Suite / Studio', badge: 'Executive' },
  { id: 'Guest House', label: 'Guest House / Lodge', badge: 'Budget Friendly' },
  { id: 'Entire Home', label: 'Entire Home / Duplex', badge: 'Family & Groups' },
  { id: 'Hotel', label: 'Boutique Hotel', badge: 'Hospitality' },
  { id: 'Rental', label: 'Long-Term Rental', badge: 'Monthly / Yearly' },
];

const POPULAR_AREAS = [
  'State Housing',
  'Marian / Ndidem Usang Iso',
  'Parliamentary Extension',
  'Ekorinim',
  'Summit Hills',
  'Diamond Hill',
  'Asari Eso',
  '8 Miles',
];

const AMENITY_OPTIONS = [
  '24/7 Power / Inverter',
  'Fast Wi-Fi',
  'Air Conditioning',
  'Gated Security',
  'Full Kitchen',
  'Free Parking',
  'Swimming Pool',
  'Smart TV / Netflix',
  'Breakfast Included',
  'Free Cancellation',
  'Washing Machine',
  'Workspace / Desk',
];

export default function CreateStayForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { myBusinesses, activeBusiness, openCreateModal } = useAccountSwitcher();
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';

  const preselectedOrgId = searchParams?.get('org') || '';

  const [hostMode, setHostMode] = useState<'PERSONAL' | 'ORGANIZATION'>('PERSONAL');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  const [title, setTitle] = useState('');
  const [stayCategory, setStayCategory] = useState<StayCategory>('Short-Let');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [pricePeriod, setPricePeriod] = useState<'night' | 'month' | 'year'>('night');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('2');
  const [maxGuests, setMaxGuests] = useState('4');
  const [bedType, setBedType] = useState('King & Queen Beds');
  const [amenities, setAmenities] = useState<string[]>([
    '24/7 Power / Inverter',
    'Fast Wi-Fi',
    'Air Conditioning',
    'Gated Security',
  ]);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [shareToFeed, setShareToFeed] = useState(true);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preselectedOrgId && myBusinesses.some((b) => b.id === preselectedOrgId)) {
      setHostMode('ORGANIZATION');
      setSelectedOrgId(preselectedOrgId);
    } else if (activeBusiness) {
      setHostMode('ORGANIZATION');
      setSelectedOrgId(activeBusiness.id);
    }
  }, [preselectedOrgId, activeBusiness, myBusinesses]);

  const handleCategoryChange = (cat: StayCategory) => {
    setStayCategory(cat);
    if (cat === 'Rental') {
      setPricePeriod('year');
    } else if (pricePeriod === 'year') {
      setPricePeriod('night');
    }
  };

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploadingImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`Photo "${file.name}" exceeds 5MB limit.`);
        }
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data?.url) {
          throw new Error(data?.error || 'Failed to upload photo');
        }
        uploadedUrls.push(data.url);
      }
      setImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setError(err.message || 'Could not upload photo. You can also paste an image link below.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    setImages((prev) => [...prev, trimmed]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!session) {
      router.push('/login?callbackUrl=/stay/create');
      return;
    }

    if (hostMode === 'ORGANIZATION' && !selectedOrgId) {
      setError('Please select which business page is listing this stay, or switch to Personal Host.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const finalImages = [...images];
    if (imageUrlInput.trim()) {
      finalImages.push(imageUrlInput.trim());
    }

    const res = await createUniversalStay({
      hostType: hostMode,
      organizationId: hostMode === 'ORGANIZATION' ? selectedOrgId : undefined,
      title,
      stayCategory,
      description,
      neighborhood,
      address: address || neighborhood,
      price: Number(price) || 0,
      pricePeriod,
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
      bedrooms: Number(bedrooms) || 1,
      bathrooms: Number(bathrooms) || 1,
      maxGuests: Number(maxGuests) || 2,
      bedType,
      amenities,
      images: finalImages,
      whatsappPhone,
      bookingUrl,
      shareToFeed,
      citySlug: city?.slug,
    });

    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.stayId) {
      router.push(`/stay/${res.stayId}`);
    } else {
      router.push('/stay');
    }
  };

  const selectedBusiness = myBusinesses.find((b) => b.id === selectedOrgId);
  const hostDisplayName =
    hostMode === 'ORGANIZATION' && selectedBusiness
      ? selectedBusiness.name
      : session?.user?.name || 'You (Personal Host)';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/stay"
          className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Stays in {cityName}
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-[11px] font-black uppercase tracking-wider border border-teal-200">
          <Sparkles className="w-3 h-3 text-teal-600" />
          Host on CityStay
        </span>
      </div>

      {/* Hero Header */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-teal-200 text-[10px] font-black uppercase tracking-widest">
            <BedDouble className="w-3.5 h-3.5" />
            Short-Lets · Apartments · Guest Houses · Hotels
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            List a Stay or Property in {cityName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl leading-relaxed">
            Publish your short-let apartment, serviced flat, guest house, or rental property as an individual host or business. Guests can view photos, calculate nightly totals, and reserve directly on WhatsApp.
          </p>
        </div>
      </div>

      {status !== 'loading' && !session && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black text-amber-950">Sign in required to publish your listing</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Please sign in to your 9jaLive account so you can manage your stay listing and receive bookings.
            </p>
          </div>
          <Link
            href="/login?callbackUrl=/stay/create"
            className="px-4 py-2 rounded-xl bg-amber-900 text-white text-xs font-black shrink-0 hover:bg-amber-950"
          >
            Sign In
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Section 1: Who is hosting? */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4 shadow-2xs">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              1. Who is hosting this property?
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              List directly as an individual host/property owner or under one of your business pages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHostMode('PERSONAL')}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer',
                hostMode === 'PERSONAL'
                  ? 'border-teal-700 bg-teal-50/50 ring-2 ring-teal-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  hostMode === 'PERSONAL' ? 'bg-teal-800 text-white' : 'bg-slate-200 text-slate-600'
                )}
              >
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-900 truncate">
                    {session?.user?.name || 'Personal Host'}
                  </p>
                  {hostMode === 'PERSONAL' && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Individual Host / Property Owner (No business page needed)
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setHostMode('ORGANIZATION');
                if (!selectedOrgId && myBusinesses.length > 0) {
                  setSelectedOrgId(myBusinesses[0].id);
                }
              }}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer',
                hostMode === 'ORGANIZATION'
                  ? 'border-teal-700 bg-teal-50/50 ring-2 ring-teal-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  hostMode === 'ORGANIZATION' ? 'bg-teal-800 text-white' : 'bg-slate-200 text-slate-600'
                )}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-900">Business / Hospitality Brand</p>
                  {hostMode === 'ORGANIZATION' && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Host as a Hotel, Short-Let Brand, or Real Estate Agency
                </p>
              </div>
            </button>
          </div>

          {hostMode === 'ORGANIZATION' && (
            <div className="pt-2 space-y-2">
              {myBusinesses.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">You don&apos;t have a Business Page yet</p>
                    <p className="text-[11px] text-slate-500">
                      Create a business page in 10 seconds or switch to Personal Host above.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreateModal('HOTEL')}
                    className="px-3.5 py-2 rounded-xl bg-teal-800 text-white text-xs font-black inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Page
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Business Page
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {myBusinesses.map((biz) => {
                      const active = selectedOrgId === biz.id;
                      return (
                        <button
                          key={biz.id}
                          type="button"
                          onClick={() => setSelectedOrgId(biz.id)}
                          className={cn(
                            'p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer',
                            active
                              ? 'border-teal-700 bg-teal-50/70 text-teal-950 font-black'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate">{biz.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                              {biz.type}
                            </p>
                          </div>
                          {active && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Property Type & Title */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              2. Property Type & Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose the category that best describes this stay so guests can filter easily.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {STAY_CATEGORIES.map((cat) => {
              const active = stayCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={cn(
                    'p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1',
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50/60 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  <span
                    className={cn(
                      'text-[9px] font-black uppercase tracking-wider',
                      active ? 'text-teal-300' : 'text-slate-400'
                    )}
                  >
                    {cat.badge}
                  </span>
                  <span className="text-xs font-black">{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Property / Listing Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Luxury 2-Bedroom Serviced Short-Let with 24/7 Power & Pool"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              About This Space & House Rules
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what makes this space special — power supply hours, security, nearby landmarks, check-in instructions..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 resize-none"
            />
          </div>
        </div>

        {/* Section 3: Location & Neighborhood */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              3. Location in {cityName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pick a popular neighborhood or enter the exact area and street address.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-500 mb-2">Quick-select neighborhood:</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setNeighborhood(area)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                    neighborhood === area
                      ? 'bg-teal-800 text-white border-teal-800'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-700" /> Neighborhood / Area *
                </span>
              </label>
              <input
                type="text"
                required
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder={`e.g. State Housing Estate, ${cityName}`}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-teal-700" /> Street Address / Landmark
                </span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Off Marian Road, beside Crunchies"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Pricing, Rooms & Amenities */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              4. Pricing, Rooms & Amenities
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Set your rate in Naira (₦), guest capacity, and key amenities like 24/7 power or Wi-Fi.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-teal-700" /> Rate (₦) *
                </span>
              </label>
              <input
                type="number"
                required
                min="1000"
                step="500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 45000"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Billing Period</label>
              <select
                value={pricePeriod}
                onChange={(e) => setPricePeriod(e.target.value as 'night' | 'month' | 'year')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white focus:outline-none focus:border-teal-700"
              >
                <option value="night">Per Night (/ night)</option>
                <option value="month">Per Month (/ month)</option>
                <option value="year">Per Year (/ year)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Regular Price (₦, optional)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="For discount badge"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                <span className="inline-flex items-center gap-1">
                  <BedDouble className="w-3.5 h-3.5 text-slate-500" /> Bedrooms
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                <span className="inline-flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5 text-slate-500" /> Bathrooms
                </span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" /> Max Guests
                </span>
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={maxGuests}
                onChange={(e) => setMaxGuests(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bed Setup</label>
              <input
                type="text"
                value={bedType}
                onChange={(e) => setBedType(e.target.value)}
                placeholder="e.g. 2 Queen Beds"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              <span className="inline-flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Select Included Amenities
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((item) => {
                const active = amenities.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAmenity(item)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5',
                      active
                        ? 'bg-teal-50 text-teal-900 border-teal-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {active && <Check className="w-3.5 h-3.5 text-teal-700" />}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 5: Photos & Direct WhatsApp Booking */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              5. Property Photos & Direct Booking Contact
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload clear photos of the living room, bedrooms, and exterior, and add your WhatsApp number for direct reservations.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-teal-700" /> Property Photos (First photo is the Cover Image)
              </span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageFileUpload}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Photos
                  </>
                )}
              </button>

              <div className="flex-1 flex gap-2">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="Or paste an image URL (https://...) and click Add"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-teal-700"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black cursor-pointer shrink-0"
                >
                  Add URL
                </button>
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt={`Property photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[9px] font-black uppercase">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> Host WhatsApp Number (for Bookings) *
                </span>
              </label>
              <input
                type="tel"
                required
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="e.g. 0803 123 4567"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-teal-700"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Guests clicking &ldquo;Reserve on WhatsApp&rdquo; will message this number directly.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-teal-700" /> External Booking Link (optional)
                </span>
              </label>
              <input
                type="text"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://... (Airbnb, Booking.com, or website)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>

          {/* Auto-share to City Newsfeed */}
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-teal-50/60 border border-teal-200/70 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={shareToFeed}
              onChange={(e) => setShareToFeed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-teal-800"
            />
            <div className="flex-1">
              <p className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-teal-700" />
                Also announce this stay on the {cityName} Newsfeed
              </p>
              <p className="text-[11px] text-teal-800/80 font-medium mt-0.5">
                Automatically shares a post to the City Pulse feed linked directly to your stay page.
              </p>
            </div>
          </label>
        </div>

        {/* Submit Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">
            Listing as <strong className="text-slate-900 font-black">{hostDisplayName}</strong> in{' '}
            <strong className="text-slate-900 font-black">{cityName}</strong>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/stay"
              className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-initial px-7 py-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black shadow-md shadow-teal-900/20 inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing Stay...
                </>
              ) : (
                <>
                  <BedDouble className="w-4 h-4" />
                  Publish Stay Listing
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
