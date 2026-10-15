'use client';

import React, { useState } from 'react';
import { 
  Building2, UtensilsCrossed, Hotel, ShoppingBag, Wrench, Truck, GraduationCap, 
  X, Plus, Sparkles, Upload, Link as LinkIcon, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, FileText, Check
} from 'lucide-react';
import { createHQManagedBusiness, bulkImportHQManagedBusinesses, CreateHQManagedBusinessPayload } from '@/lib/actions/hq-managed-business';
import MediaLinkOrUploadInput from './MediaLinkOrUploadInput';

interface CreateBusinessWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const VERTICAL_OPTIONS = [
  { type: 'RESTAURANT', label: 'Restaurant / Cafe', icon: UtensilsCrossed, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { type: 'HOTEL', label: 'Hotel / Resort', icon: Hotel, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { type: 'RETAIL', label: 'Retail / Supermarket', icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { type: 'SERVICES', label: 'Services / Salon', icon: Wrench, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { type: 'LOGISTICS', label: 'Logistics Fleet', icon: Truck, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { type: 'SCHOOL', label: 'School / Academy', icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
];

export default function CreateBusinessWizardModal({ isOpen, onClose, onSuccess }: CreateBusinessWizardModalProps) {
  const [mode, setMode] = useState<'wizard' | 'json'>('wizard');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateHQManagedBusinessPayload>({
    name: '',
    type: 'RESTAURANT',
    storeCategory: '',
    description: '',
    address: '',
    cityId: '',
    latitude: 4.9757,
    longitude: 8.3417,
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    logoUrl: '',
    coverUrl: '',
    images: [],
    initialItems: [],
    initialRooms: [],
  });

  // Quick Catalog / Rooms State
  const [quickItemText, setQuickItemText] = useState('');
  const [quickRoomNumber, setQuickRoomNumber] = useState('');
  const [quickRoomType, setQuickRoomType] = useState('Deluxe Room');
  const [quickRoomRate, setQuickRoomRate] = useState('');

  // Bulk JSON State
  const [jsonInput, setJsonInput] = useState('');
  const [jsonResults, setJsonResults] = useState<{ succeeded: number; failed: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  // Auto-parse text lines like: "Afang Soup - 3500 - Rich Calabar soup with goat meat"
  const handleParseMenuText = () => {
    if (!quickItemText.trim()) return;
    const lines = quickItemText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: Array<{ name: string; price: number; category?: string; description?: string }> = [];

    for (const line of lines) {
      // Split by '-' or ':' or ','
      const parts = line.split(/[-–:]/).map(p => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        // Extract numeric price from 2nd part
        const priceMatch = parts[1].replace(/,/g, '').match(/\d+/);
        const price = priceMatch ? Number(priceMatch[0]) : 0;
        const description = parts[2] || '';
        parsed.push({
          name,
          price,
          category: formData.type === 'RESTAURANT' ? 'Native Specials' : 'General',
          description,
        });
      }
    }

    if (parsed.length > 0) {
      setFormData(prev => ({
        ...prev,
        initialItems: [...(prev.initialItems || []), ...parsed],
      }));
      setQuickItemText('');
    }
  };

  const handleAddQuickRoom = () => {
    if (!quickRoomNumber.trim()) return;
    const rate = Number(quickRoomRate) || 0;
    setFormData(prev => ({
      ...prev,
      initialRooms: [
        ...(prev.initialRooms || []),
        { roomNumber: quickRoomNumber.trim(), type: quickRoomType, baseRate: rate },
      ],
    }));
    setQuickRoomNumber('');
    setQuickRoomRate('');
  };

  const handleSubmitWizard = async () => {
    setError(null);
    if (!formData.name.trim()) {
      setError('Business name is required.');
      setStep(1);
      return;
    }
    if (!formData.address.trim()) {
      setError('Physical address is required.');
      setStep(2);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createHQManagedBusiness(formData);
      if (res.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create managed business.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportJson = async () => {
    setError(null);
    setJsonResults(null);
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array of businesses');
      setIsSubmitting(true);
      const results = await bulkImportHQManagedBusinesses(parsed);
      setJsonResults(results);
      if (results.succeeded > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Invalid JSON format');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden my-8 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Building2 size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">HQ Business Onboarding Wizard</h2>
              <p className="text-xs text-slate-400">Create, seed, and manage unconfirmed businesses across Calabar</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === 'wizard' ? 'json' : 'wizard')}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full font-medium transition-all"
            >
              {mode === 'wizard' ? 'JSON Import' : 'Step-by-Step Wizard'}
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-red-500" />
            <p>{error}</p>
          </div>
        )}

        {mode === 'json' ? (
          /* JSON Import Mode */
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Paste JSON Array of Businesses
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={12}
                placeholder={`[
  {
    "name": "Crunchies Fried Chicken",
    "type": "RESTAURANT",
    "address": "90 Marian Road, Calabar",
    "phone": "08012345678",
    "coverUrl": "https://images.unsplash.com/...",
    "initialItems": [
      { "name": "Crunchies Fried Rice & Chicken", "price": 2800, "category": "Meals" }
    ]
  }
]`}
                className="w-full font-mono text-xs p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {jsonResults && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-emerald-600">✓ Successfully imported: {jsonResults.succeeded}</p>
                {jsonResults.failed > 0 && (
                  <p className="font-bold text-red-600">✗ Failed: {jsonResults.failed}</p>
                )}
                {jsonResults.errors.length > 0 && (
                  <div className="mt-2 text-red-500 max-h-32 overflow-y-auto">
                    {jsonResults.errors.map((err, i) => <div key={i}>• {err}</div>)}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={onClose} className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button
                disabled={isSubmitting || !jsonInput.trim()}
                onClick={handleImportJson}
                className="px-6 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSubmitting ? 'Importing...' : 'Batch Import Businesses'}
              </button>
            </div>
          </div>
        ) : (
          /* Step-by-Step Wizard */
          <div className="p-6">
            {/* Steps Progress */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 text-xs">
              {[
                { s: 1, title: '1. Identity & Vertical' },
                { s: 2, title: '2. Location & Contact' },
                { s: 3, title: '3. Media & Visuals' },
                { s: 4, title: '4. Quick Catalog' },
              ].map(({ s, title }) => (
                <button
                  key={s}
                  onClick={() => setStep(s as any)}
                  className={`font-bold pb-1 flex items-center gap-1.5 transition-all ${
                    step === s 
                      ? 'text-slate-900 border-b-2 border-slate-900' 
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

            {/* STEP 1: Core Identity */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Industry Vertical *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {VERTICAL_OPTIONS.map(({ type, label, icon: Icon, color }) => {
                      const isSelected = formData.type === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, type })}
                          className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                            isSelected 
                              ? 'border-slate-900 bg-slate-900 text-white shadow-md' 
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20 text-white' : color}`}>
                            <Icon size={16} />
                          </div>
                          <span className="text-xs font-bold">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monty Suites, Crunchies Fried Chicken, Spar Calabar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-sm font-medium px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Store Category / Cuisine
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Fast Food & Pastries, Luxury Hotel, Organic Groceries"
                      value={formData.storeCategory || ''}
                      onChange={(e) => setFormData({ ...formData, storeCategory: e.target.value })}
                      className="w-full text-sm px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Official Website (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. https://crunchiesonline.com"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full text-sm px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Brief Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe their offerings, ambiance, specialties, or brand backstory..."
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full text-sm p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Location & Contact */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Physical Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 90 Marian Road, Calabar"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full text-sm font-medium px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Customer Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 08012345678"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full text-sm px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      WhatsApp Dispatch Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 08123456789 (for order forwarding)"
                      value={formData.whatsapp || ''}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="w-full text-sm px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Approx. GPS Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="4.9757 (Calabar Central)"
                      value={formData.latitude || 4.9757}
                      onChange={(e) => setFormData({ ...formData, latitude: Number(e.target.value) })}
                      className="w-full text-sm px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Approx. GPS Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="8.3417 (Calabar Central)"
                      value={formData.longitude || 8.3417}
                      onChange={(e) => setFormData({ ...formData, longitude: Number(e.target.value) })}
                      className="w-full text-sm px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Media & Visuals */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Primary Brand Logo / Avatar
                  </label>
                  <MediaLinkOrUploadInput
                    label="Brand Logo"
                    value={formData.logoUrl || ''}
                    onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                    placeholder="Paste website logo URL or upload PNG/WebP"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Hero Cover Banner (Wide Landscape)
                  </label>
                  <MediaLinkOrUploadInput
                    label="Storefront / Cover Banner"
                    value={formData.coverUrl || ''}
                    onChange={(url) => setFormData({ ...formData, coverUrl: url })}
                    placeholder="Paste storefront photo URL or upload high-res banner"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Quick Catalog / Rooms Seeder */}
            {step === 4 && (
              <div className="space-y-6">
                {formData.type === 'HOTEL' ? (
                  /* Hotel Quick Rooms */
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
                        Quick Add Initial Rooms
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Room # (e.g. 101)"
                          value={quickRoomNumber}
                          onChange={(e) => setQuickRoomNumber(e.target.value)}
                          className="text-xs p-3 rounded-xl border border-slate-200 bg-white"
                        />
                        <select
                          value={quickRoomType}
                          onChange={(e) => setQuickRoomType(e.target.value)}
                          className="text-xs p-3 rounded-xl border border-slate-200 bg-white"
                        >
                          <option value="Standard Room">Standard Room</option>
                          <option value="Deluxe Room">Deluxe Room</option>
                          <option value="Executive Suite">Executive Suite</option>
                          <option value="Presidential Suite">Presidential Suite</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Rate (₦/night)"
                          value={quickRoomRate}
                          onChange={(e) => setQuickRoomRate(e.target.value)}
                          className="text-xs p-3 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddQuickRoom}
                        className="mt-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition-all"
                      >
                        + Add Room to Seed List
                      </button>
                    </div>

                    {formData.initialRooms && formData.initialRooms.length > 0 && (
                      <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-2">
                        <p className="text-xs font-bold text-slate-700">Seeded Rooms ({formData.initialRooms.length}):</p>
                        <div className="flex flex-wrap gap-2">
                          {formData.initialRooms.map((rm, idx) => (
                            <span key={idx} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-medium">
                              Room {rm.roomNumber} ({rm.type}) • ₦{rm.baseRate.toLocaleString()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Restaurant / Retail Catalog Seeder */
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                          Paste Menu / Items (Bulk Text Parser)
                        </h4>
                        <span className="text-[10px] text-amber-700 font-medium">Format: Item Name - Price (₦) - Description</span>
                      </div>
                      <textarea
                        rows={4}
                        placeholder={`Afang Soup & Pounded Yam - 3500 - Rich native soup with goat meat and stockfish
Jollof Rice & Crispy Chicken - 2800 - Smoky Nigerian party jollof with spicy drumstick
Catfish Pepper Soup - 3000 - Fresh whole catfish in spiced broth
Chapman Cocktail - 1200 - Classic fruity blend`}
                        value={quickItemText}
                        onChange={(e) => setQuickItemText(e.target.value)}
                        className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleParseMenuText}
                        className="mt-2 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                      >
                        <Sparkles size={14} /> Auto-Parse into Catalog
                      </button>
                    </div>

                    {formData.initialItems && formData.initialItems.length > 0 && (
                      <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-2 max-h-48 overflow-y-auto">
                        <p className="text-xs font-bold text-slate-700">Parsed Catalog Items ({formData.initialItems.length}):</p>
                        <div className="space-y-1.5">
                          {formData.initialItems.map((it, idx) => (
                            <div key={idx} className="text-xs bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-900">{it.name}</span>
                                {it.description && <span className="text-slate-500 text-[11px] ml-2">— {it.description}</span>}
                              </div>
                              <span className="font-bold text-emerald-600">₦{it.price.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as any)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : <div />}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((step + 1) as any)}
                  className="px-6 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5"
                >
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitWizard}
                  className="px-8 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? 'Provisioning...' : 'Complete & Launch Business'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
