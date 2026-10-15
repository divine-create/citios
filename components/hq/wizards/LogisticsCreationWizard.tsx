'use client';

import React, { useState } from 'react';
import { 
  Truck, Check, ArrowRight, ArrowLeft, AlertCircle, 
  MapPin, Phone, MessageSquare, Globe, Plus, Trash2, Shield, Navigation
} from 'lucide-react';
import { createHQManagedBusiness, CreateHQManagedBusinessPayload } from '@/lib/actions/hq-managed-business';
import MediaLinkOrUploadInput from '../MediaLinkOrUploadInput';

interface LogisticsCreationWizardProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const FLEET_TYPES = [
  'Motorcycle Express Dispatch',
  'Delivery Vans & Mini-Buses',
  'Heavy Haulage Trucks (Beds & Containers)',
  'Cold Chain Perishable Food Fleet',
];

const COVERAGE_AREAS = [
  'Calabar Intra-City (Municipal & South)',
  'State-Wide (Calabar, Ikom, Ogoja)',
  'Inter-State South-South (Uyo, PH, Calabar)',
];

export default function LogisticsCreationWizard({ onSuccess, onCancel }: LogisticsCreationWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fleet Profile
  const [name, setName] = useState('');
  const [fleetType, setFleetType] = useState('Motorcycle Express Dispatch');
  const [coverageArea, setCoverageArea] = useState('Calabar Intra-City (Municipal & South)');
  const [fleetSize, setFleetSize] = useState('12 Dispatch Bikes, 2 Vans');
  const [description, setDescription] = useState('');

  // Depot Location & Contacts
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [latitude, setLatitude] = useState<number>(4.9757);
  const [longitude, setLongitude] = useState<number>(8.3417);

  // Media
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Delivery Tiers
  const [baseRate, setBaseRate] = useState('1500');
  const [expressRate, setExpressRate] = useState('2500');
  const [interstateRate, setInterstateRate] = useState('6000');
  const [customTiers, setCustomTiers] = useState<Array<{ name: string; price: number; description: string }>>([
    { name: 'Same-Day Intra-Calabar Dispatch', price: 1500, description: 'Pickup and delivery within 3 hours' },
    { name: '1-Hour Priority Express Courier', price: 2500, description: 'Dedicated direct rider dispatch' },
    { name: 'Calabar to Uyo Interstate Waybill', price: 6000, description: 'Depot-to-depot or doorstep' },
  ]);

  // Single Tier Adder
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState('');
  const [newTierDesc, setNewTierDesc] = useState('');

  const handleAddTier = () => {
    if (!newTierName.trim()) return;
    const price = Number(newTierPrice) || 0;
    setCustomTiers(prev => [
      ...prev,
      {
        name: newTierName.trim(),
        price,
        description: newTierDesc.trim(),
      }
    ]);
    setNewTierName('');
    setNewTierPrice('');
    setNewTierDesc('');
  };

  const handleRemoveTier = (index: number) => {
    setCustomTiers(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Logistics business name is required.');
      setStep(1);
      return;
    }
    if (!address.trim()) {
      setError('Central dispatch hub address is required.');
      setStep(2);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateHQManagedBusinessPayload = {
        name: name.trim(),
        type: 'LOGISTICS',
        storeCategory: fleetType,
        description: description.trim() || `${name} provides reliable logistics across ${coverageArea}. Fleet capability: ${fleetSize}.`,
        address: address.trim(),
        latitude,
        longitude,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        website: website.trim(),
        logoUrl: logoUrl.trim(),
        coverUrl: coverUrl.trim(),
        videos: videoUrl.trim() ? [videoUrl.trim()] : [],
        fleetType,
        diningOptions: [coverageArea, fleetSize],
        initialItems: customTiers.map(t => ({
          name: t.name,
          price: t.price,
          description: t.description,
          category: 'Delivery Tier',
        })),
      };

      const res = await createHQManagedBusiness(payload);
      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to onboard logistics company');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-orange-100 text-xs">
        {[
          { s: 1, title: '1. Fleet Profile' },
          { s: 2, title: '2. Hub & Dispatch' },
          { s: 3, title: '3. Fleet Media' },
          { s: 4, title: '4. Waybill Pricing' },
        ].map(({ s, title }) => (
          <button
            key={s}
            onClick={() => setStep(s as any)}
            className={`font-bold pb-1 flex items-center gap-1.5 transition-all ${
              step === s 
                ? 'text-orange-600 border-b-2 border-orange-600' 
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

      {/* STEP 1: Fleet Profile */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Logistics / Haulage Company Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Calabar Swift Couriers, Cross River Express Logistics, SafeWay Haulage"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-bold px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Primary Fleet Capability
              </label>
              <select
                value={fleetType}
                onChange={(e) => setFleetType(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 bg-white"
              >
                {FLEET_TYPES.map(ft => <option key={ft} value={ft}>{ft}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Operating Coverage Scope
              </label>
              <select
                value={coverageArea}
                onChange={(e) => setCoverageArea(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 bg-white"
              >
                {COVERAGE_AREAS.map(ca => <option key={ca} value={ca}>{ca}</option>)}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100">
            <label className="block text-[11px] font-bold text-orange-900 uppercase tracking-wider mb-1">
              Active Fleet Assets Count
            </label>
            <input
              type="text"
              placeholder="e.g. 15 Dispatch Bikes, 3 Mini-Buses, 2 Haulage Trucks"
              value={fleetSize}
              onChange={(e) => setFleetSize(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Company Background & Reliability Summary
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Cross River's most dependable express delivery team. Fast turnaround, trained riders, and secure goods handling..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>
        </div>
      )}

      {/* STEP 2: Hub Location & Dispatch */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Central Sorting Hub / Depot Address *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. Plot 12 Industrial Estate, Off Murtala Muhammed Highway, Calabar"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-600 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Dispatch Telephone Hotline
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  placeholder="e.g. 08023456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>WhatsApp Real-Time Dispatch Line *</span>
                <span className="text-[10px] text-emerald-600 font-bold">Rider Coordination</span>
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

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Website / Tracking Portal Link
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="url"
                placeholder="e.g. https://swiftcouriers.ng"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Fleet Media */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Logistics Company Logo
            </label>
            <MediaLinkOrUploadInput
              label="Company Logo"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="Paste logo URL or upload file"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hero Depot / Fleet Banner
            </label>
            <MediaLinkOrUploadInput
              label="Depot Banner"
              value={coverUrl}
              onChange={setCoverUrl}
              placeholder="Paste wide fleet or depot banner URL"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Operations Video or Reel (YouTube / Vimeo)
            </label>
            <input
              type="url"
              placeholder="e.g. https://www.youtube.com/watch?v=sampleFleetVideo"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full text-xs px-4 py-3 rounded-2xl border border-slate-200"
            />
          </div>
        </div>
      )}

      {/* STEP 4: Waybill Rates & Delivery Tiers */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Quick Rate Config */}
          <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-3">
            <span className="text-xs font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1.5">
              <Navigation size={14} className="text-orange-600" />
              + Add Custom Delivery Waybill Tier
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Tier Title (e.g. Calabar Express 1h)"
                value={newTierName}
                onChange={(e) => setNewTierName(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white sm:col-span-2"
              />
              <input
                type="number"
                placeholder="Rate (₦)"
                value={newTierPrice}
                onChange={(e) => setNewTierPrice(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scope & SLA (e.g. Doorstep delivery under 60 mins)"
                value={newTierDesc}
                onChange={(e) => setNewTierDesc(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
              <button
                type="button"
                onClick={handleAddTier}
                className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
              >
                Add Tier
              </button>
            </div>
          </div>

          {/* Delivery Tiers List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Configured Delivery Tiers ({customTiers.length} options)
              </span>
              <span className="text-[11px] text-slate-500">Waybill fares auto-quoted on CityOS logistics</span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {customTiers.map((tier, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-orange-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900">{tier.name}</span>
                      <p className="text-[11px] text-slate-500">{tier.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-orange-700">₦{tier.price.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove tier"
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
            className="px-6 py-2.5 rounded-full bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition-all flex items-center gap-1.5 shadow-md shadow-orange-600/20"
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
            {isSubmitting ? 'Onboarding Logistics...' : 'Complete & Launch Fleet'}
          </button>
        )}
      </div>
    </div>
  );
}
