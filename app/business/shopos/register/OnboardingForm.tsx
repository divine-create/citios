"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { provisionShopOS } from '@/lib/actions/shopos';
import { Loader2, ExternalLink } from 'lucide-react';

const THEME_OPTIONS = [
  { id: 'minimal', label: 'Minimal', description: 'Clean and modern' },
  { id: 'innovator', label: 'Innovator', description: 'Bold, tech-forward' },
  { id: 'warm', label: 'Warm Market', description: 'Friendly, local feel' },
  { id: 'playful', label: 'Playful', description: 'Bright and fun' },
  { id: 'editorial', label: 'Editorial', description: 'Boutique, magazine-style' },
];

export default function OnboardingForm() {
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeUrl, setStoreUrl] = useState('');

  const [formData, setFormData] = useState({
    businessName: '',
    storeUrl: '',
    theme: 'minimal',
    country: 'Nigeria',
    weeklyOrders: '',
    currencies: [] as string[],
    staffCount: '',
    physicalStores: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.currencies.length === 0) {
      setError("Please select at least one currency.");
      setLoading(false);
      return;
    }

    const result = await provisionShopOS(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.success) {
      // Refresh the JWT so the new OWNER membership is in the session
      // before the dashboard gate checks it, then send them in.
      await update();
      if (result.slug) setStoreUrl(result.slug);
      router.push('/grocery');
    }
  };

  const handleCurrencyToggle = (currency: string) => {
    setFormData(prev => ({
      ...prev,
      currencies: prev.currencies.includes(currency) 
        ? prev.currencies.filter(c => c !== currency)
        : [...prev.currencies, currency]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      {storeUrl && (
        <a
          href={`/site/${storeUrl}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors"
        >
          <ExternalLink size={16} /> Your store is live at /site/{storeUrl} — click to view
        </a>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Business Name *</label>
          <input 
            required
            type="text" 
            placeholder="e.g. Gocreative"
            value={formData.businessName}
            onChange={e => setFormData({...formData, businessName: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Store URL *</label>
          <div className="flex">
            <input 
              required
              type="text" 
              placeholder="gocreative"
              value={formData.storeUrl}
              onChange={e => setFormData({...formData, storeUrl: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-900"
            />
            <div className="bg-slate-100 border border-slate-200 border-l-0 rounded-r-xl px-4 py-3 text-slate-500 font-medium flex items-center">
              .cityconnect.shop
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">You can purchase or connect a custom domain later.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Where is your business situated? *</label>
          <select 
            required
            value={formData.country}
            onChange={e => setFormData({...formData, country: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-900"
          >
            <option value="Nigeria">Nigeria</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Ghana">Ghana</option>
            <option value="Kenya">Kenya</option>
            <option value="South Africa">South Africa</option>
          </select>
          <p className="text-xs text-slate-500 mt-2">This determines the currency your app will display. You can switch website currency later.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">How many orders do you get weekly? *</label>
          <select 
            required
            value={formData.weeklyOrders}
            onChange={e => setFormData({...formData, weeklyOrders: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-900"
          >
            <option value="" disabled>Select an option</option>
            <option value="0-10">0 - 10 orders</option>
            <option value="11-50">11 - 50 orders</option>
            <option value="51-100">51 - 100 orders</option>
            <option value="101-500">101 - 500 orders</option>
            <option value="500+">More than 500 orders</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">What currencies do you receive payment in? (Select all that apply) *</label>
          <div className="grid grid-cols-2 gap-3">
            {['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES'].map(curr => (
              <label key={curr} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={formData.currencies.includes(curr)}
                  onChange={() => handleCurrencyToggle(curr)}
                  className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-700">{curr}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Store theme</label>
          <p className="text-xs text-slate-500 mb-3">Your online store is generated automatically — pick the look. You can change it later.</p>
          <div className="grid grid-cols-2 gap-3">
            {THEME_OPTIONS.map(t => (
              <label key={t.id} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${formData.theme === t.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="theme"
                  checked={formData.theme === t.id}
                  onChange={() => setFormData({...formData, theme: t.id})}
                  className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span className="block font-bold text-sm text-slate-800">{t.label}</span>
                  <span className="block text-xs text-slate-500">{t.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">How many staff do you have? *</label>
            <select 
              required
              value={formData.staffCount}
              onChange={e => setFormData({...formData, staffCount: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-900"
            >
              <option value="" disabled>Select</option>
              <option value="Just me">Just me</option>
              <option value="1-5">1-5</option>
              <option value="6-15">6-15</option>
              <option value="16-50">16-50</option>
              <option value="50+">50+</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Physical stores? *</label>
            <select 
              required
              value={formData.physicalStores}
              onChange={e => setFormData({...formData, physicalStores: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-900"
            >
              <option value="" disabled>Select</option>
              <option value="None">None (Online only)</option>
              <option value="1">1</option>
              <option value="2-5">2-5</option>
              <option value="5+">5+</option>
            </select>
          </div>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-70"
      >
        {loading ? (
          <><Loader2 className="animate-spin" size={20} /> Provisioning ShopOS...</>
        ) : (
          <>Launch Dashboard</>
        )}
      </button>
    </form>
  );
}
