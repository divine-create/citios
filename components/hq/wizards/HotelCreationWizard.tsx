'use client';

import React, { useState } from 'react';
import { 
  Hotel, Check, ArrowRight, ArrowLeft, AlertCircle, 
  Clock, MapPin, Phone, MessageSquare, Globe, Plus, Trash2, ShieldCheck, Sparkles, BedDouble
} from 'lucide-react';
import { createHQManagedBusiness, CreateHQManagedBusinessPayload } from '@/lib/actions/hq-managed-business';
import MediaLinkOrUploadInput from '../MediaLinkOrUploadInput';

interface HotelCreationWizardProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const PROPERTY_TYPES = [
  'Luxury 5-Star Hotel & Resort',
  'Executive Business Suites',
  'Boutique Resort & Spa',
  'Serviced Extended-Stay Apartments',
  'Budget Lodge & Guest House',
];

const HOTEL_AMENITIES = [
  '24/7 Guaranteed Power / Soundproof Generator',
  'High-Speed Fiber Wi-Fi',
  'Outdoor Swimming Pool',
  'Fitness Gym & Wellness Center',
  'Complimentary Breakfast Buffet',
  'Airport Shuttle Pickup / Dropoff',
  'Executive Lounge & On-Site Bar',
  'Conference & Banquet Hall',
  '24/7 Room Service & Armed Security',
];

export default function HotelCreationWizard({ onSuccess, onCancel }: HotelCreationWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Property Details
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState('Luxury 5-Star Hotel & Resort');
  const [starRating, setStarRating] = useState('4-Star Premium');
  const [checkInTime, setCheckInTime] = useState('2:00 PM');
  const [checkOutTime, setCheckOutTime] = useState('11:00 AM');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    '24/7 Guaranteed Power / Soundproof Generator',
    'High-Speed Fiber Wi-Fi',
    'Outdoor Swimming Pool',
    'Complimentary Breakfast Buffet',
  ]);
  const [description, setDescription] = useState('');

  // Location & Contacts
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [latitude, setLatitude] = useState<number>(4.9757);
  const [longitude, setLongitude] = useState<number>(8.3417);

  // Media
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Rooms Seeder
  const [rooms, setRooms] = useState<Array<{
    roomNumber: string;
    type: string;
    bedType: string;
    maxGuests: number;
    baseRate: number;
  }>>([
    { roomNumber: '101', type: 'Deluxe Room', bedType: 'King Size', maxGuests: 2, baseRate: 35000 },
    { roomNumber: '102', type: 'Executive Suite', bedType: 'King Size', maxGuests: 2, baseRate: 55000 },
    { roomNumber: '201', type: 'Presidential Suite', bedType: 'King Size + Jacuzzi', maxGuests: 4, baseRate: 120000 },
  ]);

  // Single Room Adder State
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomType, setNewRoomType] = useState('Deluxe Room');
  const [newRoomBed, setNewRoomBed] = useState('King Size');
  const [newRoomGuests, setNewRoomGuests] = useState(2);
  const [newRoomRate, setNewRoomRate] = useState('');

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleAddRoom = () => {
    if (!newRoomNumber.trim()) return;
    const rate = Number(newRoomRate) || 0;
    setRooms(prev => [
      ...prev,
      {
        roomNumber: newRoomNumber.trim(),
        type: newRoomType,
        bedType: newRoomBed,
        maxGuests: newRoomGuests,
        baseRate: rate,
      }
    ]);
    setNewRoomNumber('');
    setNewRoomRate('');
  };

  const handleRemoveRoom = (index: number) => {
    setRooms(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Hotel name is required.');
      setStep(1);
      return;
    }
    if (!address.trim()) {
      setError('Physical property address is required.');
      setStep(2);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateHQManagedBusinessPayload = {
        name: name.trim(),
        type: 'HOTEL',
        storeCategory: propertyType,
        description: description.trim() || `${name} is a premier ${starRating} property in Calabar featuring ${selectedAmenities.slice(0, 3).join(', ')}.`,
        address: address.trim(),
        latitude,
        longitude,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim(),
        website: website.trim(),
        logoUrl: logoUrl.trim(),
        coverUrl: coverUrl.trim(),
        videos: videoUrl.trim() ? [videoUrl.trim()] : [],
        starRating,
        checkInTime,
        checkOutTime,
        amenities: selectedAmenities,
        initialRooms: rooms.map(r => ({
          roomNumber: r.roomNumber,
          type: r.type,
          baseRate: r.baseRate,
          bedType: r.bedType,
          maxGuests: r.maxGuests,
        })),
      };

      const res = await createHQManagedBusiness(payload);
      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to onboard hotel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Step Progress Bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-blue-100 text-xs">
        {[
          { s: 1, title: '1. Hospitality Profile' },
          { s: 2, title: '2. Location & Frontdesk' },
          { s: 3, title: '3. Property Visuals' },
          { s: 4, title: '4. Rooms & Nightly Rates' },
        ].map(({ s, title }) => (
          <button
            key={s}
            onClick={() => setStep(s as any)}
            className={`font-bold pb-1 flex items-center gap-1.5 transition-all ${
              step === s 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : step > s 
                ? 'text-emerald-600' 
                : 'text-slate-400'
            }`}
          >
            {step > s ? <Check size={14} /> : null}
            {title}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Property Identity & Hospitality Profile */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Hotel / Resort Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Monty Suites & Golf Club, Transcorp Hotels Calabar, Channel View Hotel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-bold px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Hospitality Classification
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 bg-white"
              >
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Star / Class Rating
              </label>
              <select
                value={starRating}
                onChange={(e) => setStarRating(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 bg-white"
              >
                <option value="5-Star Luxury">5-Star Luxury</option>
                <option value="4-Star Premium">4-Star Premium</option>
                <option value="3-Star Comfort">3-Star Comfort</option>
                <option value="Luxury Boutique">Luxury Boutique</option>
                <option value="Executive Suites">Executive Suites</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
            <div>
              <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-1">
                Standard Check-In Time
              </label>
              <input
                type="text"
                placeholder="2:00 PM"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-1">
                Standard Check-Out Time
              </label>
              <input
                type="text"
                placeholder="11:00 AM"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Core Property Amenities (Select all available)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HOTEL_AMENITIES.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{amenity}</span>
                    {isSelected && <Check size={14} className="text-blue-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Hotel Description & Guest Experience
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Set in the quiet hills of Calabar, Monty Suites offers serene executive lodging, Olympic swimming, and world-class hospitality..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      )}

      {/* STEP 2: Location & Frontdesk Contacts */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Hotel Physical Address *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. Asikpo Ita Street, State Housing Estate, Calabar"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Frontdesk Telephone Line
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  placeholder="e.g. 08021234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Reservations WhatsApp Hotline *</span>
                <span className="text-[10px] text-emerald-600 font-bold">Booking Forwarding</span>
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-emerald-500 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  placeholder="e.g. 08123456789"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl border border-emerald-200 bg-emerald-50/20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Reservations Email
              </label>
              <input
                type="email"
                placeholder="e.g. reservations@montysuites.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-4 py-3 rounded-2xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Official Hotel Website (Optional)
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="url"
                  placeholder="e.g. https://montysuites.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl border border-slate-200"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Property Visuals & Virtual Tour */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hotel Crest / Logo
            </label>
            <p className="text-[11px] text-slate-500 mb-2">Official emblem displayed on room booking vouchers and invoices.</p>
            <MediaLinkOrUploadInput
              label="Hotel Crest / Logo"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="Paste logo URL from their website or upload image"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hero Facade / Exterior Cover Banner
            </label>
            <p className="text-[11px] text-slate-500 mb-2">High-resolution landscape shot of the hotel front or pool view.</p>
            <MediaLinkOrUploadInput
              label="Hotel Facade Cover Banner"
              value={coverUrl}
              onChange={setCoverUrl}
              placeholder="Paste high-res hotel photo URL or upload banner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Virtual Property Tour / Walkthrough Video (YouTube or Vimeo)
            </label>
            <p className="text-[11px] text-slate-500 mb-2">Gives traveling guests an interactive 360 preview of rooms and facilities.</p>
            <input
              type="url"
              placeholder="e.g. https://www.youtube.com/watch?v=sampleHotelTour"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full text-xs px-4 py-3 rounded-2xl border border-slate-200"
            />
          </div>
        </div>
      )}

      {/* STEP 4: Rooms, Suites & Nightly Rates */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Add Room Box */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <BedDouble size={14} className="text-blue-600" />
              + Add Room or Suite to Property
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Room # (e.g. 101)"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
              <select
                value={newRoomType}
                onChange={(e) => setNewRoomType(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Standard Room">Standard Room</option>
                <option value="Deluxe Room">Deluxe Room</option>
                <option value="Executive Suite">Executive Suite</option>
                <option value="Presidential Suite">Presidential Suite</option>
                <option value="Diplomatic Penthouse">Diplomatic Penthouse</option>
              </select>
              <select
                value={newRoomBed}
                onChange={(e) => setNewRoomBed(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="King Size">King Size</option>
                <option value="Queen Bed">Queen Bed</option>
                <option value="Double Twin">Double Twin</option>
              </select>
              <input
                type="number"
                placeholder="Rate (₦/night)"
                value={newRoomRate}
                onChange={(e) => setNewRoomRate(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <button
              type="button"
              onClick={handleAddRoom}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              + Add Room to Reservation Inventory
            </button>
          </div>

          {/* Seeded Rooms Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Initial Rooms Configured ({rooms.length} rooms)
              </span>
              <span className="text-[11px] text-slate-500">Nightly pricing in ₦ with PMS auto-sync</span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {rooms.map((room, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-mono font-black text-xs">
                      Room {room.roomNumber}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{room.type}</p>
                      <p className="text-[11px] text-slate-500">{room.bedType} • Max {room.maxGuests} Guests</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-blue-700">₦{room.baseRate.toLocaleString()}<span className="text-[10px] text-slate-400 font-normal">/night</span></span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRoom(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove room"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((step - 1) as any)}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((step + 1) as any)}
            className="px-6 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            Continue <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-8 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? 'Onboarding Hotel...' : 'Complete & Launch Hotel'}
          </button>
        )}
      </div>
    </div>
  );
}
