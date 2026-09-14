"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { registerSchool } from '@/lib/actions/business';
import { Loader2, ArrowRight } from 'lucide-react';

import { NIGERIAN_STATES } from '@/lib/data/nigeria';

export default function SchoolRegisterForm({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    state: '',
    lga: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  });

  // Calculate available LGAs based on selected state
  const availableLGAs = formData.state ? (NIGERIAN_STATES as Record<string, string[]>)[formData.state] || [] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLoggedIn) {
      signIn('google', { callbackUrl: '/business/schoolos/register' });
      return;
    }

    if (!formData.state || !formData.lga) {
      setError('Please select a valid State and Local Government Area.');
      return;
    }

    setLoading(true);
    
    const result = await registerSchool(formData);
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.success) {
      router.push('/school/admin');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Official School Name *</label>
          <input 
            required
            type="text" 
            placeholder="e.g. Springfield High School"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">State *</label>
          <select 
            required
            value={formData.state}
            onChange={e => {
              // Reset LGA when state changes
              setFormData({...formData, state: e.target.value, lga: ''})
            }}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900"
          >
            <option value="" disabled>Select a State</option>
            {Object.keys(NIGERIAN_STATES).sort().map(state => (
              <option key={state} value={state}>{state} State</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Local Government Area (LGA) *</label>
          <select 
            required
            value={formData.lga}
            onChange={e => setFormData({...formData, lga: e.target.value})}
            disabled={!formData.state}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" disabled>{formData.state ? 'Select an LGA' : 'Select a State first'}</option>
            {availableLGAs.map((lga: string) => (
              <option key={lga} value={lga}>{lga}</option>
            ))}
          </select>
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Street Address *</label>
          <textarea 
            required
            placeholder="e.g. 14 Awolowo Way"
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
            rows={2}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number *</label>
          <input 
            required
            type="tel" 
            placeholder="e.g. 08012345678"
            pattern="^(0[789][01]\d{8}|\+234[789][01]\d{8})$"
            title="Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)"
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Public Email</label>
          <input 
            type="email" 
            placeholder="admissions@school.edu"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Website URL</label>
          <input 
            type="url" 
            placeholder="https://www.school.edu"
            value={formData.website}
            onChange={e => setFormData({...formData, website: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900"
          />
        </div>
      </div>

      <div className="pt-4">
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70"
        >
          {loading ? (
            <><Loader2 className="animate-spin" size={20} /> Provisioning SchoolOS...</>
          ) : !isLoggedIn ? (
            <><img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" /> Sign in to continue</>
          ) : (
            <>Launch SchoolOS Dashboard <ArrowRight size={20} /></>
          )}
        </button>
      </div>
    </form>
  );
}
