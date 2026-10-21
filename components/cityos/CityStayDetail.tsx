'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BedDouble,
  ArrowLeft,
  User as UserIcon,
  Phone,
  MessageSquare,
  MapPin,
  Star,
  Check,
  Zap,
  Bath,
  Users,
  Trash2,
  ExternalLink,
  Building2,
  Sparkles,
  Loader2,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { createHotelWhatsAppBooking } from '@/app/actions/checkout';
import {
  bookResidentHotelReservation,
  checkHotelRoomsAvailability,
  type HotelReservationResult,
  type RoomAvailabilityResult,
} from '@/lib/actions/hotel';
import { deleteUniversalStay } from '@/lib/actions/stays';
import { FallbackImg } from '@/components/cityos/CityUI';
import { useMoney } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';
import BusinessReviewsSection from '@/components/cityos/BusinessReviewsSection';
import type { OrganizationReviewsBundle } from '@/lib/actions/reviews';

const DEFAULT_STAY_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';

export default function CityStayDetail({
  stay,
  org,
  rooms: legacyRooms,
  reviewsBundle,
  isManager = false,
  isLoggedIn = false,
}: {
  stay?: any;
  org?: any;
  rooms?: any[];
  reviewsBundle?: OrganizationReviewsBundle | null;
  isManager?: boolean;
  isLoggedIn?: boolean;
}) {
  const router = useRouter();
  const { fmt } = useMoney();

  // Support both new `stay` prop and legacy `org`/`rooms` props
  const data = stay || {
    ...org,
    stayCategory: 'Hotel',
    pricePeriod: 'night',
    rooms: legacyRooms || [],
    images: org?.images || (org?.logoAssetId ? [org.logoAssetId] : []),
    isHotelOrg: true,
  };

  const rooms: any[] = data?.rooms || [];
  const allPhotos: string[] =
    Array.isArray(data?.images) && data.images.length > 0
      ? data.images
      : data?.coverImage
      ? [data.coverImage]
      : [DEFAULT_STAY_IMAGE];

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestsCount, setGuestsCount] = useState('2');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  const nightsCount = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 <= d1) return 1;
    return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  const basePrice = Number(data?.price || data?.startingPrice || 0);
  const pricePeriod = data?.pricePeriod || 'night';
  const isNightly = pricePeriod === 'night';
  const calculatedTotal = isNightly ? basePrice * nightsCount : basePrice;

  const [isSuccess, setIsSuccess] = useState(false);
  const isHotelOSEnabled = Boolean(data?.isHotelOSEnabled);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, RoomAvailabilityResult>>({});
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const orgId = data.organizationId || data.id;
  const targetOrgId = data.organizationId || (data.isHotelOrg ? data.id : null) || data.id;
  const totalReviewsCount = reviewsBundle?.distribution?.totalReviews ?? data.reviewCount ?? 0;
  const avgRating = reviewsBundle?.distribution?.averageRating ?? data.rating ?? null;
  const displayScore =
    typeof data.reviewScore === 'number' && data.reviewScore > 0
      ? data.reviewScore
      : avgRating
      ? Number((avgRating * 2).toFixed(1))
      : null;
  const roomIdsStr = useMemo(() => rooms.map((r: any) => r.id).join(','), [rooms]);

  useEffect(() => {
    if (!isHotelOSEnabled || rooms.length === 0) {
      setAvailabilityMap({});
      return;
    }
    if (!checkIn || !checkOut) {
      setAvailabilityMap({});
      return;
    }
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 <= d1) {
      setAvailabilityMap({});
      return;
    }

    let isMounted = true;
    setIsCheckingAvailability(true);

    checkHotelRoomsAvailability({
      organizationId: orgId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      roomIds: rooms.map((r: any) => r.id),
    })
      .then((res) => {
        if (isMounted) {
          setAvailabilityMap(res || {});
        }
      })
      .catch((err) => {
        console.error('Failed to check room availability:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingAvailability(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [checkIn, checkOut, isHotelOSEnabled, orgId, roomIdsStr]);

  async function handleBookHotelRoom(room: any) {
    if (!guestName.trim()) {
      setIsSuccess(false);
      setMessage('Please enter your full name above to proceed.');
      return;
    }
    if (!checkIn || !checkOut) {
      setIsSuccess(false);
      setMessage('Please select your check-in and check-out dates.');
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setIsSuccess(false);
      setMessage('Check-out date must be after check-in date.');
      return;
    }
    if (isHotelOSEnabled && availabilityMap[room.id] && !availabilityMap[room.id].available) {
      setIsSuccess(false);
      setMessage(availabilityMap[room.id].reason || 'This room is not available for the selected dates.');
      return;
    }
    setLoadingRoomId(room.id);
    setMessage('');
    setIsSuccess(false);

    try {
      if (isHotelOSEnabled) {
        // HotelOS-configured reservation flow: creates authoritative reservation in HotelOS
        const res: HotelReservationResult = await bookResidentHotelReservation({
          organizationId: data.organizationId || data.id,
          roomId: room.id,
          guestName: guestName.trim(),
          checkInDate: checkIn,
          checkOutDate: checkOut,
          listingId: (data as any).listingId || undefined,
        });
        if (!res.success) {
          setMessage(res.error);
        } else {
          setIsSuccess(true);
          setMessage(`Reservation confirmed! Booking Reference: #${res.reservationId.slice(0, 8)}. Total: ₦${res.totalPrice.toLocaleString()}.`);
        }
      } else {
        // Default WhatsApp enquiry flow: direct enquiry without false confirmation
        const res = await createHotelWhatsAppBooking({
          organizationId: data.organizationId || data.id,
          hotelName: data.name,
          roomId: room.id,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim() || undefined,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guestsCount,
          enquiryText: `Enquiring about ${room.type} Room (Room #${room.roomNumber}) for ${nightsCount} night(s).`,
        });
        if (!res.success || res.error) {
          setMessage(res.error || 'Enquiry preparation failed. Please try again.');
        } else if (res.whatsappUrl) {
          window.open(res.whatsappUrl, '_blank');
        }
      }
    } catch (e: any) {
      setMessage(e.message || 'Action failed. Please try again.');
    }
    setLoadingRoomId(null);
  }

  function handleReserveDirectOnWhatsApp() {
    if (!guestName.trim()) {
      setIsSuccess(false);
      setMessage('Please enter your name before sending enquiry.');
      return;
    }
    if (isNightly && (!checkIn || !checkOut)) {
      setIsSuccess(false);
      setMessage('Please select your check-in and check-out dates.');
      return;
    }
    if (isNightly && new Date(checkOut) <= new Date(checkIn)) {
      setIsSuccess(false);
      setMessage('Check-out date must be after check-in date.');
      return;
    }
    setMessage('');
    setIsSuccess(false);

    // Canonical default number is +2348065373747; merchant-specific phone overrides if valid
    const rawPhone = data.whatsappPhone || '2348065373747';
    let cleanPhone = String(rawPhone).replace(/[^\d+]/g, '');
    if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.substring(1);
    if (cleanPhone.startsWith('0')) cleanPhone = '234' + cleanPhone.substring(1);
    if (!cleanPhone || cleanPhone === '2348067154233' || cleanPhone === '2348000000000') {
      cleanPhone = '2348065373747';
    }

    const lines = [
      `🏨 *STAY & HOTEL BOOKING ENQUIRY*`,
      `--------------------------------`,
      `📍 *Property:* ${data.name} (${data.stayCategory || 'Stay'})`,
      `🗺️ *Area:* ${data.neighborhood || data.address || 'Calabar'}`,
      `👤 *Guest:* ${guestName.trim()}${guestPhone.trim() ? ` (${guestPhone.trim()})` : ''}`,
      `👥 *Guests:* ${guestsCount}`,
      ...(isNightly
        ? [
            `📅 *Check-in:* ${checkIn}`,
            `📅 *Check-out:* ${checkOut} (${nightsCount} ${nightsCount === 1 ? 'night' : 'nights'})`,
            `💰 *Rate:* ₦${basePrice.toLocaleString()}/night · *Total:* ₦${calculatedTotal.toLocaleString()}`,
          ]
        : [`💰 *Rate:* ₦${basePrice.toLocaleString()} / ${pricePeriod}`]),
      `--------------------------------`,
      `Hello! I found your property on 9jaLive and would like to enquire about room availability and arrangements. Thank you!`,
    ];

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(waUrl, '_blank');
  }

  async function handleDeleteListing() {
    if (!confirm('Are you sure you want to delete this stay listing?')) return;
    setDeleting(true);
    const res = await deleteUniversalStay(data.id);
    setDeleting(false);
    if (res.error) {
      setMessage(res.error);
      return;
    }
    router.push('/stay');
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <p className="text-sm text-slate-500 font-bold">Stay not found.</p>
        <Link href="/stay" className="mt-4 inline-block text-sm font-bold text-teal-700 hover:underline">
          ← Back to Stays
        </Link>
      </div>
    );
  }

  const amenitiesList: string[] = Array.isArray(data.amenities) ? data.amenities : [];

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 space-y-6 px-2 sm:px-4 animate-in fade-in duration-500 pb-24">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/stay"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Stays
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/stay/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> List a Stay
          </Link>

          {!data.isHotelOrg && data.canManage && (
            <button
              type="button"
              onClick={handleDeleteListing}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete Listing
            </button>
          )}
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="relative aspect-video sm:aspect-[21/9] bg-slate-100 overflow-hidden">
          <FallbackImg
            src={allPhotos[activePhotoIdx] || DEFAULT_STAY_IMAGE}
            alt={data.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider">
              {data.stayCategory || 'Stay'}
            </span>
            {data.hasPowerGuarantee && (
              <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black inline-flex items-center gap-1 shadow-sm">
                <Zap className="w-3.5 h-3.5 fill-slate-950" /> 24/7 Power
              </span>
            )}
          </div>
        </div>

        {allPhotos.length > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2.5 overflow-x-auto no-scrollbar">
            {allPhotos.map((photoUrl, idx) => (
              <button
                key={`${photoUrl}-${idx}`}
                type="button"
                onClick={() => setActivePhotoIdx(idx)}
                className={cn(
                  'relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer',
                  activePhotoIdx === idx
                    ? 'border-teal-700 ring-2 ring-teal-600/30 scale-105'
                    : 'border-transparent opacity-70 hover:opacity-100'
                )}
              >
                <FallbackImg src={photoUrl} alt={`${data.name} ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Grid: Left Details + Right Booking Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Property Info, Specs, Amenities, Rooms */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {data.name}
                  </h1>
                  {typeof data.stars === 'number' && data.stars > 0 && (
                    <div className="flex items-center text-amber-400">
                      {Array.from({ length: data.stars }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 font-bold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>{data.neighborhood}</span>
                  {data.address && data.address !== data.neighborhood && (
                    <span className="text-slate-400 font-medium">· {data.address}</span>
                  )}
                </p>
              </div>

              {targetOrgId && (displayScore !== null || totalReviewsCount > 0 ? (
                <a
                  href="#reviews"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-2 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 px-3 py-1.5 rounded-2xl transition-all cursor-pointer group shrink-0"
                >
                  <span className="w-8 h-8 rounded-xl bg-teal-800 group-hover:bg-teal-900 text-white font-black text-xs flex items-center justify-center transition-colors">
                    {displayScore ? displayScore.toFixed(1) : (avgRating ? avgRating.toFixed(1) : '5.0')}
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-black text-teal-950 leading-none">Verified Rating</p>
                    <p className="text-[10px] text-teal-700 font-bold mt-0.5">
                      {totalReviewsCount > 0
                        ? `${totalReviewsCount} ${totalReviewsCount === 1 ? 'review' : 'reviews'}`
                        : 'Write a review'}
                    </p>
                  </div>
                </a>
              ) : (
                <a
                  href="#reviews"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 px-3 py-1.5 rounded-2xl transition-all cursor-pointer group shrink-0"
                >
                  <span className="w-8 h-8 rounded-xl bg-slate-200 group-hover:bg-teal-800 text-slate-700 group-hover:text-white font-black text-xs flex items-center justify-center transition-colors">
                    <Star className="w-4 h-4 fill-current" />
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 group-hover:text-teal-950 leading-none">Reviews</p>
                    <p className="text-[10px] text-slate-500 group-hover:text-teal-700 font-bold mt-0.5">Write a review</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Host / Attribution Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-800/10 text-teal-800 flex items-center justify-center">
                  {data.hostType === 'PERSONAL' ? (
                    <UserIcon className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">
                    Hosted by {data.hostName || data.name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {data.hostType === 'PERSONAL'
                      ? 'Verified Individual Host on CityStay'
                      : 'Verified Hospitality Partner'}
                  </p>
                </div>
              </div>

              {/* Property Specs Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
                {data.bedrooms !== undefined && (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 inline-flex items-center gap-1">
                    <BedDouble className="w-3.5 h-3.5 text-slate-500" />
                    {data.bedrooms} {data.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
                  </span>
                )}
                {data.bathrooms !== undefined && (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 inline-flex items-center gap-1">
                    <Bath className="w-3.5 h-3.5 text-slate-500" />
                    {data.bathrooms} {data.bathrooms === 1 ? 'Bath' : 'Baths'}
                  </span>
                )}
                {data.maxGuests !== undefined && (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    Up to {data.maxGuests} guests
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {data.description && (
              <div className="pt-3 border-t border-slate-100">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  About this stay
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {data.description}
                </p>
              </div>
            )}

            {/* Amenities */}
            {amenitiesList.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Included Amenities & Perks
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {amenitiesList.map((amenity) => (
                    <div
                      key={amenity}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-800"
                    >
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span className="truncate">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* HotelOS Rooms List (if this is a Hotel with configured rooms) */}
          {rooms.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-black text-slate-900 text-lg">
                  Available Rooms ({rooms.length})
                </h2>
                {isHotelOSEnabled && isCheckingAvailability && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking dates…
                  </span>
                )}
              </div>
              {rooms.map((r) => {
                const avail = availabilityMap[r.id];
                const hasDates = Boolean(checkIn && checkOut && new Date(checkOut) > new Date(checkIn));
                const isOutOfOrder = r.status === 'OUT_OF_ORDER';
                const isUnavailable = isHotelOSEnabled && hasDates && avail && !avail.available;
                const isAvailable = isHotelOSEnabled && hasDates && avail && avail.available;
                const roomTotal = (avail?.totalPrice ?? (Number(r.baseRate) || 0) * nightsCount);

                return (
                  <div
                    key={r.id}
                    className={cn(
                      "bg-white p-5 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs",
                      isUnavailable ? "border-rose-200/90 bg-rose-50/20" : "border-slate-200/90"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-slate-900 text-base">{r.type} Room</p>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">
                          Room #{r.roomNumber}
                        </span>

                        {isHotelOSEnabled && (
                          <>
                            {isOutOfOrder ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertCircle className="w-3 h-3" /> Out of Order
                              </span>
                            ) : isAvailable ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3 stroke-[3]" /> Available
                              </span>
                            ) : isUnavailable ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3 h-3" /> {avail?.reason || 'Booked for dates'}
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                      <p className="text-sm font-black text-teal-800 mt-1.5">
                        {fmt(r.baseRate)}{' '}
                        <span className="text-xs text-slate-400 font-semibold">/ night</span>
                        {nightsCount > 1 && (
                          <span className="ml-2 text-xs font-black text-slate-700">
                            · {fmt(roomTotal)} total ({nightsCount} nights)
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      disabled={loadingRoomId === r.id || isUnavailable || isOutOfOrder}
                      onClick={() => handleBookHotelRoom(r)}
                      className={cn(
                        "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-white rounded-xl text-xs font-black transition-all disabled:opacity-50 active:scale-95 cursor-pointer shrink-0",
                        isOutOfOrder
                          ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                          : isUnavailable
                          ? "bg-rose-100 text-rose-700 border border-rose-200 cursor-not-allowed"
                          : isHotelOSEnabled
                          ? "bg-teal-700 hover:bg-teal-800 shadow-md shadow-teal-700/20"
                          : "bg-[#25D366] hover:bg-[#20ba59] shadow-md shadow-emerald-600/20"
                      )}
                    >
                      {isOutOfOrder ? (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          Out of Order
                        </>
                      ) : isUnavailable ? (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          Booked for Dates
                        </>
                      ) : isHotelOSEnabled ? (
                        <>
                          <Check className="w-4 h-4" />
                          {loadingRoomId === r.id ? 'Reserving Room…' : 'Reserve Room (HotelOS)'}
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          {loadingRoomId === r.id ? 'Opening WhatsApp…' : 'Enquire via WhatsApp'}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Reservation & Price Calculator Card */}
        <div className="lg:col-span-5 lg:sticky lg:top-20">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-lg space-y-5">
            <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
              <div>
                {basePrice > 0 ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-950">{fmt(basePrice)}</span>
                    <span className="text-xs font-bold text-slate-500">/ {pricePeriod}</span>
                  </div>
                ) : (
                  <span className="text-lg font-black text-slate-900">Select Dates to Book</span>
                )}
              </div>
              {isHotelOSEnabled ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                  <Zap className="w-3 h-3 text-teal-600" /> HotelOS Instant Reservation
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <MessageSquare className="w-3 h-3 text-[#25D366]" /> Direct WhatsApp Enquiry
                </span>
              )}
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Your Full Name *
                </label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter guest full name"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    WhatsApp / Phone
                  </label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="0803 123 4567"
                      className="w-full pl-8 pr-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Guests
                  </label>
                  <select
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={String(n)}>
                        {n} {n === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isNightly && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Check-in *
                    </label>
                    <input
                      type="date"
                      className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Check-out *
                    </label>
                    <input
                      type="date"
                      className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Price Calculation Box */}
            {basePrice > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                {isNightly ? (
                  <>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                      <span>
                        {fmt(basePrice)} × {nightsCount} {nightsCount === 1 ? 'night' : 'nights'}
                      </span>
                      <span className="font-bold text-slate-900">{fmt(calculatedTotal)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-black text-slate-950">
                      <span>Estimated Total</span>
                      <span className="text-teal-800">{fmt(calculatedTotal)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between text-sm font-black text-slate-950">
                    <span>Rate per {pricePeriod}</span>
                    <span className="text-teal-800">{fmt(basePrice)}</span>
                  </div>
                )}
              </div>
            )}

            {message && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-xl text-xs font-bold border",
                isSuccess
                  ? "bg-teal-50 border-teal-200 text-teal-800"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              )}>
                <span>{isSuccess ? '✓' : '⚠'}</span>
                <span>{message}</span>
              </div>
            )}

            {/* Primary Booking CTA */}
            {rooms.length === 0 ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleReserveDirectOnWhatsApp}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  Enquire on WhatsApp
                </button>
                <p className="text-[11px] text-center text-slate-400 font-medium">
                  Opens a direct conversation to arrange booking with the host. Does not confirm payment.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-center text-slate-500 font-bold">
                  Enter your dates above, then click <strong className="text-slate-800">{isHotelOSEnabled ? 'Reserve Room (HotelOS)' : 'Enquire via WhatsApp'}</strong> on any room on the left.
                </p>
                {!isHotelOSEnabled && (
                  <p className="text-[10.5px] text-center text-slate-400">
                    This hotel accepts direct bookings via WhatsApp. Opening WhatsApp sends an enquiry and does not confirm a reservation.
                  </p>
                )}
              </div>
            )}

            {data.bookingUrl && (
              <a
                href={data.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition-all"
              >
                <span>Book on Host Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Reviews & Community Feedback Section */}
      {targetOrgId && (
        <div className="pt-2">
          <BusinessReviewsSection
            organizationId={targetOrgId}
            organizationName={data.name}
            initialReviews={reviewsBundle?.reviews || []}
            initialDistribution={
              reviewsBundle?.distribution || {
                averageRating: null,
                totalReviews: 0,
                counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              }
            }
            initialMyReview={reviewsBundle?.myReview || null}
            isManager={isManager}
            isLoggedIn={isLoggedIn}
          />
        </div>
      )}
    </div>
  );
}