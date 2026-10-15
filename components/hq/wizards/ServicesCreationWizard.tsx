'use client';

import React, { useState } from 'react';
import { 
  Wrench, Check, ArrowRight, ArrowLeft, AlertCircle, 
  MapPin, Phone, MessageSquare, Globe, Plus, Trash2, Clock, Sparkles, Scissors
} from 'lucide-react';
import { createHQManagedBusiness, CreateHQManagedBusinessPayload } from '@/lib/actions/hq-managed-business';
import MediaLinkOrUploadInput from '../MediaLinkOrUploadInput';

interface ServicesCreationWizardProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const SERVICE_DOMAINS = [
  'Hair Salon, Barbing & Grooming',
  'Spa, Massage & Wellness',
  'Auto Mechanic & Car Detailing',
  'Laundry, Dry Cleaning & Alterations',
  'Tailoring & Bespoke Fashion Design',
  'Home Electrical, AC & Plumbing Repairs',
  'Photography, Studio Media & Videography',
];

export default function ServicesCreationWizard({ onSuccess, onCancel }: ServicesCreationWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Business Details
  const [name, setName] = useState('');
  const [serviceDomain, setServiceDomain] = useState('Hair Salon, Barbing & Grooming');
  const [deliveryModel, setDeliveryModel] = useState<'STUDIO' | 'MOBILE' | 'BOTH'>('BOTH');
  const [description, setDescription] = useState('');

  // Location & Contacts
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

  // Services Menu
  const [bulkText, setBulkText] = useState('');
  const [services, setServices] = useState<Array<{
    name: string;
    durationMinutes: number;
    price: number;
    description?: string;
  }>>([
    { name: 'Executive Haircut & Hot Towel Treatment', durationMinutes: 45, price: 5000, description: 'Precision fade, beard shaping and refreshing hot towel' },
    { name: 'Beard Sculpting & Nourishing Oil', durationMinutes: 25, price: 2500, description: 'Organic beard wash and razor precision lining' },
  ]);

  // Single Service Adder
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('45');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');

  const handleParseBulkServices = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: typeof services = [];

    for (const line of lines) {
      const parts = line.split(/[-–:]/).map(p => p.trim());
      if (parts.length >= 2) {
        const sName = parts[0];
        const priceNum = parts[1].replace(/,/g, '').match(/\d+/);
        const price = priceNum ? Number(priceNum[0]) : 0;
        const durNum = parts[2] ? parts[2].match(/\d+/) : null;
        const duration = durNum ? Number(durNum[0]) : 45;
        const desc = parts[3] || '';

        parsed.push({
          name: sName,
          durationMinutes: duration,
          price,
          description: desc,
        });
      }
    }

    if (parsed.length > 0) {
      setServices(prev => [...prev, ...parsed]);
      setBulkText('');
    }
  };

  const handleAddSingleService = () => {
    if (!newServiceName.trim()) return;
    const price = Number(newServicePrice) || 0;
    const duration = Number(newServiceDuration) || 45;
    setServices(prev => [
      ...prev,
      {
        name: newServiceName.trim(),
        durationMinutes: duration,
        price,
        description: newServiceDesc.trim() || undefined,
      }
    ]);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDesc('');
  };

  const handleRemoveService = (index: number) => {
    setServices(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Business / Studio name is required.');
      setStep(1);
      return;
    }
    if (!address.trim()) {
      setError('Studio / Workshop address is required.');
      setStep(2);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateHQManagedBusinessPayload = {
        name: name.trim(),
        type: 'SERVICES',
        storeCategory: serviceDomain,
        description: description.trim() || `${name} delivers premier ${serviceDomain} in Calabar. Booking available for studio visits and mobile dispatch.`,
        address: address.trim(),
        latitude,
        longitude,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        website: website.trim(),
        logoUrl: logoUrl.trim(),
        coverUrl: coverUrl.trim(),
        videos: videoUrl.trim() ? [videoUrl.trim()] : [],
        serviceType: serviceDomain,
        initialItems: services.map(s => ({
          name: s.name,
          price: s.price,
          durationMinutes: s.durationMinutes,
          description: s.description,
          category: serviceDomain,
        })),
      };

      const res = await createHQManagedBusiness(payload);
      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to onboard service provider');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Progress (Sticky top) */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center justify-between w-full min-w-max gap-4">
          {[
            { s: 1, title: '1. Studio Profile' },
            { s: 2, title: '2. Workshop & Contacts' },
            { s: 3, title: '3. Showcase Media' },
            { s: 4, title: '4. Service Menu & Rates' },
          ].map(({ s, title }) => (
            <button
              key={s}
              onClick={() => setStep(s as any)}
              className={`font-bold pb-1 flex items-center gap-1.5 transition-all ${
                step === s 
                  ? 'text-purple-400 border-b-2 border-purple-400' 
                  : step > s 
                  ? 'text-emerald-400' 
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              {step > s ? <Check size={14} /> : null}
              {title}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 text-slate-100">
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Studio Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Studio / Business Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Executive Cuts Barbershop, Calabar Glow Spa, Prime Auto Mechanics"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm font-bold px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Service Domain & Specialty
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SERVICE_DOMAINS.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => setServiceDomain(domain)}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      serviceDomain === domain
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="block text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-2">
                Service Delivery Model
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'STUDIO', label: 'Studio Visit Only' },
                  { id: 'MOBILE', label: 'Home Service Dispatch' },
                  { id: 'BOTH', label: 'Both Studio & Mobile' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDeliveryModel(opt.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      deliveryModel === opt.id
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Bio & Brand Backstory
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Master grooming and relaxation specialists with over 10 years experience serving Calabar residents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Location & Contacts */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Studio / Workshop Physical Address *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 14 Ndidem Usang Iso (Marian) Road, Calabar"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-sm pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Appointment Hotline Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    placeholder="e.g. 08034567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>WhatsApp Booking & Inquiry Line *</span>
                  <span className="text-[10px] text-emerald-400 font-bold">Concierge Alerts</span>
                </label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    placeholder="e.g. 08123456789"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 placeholder:text-emerald-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Website / Social Portfolio Link
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="url"
                  placeholder="e.g. https://instagram.com/executivecutscalabar"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Showcase Media */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Studio Brand Logo
              </label>
              <MediaLinkOrUploadInput
                label="Studio Logo"
                value={logoUrl}
                onChange={setLogoUrl}
                placeholder="Paste logo URL or upload file"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Hero Studio Banner / Workspace Showcase
              </label>
              <MediaLinkOrUploadInput
                label="Hero Banner"
                value={coverUrl}
                onChange={setCoverUrl}
                placeholder="Paste wide studio photo URL or upload banner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Work Showcase Video / Reel Link (YouTube, Vimeo, TikTok)
              </label>
              <input
                type="url"
                placeholder="e.g. https://www.youtube.com/watch?v=sampleBarberReel"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full text-xs px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Service Menu & Rates */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Bulk Text Parser */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-400" />
                  Fast Bulk Service Menu Parser
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Format: Service - Price(₦) - Mins - Notes</span>
              </div>
              <textarea
                rows={3}
                placeholder={`Signature Fade & Beard Dye - 6500 - 60 - Clean skin fade with organic black beard enhancement
Deep Cleansing Facial Treatment - 8000 - 45 - Exfoliation, steam and extraction
Full Body Swedish Massage - 15000 - 60 - Therapeutic tension relief with lavender oil
Full Vehicle Computer Diagnostics - 10000 - 30 - OBD2 scanning and fault clearing`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full text-xs font-mono p-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={handleParseBulkServices}
                className="mt-2 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} /> Parse Lines into Service Catalog
              </button>
            </div>

            {/* Add Single Service */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                + Add Individual Service Offering
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Service Name"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 sm:col-span-2"
                />
                <input
                  type="number"
                  placeholder="Duration (mins)"
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(e.target.value)}
                  className="text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                />
                <input
                  type="number"
                  placeholder="Rate (₦)"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  className="text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Description / What's included (optional)"
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  className="flex-1 text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={handleAddSingleService}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl transition-all"
                >
                  Add Service
                </button>
              </div>
            </div>

            {/* Services List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Configured Services ({services.length} items)
                </span>
                <span className="text-[11px] text-slate-500">Auto-saved to CityOS Service Catalog</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {services.map((srv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-sm text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <span className="font-bold text-white">{srv.name}</span>
                        <p className="text-[11px] text-slate-400">
                          {srv.durationMinutes} mins {srv.description ? `• ${srv.description}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-purple-400">₦{srv.price.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(idx)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove service"
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
      </div>

      {/* Footer Navigation (Sticky bottom of wizard) */}
      <div className="sticky bottom-0 z-10 bg-slate-950/95 backdrop-blur-md px-6 py-3.5 border-t border-slate-800 flex items-center justify-between shrink-0">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((step - 1) as any)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((step + 1) as any)}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/20"
          >
            Continue <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? 'Onboarding Provider...' : 'Complete & Launch Studio'}
          </button>
        )}
      </div>
    </div>
  );
}
