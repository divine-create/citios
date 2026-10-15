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

const VERTICAL_TABS = [
  {
    type: 'RESTAURANT',
    label: 'Restaurant & Dining',
    shortLabel: 'Restaurant',
    icon: UtensilsCrossed,
    activeColor: 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20',
    iconColor: 'text-amber-400',
    headerBg: 'from-amber-950 via-slate-900 to-slate-950',
    description: 'Onboard restaurants, fast casual, native bukkas, and cafes with instant menu indexing.',
  },
  {
    type: 'HOTEL',
    label: 'Hotel & Hospitality',
    shortLabel: 'Hotel',
    icon: Hotel,
    activeColor: 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-600/20',
    iconColor: 'text-blue-400',
    headerBg: 'from-blue-950 via-slate-900 to-slate-950',
    description: 'Onboard hotels, resorts, and lodges with room numbering, amenities, and nightly rates.',
  },
  {
    type: 'RETAIL',
    label: 'Retail & Supermarket',
    shortLabel: 'Retail',
    icon: ShoppingBag,
    activeColor: 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20',
    iconColor: 'text-emerald-400',
    headerBg: 'from-emerald-950 via-slate-900 to-slate-950',
    description: 'Onboard supermarkets, pharmacies, electronics shops, and boutiques with shelf SKUs.',
  },
  {
    type: 'SERVICES',
    label: 'Services & Studio',
    shortLabel: 'Services',
    icon: Wrench,
    activeColor: 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-600/20',
    iconColor: 'text-purple-400',
    headerBg: 'from-purple-950 via-slate-900 to-slate-950',
    description: 'Onboard salons, spas, auto mechanics, laundry, and artisans with service booking menus.',
  },
  {
    type: 'LOGISTICS',
    label: 'Logistics Fleet',
    shortLabel: 'Logistics',
    icon: Truck,
    activeColor: 'bg-orange-600 text-white border-orange-700 shadow-md shadow-orange-600/20',
    iconColor: 'text-orange-400',
    headerBg: 'from-orange-950 via-slate-900 to-slate-950',
    description: 'Onboard courier dispatch fleets, delivery minivans, and haulage trucks with waybill rates.',
  },
  {
    type: 'SCHOOL',
    label: 'School & Academy',
    shortLabel: 'School',
    icon: GraduationCap,
    activeColor: 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20',
    iconColor: 'text-indigo-400',
    headerBg: 'from-indigo-950 via-slate-900 to-slate-950',
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

  const currentTab = VERTICAL_TABS.find(t => t.type === selectedVertical) || VERTICAL_TABS[0];
  const CurrentIcon = currentTab.icon;

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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Dynamic Vertical Header */}
        <div className={`bg-gradient-to-r ${currentTab.headerBg} text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <CurrentIcon size={26} className={currentTab.iconColor} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/15 text-white/90">
                  {currentTab.shortLabel} Onboarding
                </span>
                <span className="text-xs text-white/50">HQ Custodian Engine</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                {currentTab.label} Wizard
              </h2>
              <p className="text-xs text-white/70 mt-0.5">
                {currentTab.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setMode(mode === 'wizard' ? 'json' : 'wizard')}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 border border-white/10"
            >
              <FileText size={14} />
              <span>{mode === 'wizard' ? 'Raw JSON Batch' : 'Back to Wizard'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Business Type Selector Switcher Bar */}
        {mode === 'wizard' && (
          <div className="bg-slate-900 border-b border-slate-800 p-2 sm:p-3 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 pl-1">
                Select Business Type:
              </span>
              {VERTICAL_TABS.map((tab) => {
                const isSelected = selectedVertical === tab.type;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.type}
                    type="button"
                    onClick={() => setSelectedVertical(tab.type)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                      isSelected
                        ? tab.activeColor
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <TabIcon size={15} />
                    <span>{tab.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Body */}
        {mode === 'json' ? (
          /* JSON Bulk Import Mode */
          <div className="p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
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
                className="w-full font-mono text-xs p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {jsonError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-500" />
                <span>{jsonError}</span>
              </div>
            )}

            {jsonResults && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-emerald-600">✓ Successfully imported: {jsonResults.succeeded} businesses</p>
                {jsonResults.failed > 0 && (
                  <p className="font-bold text-red-600">✗ Failed: {jsonResults.failed}</p>
                )}
                {jsonResults.errors.length > 0 && (
                  <div className="mt-2 text-red-500 max-h-32 overflow-y-auto space-y-1">
                    {jsonResults.errors.map((err, i) => <div key={i}>• {err}</div>)}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMode('wizard')}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Back to Visual Wizard
              </button>
              <button
                type="button"
                disabled={isSubmittingJson || !jsonInput.trim()}
                onClick={handleImportJson}
                className="px-6 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md"
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
  );
}
