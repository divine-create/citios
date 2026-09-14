"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { provisionShopOS } from '@/lib/actions/shopos';
import { Loader2 } from 'lucide-react';

export default function OnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    businessName: '',
    storeUrl: '',
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
      // Send them to their new ShopOS dashboard!
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
