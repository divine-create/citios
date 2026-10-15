'use client';

import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, Hotel, ShoppingBag, Wrench, Truck, GraduationCap, 
  X, AlertCircle, FileText, CheckCircle2, MapPin, Phone, MessageSquare, 
  Plus, Trash2, Sparkles, Rocket, Loader2, ArrowRight
} from 'lucide-react';
import { 
  createHQManagedBusiness, 
  CreateHQManagedBusinessPayload, 
  bulkImportHQManagedBusinesses 
} from '@/lib/actions/hq-managed-business';
import MediaLinkOrUploadInput from './MediaLinkOrUploadInput';

interface CreateBusinessWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialVertical?: string;
}

interface StarterItem {
  id: string;
  name: string;
  price: number | string;
  category?: string;
}

const VERTICAL_METAS = [
  {
    type: 'RESTAURANT',
    label: 'Restaurant & Dining',
    shortLabel: 'Restaurant',
    icon: UtensilsCrossed,
    accentBar: 'bg-amber-500',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    iconBg: 'bg-amber-500/15 border border-amber-500/40 text-amber-400',
    activeTab: 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-lg shadow-amber-500/20',
    categoryPlaceholder: 'e.g. Native Bukka, Continental Grill, Fast Casual',
    itemHeader: 'Starter Menu Dishes (Ready for resident orders)',
    itemLabel: 'Dish Name',
    defaultCategory: 'Native Delicacies',
    starterDefaults: [
      { id: '1', name: 'Afang Soup & Pounded Yam', price: 3500, category: 'Native Soups' },
      { id: '2', name: 'Smoky Firewood Jollof & Chicken', price: 2800, category: 'Rice & Grills' },
    ],
  },
  {
    type: 'HOTEL',
    label: 'Hotel & Hospitality',
    shortLabel: 'Hotel',
    icon: Hotel,
    accentBar: 'bg-blue-500',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
    iconBg: 'bg-blue-500/15 border border-blue-500/40 text-blue-400',
    activeTab: 'bg-blue-600 text-white font-black border-blue-500 shadow-lg shadow-blue-500/20',
    categoryPlaceholder: 'e.g. 4-Star Luxury, Executive Suites, Resort',
    itemHeader: 'Starter Room Types (Ready for resident bookings)',
    itemLabel: 'Room / Suite Type',
    defaultCategory: 'Deluxe Room',
    starterDefaults: [
      { id: '1', name: 'Deluxe King Room', price: 35000, category: 'Deluxe Room' },
      { id: '2', name: 'Executive Business Suite', price: 55000, category: 'Executive Suite' },
    ],
  },
  {
    type: 'RETAIL',
    label: 'Retail & Supermarket',
    shortLabel: 'Retail',
    icon: ShoppingBag,
    accentBar: 'bg-emerald-500',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    iconBg: 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400',
    activeTab: 'bg-emerald-600 text-white font-black border-emerald-500 shadow-lg shadow-emerald-500/20',
    categoryPlaceholder: 'e.g. Supermarket, Pharmacy, Electronics Boutique',
    itemHeader: 'Starter Shelf Products (Ready for checkout)',
    itemLabel: 'Product Name',
    defaultCategory: 'Groceries',
    starterDefaults: [
      { id: '1', name: 'Pure Soya Cooking Oil (5L)', price: 14500, category: 'Groceries' },
      { id: '2', name: 'Dangote Refined Sugar (1kg)', price: 2100, category: 'Groceries' },
    ],
  },
  {
    type: 'SERVICES',
    label: 'Services & Studio',
    shortLabel: 'Services',
    icon: Wrench,
    accentBar: 'bg-purple-500',
    badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
    iconBg: 'bg-purple-500/15 border border-purple-500/40 text-purple-400',
    activeTab: 'bg-purple-600 text-white font-black border-purple-500 shadow-lg shadow-purple-500/20',
    categoryPlaceholder: 'e.g. Barbing Salon, Wellness Spa, Auto Mechanic',
    itemHeader: 'Starter Services (Ready for appointments)',
    itemLabel: 'Service Name',
    defaultCategory: 'Grooming',
    starterDefaults: [
      { id: '1', name: 'Executive Haircut & Hot Towel Treatment', price: 4000, category: 'Grooming' },
      { id: '2', name: 'Beard Sculpting & Wash', price: 2500, category: 'Grooming' },
    ],
  },
  {
    type: 'LOGISTICS',
    label: 'Logistics Fleet',
    shortLabel: 'Logistics',
    icon: Truck,
    accentBar: 'bg-orange-500',
    badge: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
    iconBg: 'bg-orange-500/15 border border-orange-500/40 text-orange-400',
    activeTab: 'bg-orange-600 text-white font-black border-orange-500 shadow-lg shadow-orange-500/20',
    categoryPlaceholder: 'e.g. Express Bike Dispatch, Van Haulage',
    itemHeader: 'Starter Waybill Fares (Ready for parcel booking)',
    itemLabel: 'Delivery Tier Name',
    defaultCategory: 'Express Courier',
    starterDefaults: [
      { id: '1', name: 'Same-Day Intra-City Dispatch', price: 1500, category: 'Express Bike' },
      { id: '2', name: 'Cross River State-Wide Dispatch', price: 4500, category: 'Inter-City Van' },
    ],
  },
  {
    type: 'SCHOOL',
    label: 'School & Academy',
    shortLabel: 'School',
    icon: GraduationCap,
    accentBar: 'bg-indigo-500',
    badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
    iconBg: 'bg-indigo-500/15 border border-indigo-500/40 text-indigo-400',
    activeTab: 'bg-indigo-600 text-white font-black border-indigo-500 shadow-lg shadow-indigo-500/20',
    categoryPlaceholder: 'e.g. Nursery & Primary, Secondary College',
    itemHeader: 'Starter Tuition Schedules (Ready for enrolment)',
    itemLabel: 'Class Level',
    defaultCategory: 'Basic Education',
    starterDefaults: [
      { id: '1', name: 'Primary 1 Termly Basic Tuition', price: 120000, category: 'Elementary' },
      { id: '2', name: 'Secondary College Junior Tuition', price: 180000, category: 'Secondary' },
    ],
  },
];

const CALABAR_LANDMARKS = [
  'Marian Road, Calabar',
  'State Housing Estate, Calabar',
  'Calabar Mall / Cultural Centre',
  'Murtala Muhammed Highway, Calabar',
  'Diamond Hill, Calabar',
  'MCC Road, Calabar',
];

export default function CreateBusinessWizardModal({
  isOpen,
  onClose,
  onSuccess,
  initialVertical = 'RESTAURANT',
}: CreateBusinessWizardModalProps) {
  const [selectedVertical, setSelectedVertical] = useState(initialVertical);
  const [mode, setMode] = useState<'fast' | 'json'>('fast');

  // Fast Form State
  const [name, setName] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [address, setAddress] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [starterItems, setStarterItems] = useState<StarterItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // JSON batch mode states
  const [jsonInput, setJsonInput] = useState('');
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonResults, setJsonResults] = useState<{ succeeded: number; failed: number; errors: string[] } | null>(null);

  // Sync initial vertical
  useEffect(() => {
    if (initialVertical) {
      setSelectedVertical(initialVertical);
    }
  }, [initialVertical]);

  // Load starter items when vertical changes
  useEffect(() => {
    const meta = VERTICAL_METAS.find(t => t.type === selectedVertical) || VERTICAL_METAS[0];
    setStarterItems(meta.starterDefaults.map(d => ({ ...d })));
  }, [selectedVertical]);

  if (!isOpen) return null;

  const currentMeta = VERTICAL_METAS.find(t => t.type === selectedVertical) || VERTICAL_METAS[0];
  const CurrentIcon = currentMeta.icon;

  const handleItemChange = (id: string, field: 'name' | 'price' | 'category', value: string) => {
    setStarterItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: field === 'price' ? (Number(value) || value) : value,
        };
      }
      return item;
    }));
  };

  const handleAddItem = () => {
    const newId = String(Date.now());
    setStarterItems(prev => [
      ...prev,
      {
        id: newId,
        name: '',
        price: '',
        category: currentMeta.defaultCategory,
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setStarterItems(prev => prev.filter(item => item.id !== id));
  };

  const handleQuickLandmark = (landmark: string) => {
    setAddress(prev => prev ? `${prev}, ${landmark}` : landmark);
  };

  const handleSubmitFast = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Business name is required.');
      return;
    }
    if (!address.trim()) {
      setError('Physical location in Calabar is required.');
      return;
    }
    if (!whatsapp.trim()) {
      setError('WhatsApp hotline is required so customer orders & bookings can be forwarded.');
      return;
    }

    try {
      setIsSubmitting(true);
      const isHotel = selectedVertical === 'HOTEL';

      const payload: CreateHQManagedBusinessPayload = {
        name: name.trim(),
        type: selectedVertical,
        storeCategory: storeCategory.trim() || undefined,
        address: address.trim(),
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim(),
        coverUrl: coverUrl.trim() || undefined,
        logoUrl: coverUrl.trim() || undefined,
        description: `${name.trim()} is an active ${storeCategory.trim() || currentMeta.shortLabel} in Calabar, managed and verified by CityOS HQ.`,
        initialItems: !isHotel
          ? starterItems
              .filter(it => it.name.trim())
              .map(it => ({
                name: it.name.trim(),
                price: Number(it.price) || 0,
                category: it.category?.trim() || currentMeta.defaultCategory,
              }))
          : undefined,
        initialRooms: isHotel
          ? starterItems
              .filter(it => it.name.trim())
              .map((it, idx) => ({
                roomNumber: `${101 + idx}`,
                type: it.name.trim(),
                baseRate: Number(it.price) || 0,
                bedType: 'King Size',
                maxGuests: 2,
              }))
          : undefined,
      };

      const res = await createHQManagedBusiness(payload);
      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create business');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportJson = async () => {
    setJsonError(null);
    setJsonResults(null);
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array of businesses');
      setIsSubmittingJson(true);
      const results = await bulkImportHQManagedBusinesses(parsed);
      setJsonResults(results);
      if (results.succeeded > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON format');
    } finally {
      setIsSubmittingJson(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="relative w-full max-w-3xl h-[90vh] max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Vertical Accent Stripe */}
        <div className={`h-1.5 w-full shrink-0 ${currentMeta.accentBar}`} />

        {/* Pinned Modal Header */}
        <div className="bg-slate-950 px-5 sm:px-6 py-3.5 sm:py-4 text-white border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${currentMeta.iconBg}`}>
              <CurrentIcon size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${currentMeta.badge}`}>
                  FAST-TRACK ONBOARDING
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">60-Second Setup</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5 truncate">
                Onboard New {currentMeta.shortLabel}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMode(mode === 'fast' ? 'json' : 'fast')}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border border-slate-800 hover:border-slate-700 shadow-sm"
            >
              <FileText size={14} className="text-teal-400 shrink-0" />
              <span className="hidden sm:inline">{mode === 'fast' ? 'Raw JSON Batch' : 'Fast Setup'}</span>
              <span className="sm:hidden">{mode === 'fast' ? 'JSON' : 'Fast'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Vertical Selector Bar (Pinned) */}
        {mode === 'fast' && (
          <div className="bg-slate-950/95 border-b border-slate-800 px-4 py-2 overflow-x-auto scrollbar-none shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-1 pl-1">
                Type:
              </span>
              {VERTICAL_METAS.map((tab) => {
                const isSelected = selectedVertical === tab.type;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.type}
                    type="button"
                    onClick={() => setSelectedVertical(tab.type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? tab.activeTab
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <TabIcon size={13} />
                    <span>{tab.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-900 text-slate-100 p-5 sm:p-6">
          {mode === 'json' ? (
            /* JSON Bulk Import Mode */
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Paste JSON Array of Businesses
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Supported: RESTAURANT, HOTEL, RETAIL, SERVICES, LOGISTICS, SCHOOL
                  </span>
                </div>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  rows={12}
                  placeholder={`[
  {
    "name": "Freddy's Restaurant & Grill",
    "type": "RESTAURANT",
    "address": "90 Marian Road, Calabar",
    "phone": "08012345678",
    "whatsapp": "08123456789",
    "coverUrl": "https://images.unsplash.com/...",
    "initialItems": [
      { "name": "Afang Soup & Pounded Yam", "price": 3500, "category": "Native Soups" }
    ]
  }
]`}
                  className="w-full font-mono text-xs p-4 border border-slate-800 rounded-2xl bg-slate-950 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                />
              </div>

              {jsonError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{jsonError}</span>
                </div>
              )}

              {jsonResults && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <p className="font-bold text-emerald-400">✓ Successfully imported: {jsonResults.succeeded} businesses</p>
                  {jsonResults.failed > 0 && (
                    <p className="font-bold text-red-400">✗ Failed: {jsonResults.failed}</p>
                  )}
                  {jsonResults.errors.length > 0 && (
                    <div className="mt-2 text-red-400 max-h-32 overflow-y-auto space-y-1">
                      {jsonResults.errors.map((err, i) => <div key={i}>• {err}</div>)}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('fast')}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  Back to Fast Setup
                </button>
                <button
                  type="button"
                  disabled={isSubmittingJson || !jsonInput.trim()}
                  onClick={handleImportJson}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-teal-500/20"
                >
                  {isSubmittingJson ? 'Importing Batch...' : 'Execute JSON Import'}
                </button>
              </div>
            </div>
          ) : (
            /* Fast-Track 60-Second Form */
            <form onSubmit={handleSubmitFast} className="space-y-6">
              {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* SECTION 1: Identity & Location */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
                  <MapPin size={16} className="text-blue-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    1. Identity & Calabar Location
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={`e.g. Freddy's Grill, Channel View Hotel`}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Specialization / Concept
                    </label>
                    <input
                      type="text"
                      placeholder={currentMeta.categoryPlaceholder}
                      value={storeCategory}
                      onChange={(e) => setStoreCategory(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Physical Address in Calabar *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 90 Marian Road, Near Total Filling Station, Calabar"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                  
                  {/* Quick landmark chips */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Quick Landmarks:</span>
                    {CALABAR_LANDMARKS.slice(0, 4).map(lm => (
                      <button
                        key={lm}
                        type="button"
                        onClick={() => handleQuickLandmark(lm)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                      >
                        + {lm.split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Orders Hotline & Cover Media */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
                  <Phone size={16} className="text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    2. Orders Hotline & Visuals
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>WhatsApp Orders Hotline *</span>
                      <span className="text-[10px] text-emerald-400 font-bold">Live Order Forwarding</span>
                    </label>
                    <div className="relative">
                      <MessageSquare className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 08123456789"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 placeholder:text-emerald-700 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Phone Line (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="tel"
                        placeholder="e.g. 08021234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <MediaLinkOrUploadInput
                    label="Cover Image (Link or Upload)"
                    value={coverUrl}
                    onChange={setCoverUrl}
                    placeholder="Paste image URL from their Facebook/Instagram or upload photo"
                    description="Displayed as hero banner on CityOS app. You can add more photos later."
                  />
                </div>
              </div>

              {/* SECTION 3: Starter Items / Offerings */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                        3. {currentMeta.itemHeader}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Enter 1 or 2 starter items so residents can order immediately.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 border border-slate-750 transition-colors shrink-0"
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                <div className="space-y-2.5">
                  {starterItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                    >
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder={currentMeta.itemLabel}
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          className="w-full text-xs font-bold p-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="w-full sm:w-36">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-500">₦</span>
                          <input
                            type="number"
                            required
                            placeholder="Price (₦)"
                            value={item.price}
                            onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                            className="w-full text-xs font-mono font-bold pl-6 pr-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div className="w-full sm:w-36">
                        <input
                          type="text"
                          placeholder="Category / Tag"
                          value={item.category || ''}
                          onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                          className="w-full text-xs p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {starterItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-slate-500 hover:text-red-400 self-end sm:self-center transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Trigger (Embedded inside form for native enter key support) */}
              <button type="submit" className="hidden" id="fast-submit-btn" />
            </form>
          )}
        </div>

        {/* Pinned Bottom Action Footer */}
        {mode === 'fast' && (
          <div className="sticky bottom-0 z-10 bg-slate-950/95 backdrop-blur-md px-6 py-3.5 border-t border-slate-800 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-850 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                const btn = document.getElementById('fast-submit-btn');
                if (btn) btn.click();
              }}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Publishing Business...</span>
                </>
              ) : (
                <>
                  <Rocket size={15} />
                  <span>Launch Business onto CityOS</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
