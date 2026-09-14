"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, GraduationCap, DollarSign, Settings as SettingsIcon } from 'lucide-react';
import { completeSchoolSetup } from '@/lib/actions/schoolos'; // I will create this action

interface SchoolSetupWizardProps {
  settings: any; // SchoolSettings object
}

const CURRENCIES = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
];

export default function SchoolSetupWizard({ settings }: SchoolSetupWizardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(settings && settings.setupComplete === false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    schoolType: settings?.schoolType || 'both',
    currentYear: settings?.currentYear || new Date().getFullYear(),
    currentTerm: settings?.currentTerm || 1,
    currencyCode: settings?.currencyCode || 'NGN',
  });

  if (!isOpen) return null;

  const handleFinish = async () => {
    setLoading(true);
    const selectedCurrency = CURRENCIES.find(c => c.code === formData.currencyCode) || CURRENCIES[0];
    
    await completeSchoolSetup({
      organizationId: settings.organizationId,
      schoolType: formData.schoolType,
      currentYear: Number(formData.currentYear),
      currentTerm: Number(formData.currentTerm),
      currencyCode: selectedCurrency.code,
      currencySymbol: selectedCurrency.symbol,
      setupComplete: true,
    });
    
    setLoading(false);
    setIsOpen(false);
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-white flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <SettingsIcon className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">SchoolOS Setup Wizard</h2>
            <p className="text-blue-100 text-sm">Let's configure {settings?.name} for success.</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex bg-slate-100">
          <div className={`h-1 bg-blue-500 transition-all duration-500`} style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {/* Body */}
        <div className="p-8 flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 p-2 rounded-lg"><GraduationCap className="text-blue-600" size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">Academic Structure</h3>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">School Level / Type</label>
                <select 
                  value={formData.schoolType}
                  onChange={e => setFormData({...formData, schoolType: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="primary">Primary / Nursery Only</option>
                  <option value="secondary">Secondary / High School Only</option>
                  <option value="both">K-12 (Both Primary & Secondary)</option>
                  <option value="university">University / Higher Education</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Academic Year</label>
                  <input 
                    type="number" 
                    value={formData.currentYear}
                    onChange={e => setFormData({...formData, currentYear: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Starting year (e.g. 2026 for 2026/2027 session)</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Term</label>
                  <select 
                    value={formData.currentTerm}
                    onChange={e => setFormData({...formData, currentTerm: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Term 1 (First Term)</option>
                    <option value={2}>Term 2 (Second Term)</option>
                    <option value={3}>Term 3 (Third Term)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-100 p-2 rounded-lg"><DollarSign className="text-emerald-600" size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">Financials & Currency</h3>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Operating Currency</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CURRENCIES.map(curr => (
                    <button
                      key={curr.code}
                      onClick={(e) => { e.preventDefault(); setFormData({...formData, currencyCode: curr.code}) }}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        formData.currencyCode === curr.code 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          formData.currencyCode === curr.code ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {curr.symbol}
                        </span>
                        <span className="font-semibold text-slate-800">{curr.code}</span>
                      </div>
                      {formData.currencyCode === curr.code && <CheckCircle className="text-blue-600" size={20} />}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">This currency will be used for all tuition invoices, payslips, and financial reports.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-4 duration-500 py-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-blue-600" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">You're All Set!</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Your portal has been customized. You can always change these settings later from the Settings tab in your dashboard.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-6 bg-slate-50 flex items-center justify-between">
          <div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Skip for now
            </button>
          </div>
          <div className="flex gap-3">
            {step > 1 && (
              <button 
                onClick={(e) => { e.preventDefault(); setStep(step - 1) }}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Back
              </button>
            )}
            
            {step < 3 ? (
              <button 
                onClick={(e) => { e.preventDefault(); setStep(step + 1) }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
              >
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                onClick={(e) => { e.preventDefault(); handleFinish() }}
                disabled={loading}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-70"
              >
                {loading ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : 'Launch Dashboard'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
