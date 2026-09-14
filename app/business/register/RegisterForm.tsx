"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { registerOrganization } from '@/lib/actions/business';
import { Loader2, ArrowRight } from 'lucide-react';

export default function RegisterForm({ initialType, isLoggedIn }: { initialType: string, isLoggedIn: boolean }) {
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    type: initialType,
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLoggedIn) {
      // Direct them to login, then redirect back here
      signIn('google', { callbackUrl: `/business/register?type=${formData.type}` });
      return;
    }

    setLoading(true);
    
    const result = await registerOrganization(formData);
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.success) {
      await update();
      // Redirect based on type
      if (formData.type === 'SCHOOL') {
        router.push('/school/admin');
      } else if (formData.type === 'SERVICES') {
        router.push('/service');
      } else if (formData.type === 'RETAIL') {
        router.push('/grocery');
      } else {
        router.push('/');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Organization Name</label>
        <input 
          required
          type="text" 
          placeholder="e.g. Lincoln High School"
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Organization Type</label>
        <select 
          value={formData.type}
          disabled={true}
          onChange={e => setFormData({...formData, type: e.target.value})}
          className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none transition-all font-medium text-slate-600 opacity-80 cursor-not-allowed"
        >
          <option value="SCHOOL">School / University</option>
          <option value="SERVICES">Service Business</option>
          <option value="RETAIL">Retail / Shop</option>
          <option value="HOTEL">Hotel / Hospitality</option>
          <option value="HEALTHCARE">Healthcare Facility</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Brief Description (Optional)</label>
        <textarea 
          placeholder="What does your organization do?"
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
          rows={3}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-900 resize-none"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70"
      >
        {loading ? (
          <><Loader2 className="animate-spin" size={20} /> Provisioning workspace...</>
        ) : !isLoggedIn ? (
          <><img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" /> Sign in to continue</>
        ) : (
          <>Launch Dashboard <ArrowRight size={20} /></>
        )}
      </button>

      <p className="text-center text-xs text-slate-400 mt-4">
        By registering, you agree to the CityOS Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}
