'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateFullProfile } from '@/lib/actions/profile';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

const INTEREST_TAGS = [
  'Foodie', 'Nightlife', 'Sports & Fitness', 'Arts & Culture',
  'Live Music', 'Families & Kids', 'Tech & Startups', 'Volunteering',
  'Shopping', 'Pets', 'Gaming', 'Wellness',
];

type City = { id: string; name: string; country: string };

export default function EditProfileClient({ cities, initialData }: { cities: City[], initialData: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const parsedInterests = initialData.residentProfile?.interests 
    ? (typeof initialData.residentProfile.interests === 'string' 
        ? JSON.parse(initialData.residentProfile.interests) 
        : initialData.residentProfile.interests) 
    : [];

  const [form, setForm] = useState({
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    homeCityId: initialData.homeCityId || '',
    dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split('T')[0] : '',
    phone: initialData.residentProfile?.phone || '',
    interests: parsedInterests as string[],
  });

  const toggleInterest = (tag: string) => {
    setForm(prev => {
      if (prev.interests.includes(tag)) {
        return { ...prev, interests: prev.interests.filter(t => t !== tag) };
      }
      if (prev.interests.length >= 5) return prev;
      return { ...prev, interests: [...prev.interests, tag] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) {
      setError('First and last name are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await updateFullProfile(form);
      router.push('/profile');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-slate-50 text-slate-500">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-[15px] font-black text-ink">Personal Information</h1>
        <div className="w-9" />
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-100">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-500">First Name</label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-500 text-[14px] font-bold text-ink"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-500">Last Name</label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-500 text-[14px] font-bold text-ink"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-bold text-slate-500">Home City</label>
          <select
            value={form.homeCityId}
            onChange={e => setForm({ ...form, homeCityId: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-500 text-[14px] font-bold text-ink"
          >
            <option value="">Select a city...</option>
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name}, {c.country}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-500">Date of Birth</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-500 text-[14px] font-bold text-ink"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-500">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-500 text-[14px] font-bold text-ink"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div>
            <label className="text-[12px] font-bold text-slate-500 block">Interests (Max 5)</label>
            <p className="text-[11px] text-slate-400 mb-3">Help us personalize your city experience.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {INTEREST_TAGS.map(tag => {
              const selected = form.interests.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleInterest(tag)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${selected ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-6 pb-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-teal-800 hover:bg-teal-900 active:scale-[0.98] transition-all text-white font-black text-[15px] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
