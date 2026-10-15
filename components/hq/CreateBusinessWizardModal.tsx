'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, UtensilsCrossed, Hotel, ShoppingBag, Wrench, Truck, GraduationCap, 
  X, AlertCircle, FileText, CheckCircle2, ChevronRight
} from 'lucide-react';
import { bulkImportHQManagedBusinesses } from '@/lib/actions/hq-managed-business';
import RestaurantCreationWizard from './wizards/RestaurantCreationWizard';
import HotelCreationWizard from './wizards/HotelCreationWizard';
import RetailCreationWizard from './wizards/RetailCreationWizard';
import ServicesCreationWizard from './wizards/ServicesCreationWizard';
import LogisticsCreationWizard from './wizards/LogisticsCreationWizard';
import SchoolCreationWizard from './wizards/SchoolCreationWizard';

interface CreateBusinessWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialVertical?: string;
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
    description: 'Onboard restaurants, fast casual, native bukkas, and cafes with instant menu indexing.',
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
    description: 'Onboard hotels, resorts, and lodges with room numbering, amenities, and nightly rates.',
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
    description: 'Onboard supermarkets, pharmacies, electronics shops, and boutiques with shelf SKUs.',
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
    description: 'Onboard salons, spas, auto mechanics, laundry, and artisans with service booking menus.',
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
    description: 'Onboard courier dispatch fleets, delivery minivans, and haulage trucks with waybill rates.',
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
    description: 'Onboard nursery, primary, secondary schools, and academies with curriculum & tuition.',
  },
];

export default function CreateBusinessWizardModal({
  isOpen,
  onClose,
  onSuccess,
  initialVertical = 'RESTAURANT',
}: CreateBusinessWizardModalProps) {
  const [selectedVertical, setSelectedVertical] = useState(initialVertical);
  const [mode, setMode] = useState<'wizard' | 'json'>('wizard');

  // JSON batch mode states
  const [jsonInput, setJsonInput] = useState('');
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonResults, setJsonResults] = useState<{ succeeded: number; failed: number; errors: string[] } | null>(null);

  useEffect(() => {
    if (initialVertical) {
      setSelectedVertical(initialVertical);
    }
  }, [initialVertical]);

  if (!isOpen) return null;

  const currentMeta = VERTICAL_METAS.find(t => t.type === selectedVertical) || VERTICAL_METAS[0];
  const CurrentIcon = currentMeta.icon;

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
      <div className="relative w-full max-w-4xl h-[90vh] max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Explicit Accent Stripe */}
        <div className={`h-1.5 w-full shrink-0 ${currentMeta.accentBar}`} />

        {/* Crisp, Crystal-Clear Header (Pinned/Sticky) */}
        <div className="bg-slate-950 px-5 sm:px-6 py-3.5 sm:py-4 text-white border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${currentMeta.iconBg}`}>
              <CurrentIcon size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${currentMeta.badge}`}>
                  {currentMeta.shortLabel} ONBOARDING
                </span>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">CityOS HQ Custodian</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight mt-0.5 truncate">
                {currentMeta.label} Wizard
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl font-medium hidden md:block truncate">
                {currentMeta.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMode(mode === 'wizard' ? 'json' : 'wizard')}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 border border-slate-800 hover:border-slate-700 shadow-sm"
            >
              <FileText size={14} className="text-teal-400 shrink-0" />
              <span className="hidden sm:inline">{mode === 'wizard' ? 'Raw JSON Batch' : 'Back to Wizard'}</span>
              <span className="sm:hidden">{mode === 'wizard' ? 'JSON' : 'Wizard'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors"
              title="Close modal"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Business Type Switcher Bar (Pinned/Sticky) */}
        {mode === 'wizard' && (
          <div className="bg-slate-950/95 border-b border-slate-800 px-4 py-2 overflow-x-auto scrollbar-none shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-1 pl-1">
                Vertical:
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

        {/* Scrollable Wizard Body with strict min-h-0 flexbox container */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-900 text-slate-100 flex flex-col">
          {mode === 'json' ? (
            /* JSON Bulk Import Mode */
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Paste JSON Array of Businesses
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Supported Verticals: RESTAURANT, HOTEL, RETAIL, SERVICES, LOGISTICS, SCHOOL
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
    "coverUrl": "https://images.unsplash.com/...",
    "initialItems": [
      { "name": "Afang Soup & Pounded Yam", "price": 3500, "category": "Native Soups" }
    ]
  },
  {
    "name": "Monty Suites & Golf Club",
    "type": "HOTEL",
    "address": "Asikpo Ita Street, Calabar",
    "initialRooms": [
      { "roomNumber": "101", "type": "Deluxe Room", "baseRate": 45000 }
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
                  onClick={() => setMode('wizard')}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  Back to Visual Wizard
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
            /* Render Vertical-Specific Wizard */
            <div>
              {selectedVertical === 'RESTAURANT' && (
                <RestaurantCreationWizard onSuccess={onSuccess} onCancel={onClose} />
              )}
              {selectedVertical === 'HOTEL' && (
                <HotelCreationWizard onSuccess={onSuccess} onCancel={onClose} />
              )}
              {selectedVertical === 'RETAIL' && (
                <RetailCreationWizard onSuccess={onSuccess} onCancel={onClose} />
              )}
              {selectedVertical === 'SERVICES' && (
                <ServicesCreationWizard onSuccess={onSuccess} onCancel={onClose} />
              )}
              {selectedVertical === 'LOGISTICS' && (
                <LogisticsCreationWizard onSuccess={onSuccess} onCancel={onClose} />
              )}
              {selectedVertical === 'SCHOOL' && (
                <SchoolCreationWizard onSuccess={onSuccess} onCancel={onClose} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
