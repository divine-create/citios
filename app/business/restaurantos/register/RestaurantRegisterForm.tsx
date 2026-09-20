"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { registerRestaurantOS } from '@/lib/actions/restaurantos';
import { getCityRegistry } from '@/app/actions/city';
import { Loader2, UtensilsCrossed, Soup, Zap } from 'lucide-react';

const STYLE_OPTIONS = [
  {
    id: 'FULL_SERVICE' as const,
    label: 'Restaurant',
    description: 'Full service â€” tables, reservations and floor plan included.',
    icon: UtensilsCrossed,
  },
  {
    id: 'HYBRID' as const,
    label: 'Eatery',
    description: 'Walk-in friendly local spot â€” simple, pay-and-collect.',
    icon: Soup,
  },
  {
    id: 'COUNTER' as const,
    label: 'Fast food',
    description: 'Quick service â€” POS-first with order numbers and combos.',
    icon: Zap,
  },
];

interface CityRegistry {
  state: string;
  lgas: { slug: string; name: string }[];
}

export default function RestaurantRegisterForm() {
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [serviceStyle, setServiceStyle] = useState<'FULL_SERVICE' | 'COUNTER' | 'HYBRID'>('HYBRID');
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [address, setAddress] = useState('');
  const [registry, setRegistry] = useState<CityRegistry[]>([]);

  useEffect(() => {
    getCityRegistry().then(setRegistry).catch(() => setRegistry([]));
  }, []);

  const lgas = registry.find((r) => r.state === state)?.lgas ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!state || !lga) {
      setError('Pick your state and local government.');
      return;
    }

    setLoading(true);
    const result = await registerRestaurantOS({
      businessName,
      description: description || undefined,
      serviceStyle,
      citySlug: lga,
      address: address || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Refresh the JWT so the new OWNER membership is in the session
    // before the dashboard gate checks it, then send them in.
    await update();
    router.push('/admin/restaurantos');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      {/* Business identity */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Business Name *</label>
          <input
            required
            type="text"
            placeholder="e.g. Naija Kitchen"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-slate-900"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
          <input
            type="text"
            placeholder="e.g. Swallow, soups and grills"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-slate-900"
          />
        </div>
      </div>

      {/* Operating style */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">What kind of food business? *</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STYLE_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServiceStyle(s.id)}
              className={`text-left p-4 rounded-2xl border-2 transition-all ${
                serviceStyle === s.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <s.icon className={`w-5 h-5 mb-2 ${serviceStyle === s.id ? 'text-orange-600' : 'text-slate-400'}`} />
              <p className="text-[13px] font-black text-slate-900">{s.label}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">{s.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Location: state â†’ local government */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">State *</label>
            <select
              required
              value={state}
              onChange={(e) => { setState(e.target.value); setLga(''); }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-slate-900"
            >
              <option value="">Select stateâ€¦</option>
              {registry.map((r) => (
                <option key={r.state} value={r.state}>{`${r.state} (${r.lgas.length} LGAs)`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Local Government *</label>
            <select
              required
              value={lga}
              onChange={(e) => setLga(e.target.value)}
              disabled={!state}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-slate-900 disabled:opacity-50"
            >
              <option value="">{state ? 'Select LGAâ€¦' : 'Pick a state first'}</option>
              {lgas.map((l) => (
                <option key={l.slug} value={l.slug}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Address</label>
          <input
            type="text"
            placeholder="e.g. 12 Adeola Odeku, Victoria Island"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-slate-900"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-black transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        {loading ? 'Provisioning your kitchenâ€¦' : 'Create my RestaurantOS'}
      </button>
    </form>
  );
}
