'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Sparkles, MapPin, Calendar, Heart } from 'lucide-react';
import { completeOnboarding } from '@/app/actions/onboarding';
import { getSession } from 'next-auth/react';

const INTEREST_TAGS = [
  'Foodie', 'Nightlife', 'Fitness & Outdoors', 'Arts & Culture',
  'Live Music', 'Families & Kids', 'Tech & Startups', 'Volunteering',
  'Shopping', 'Pets', 'Gaming', 'Wellness',
];

type City = { id: string; name: string; country: string };

export default function WelcomeWizard({ cities }: { cities: City[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    homeCityId: '',
    dateOfBirth: '',
    phone: '',
    interests: [] as string[],
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

  const next = () => {
    if (!form.homeCityId || !form.dateOfBirth) {
      setError('Please fill in your city and date of birth.');
      return;
    }
    setError('');
    setStep(2);
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await completeOnboarding({
        homeCityId: form.homeCityId,
        dateOfBirth: form.dateOfBirth,
        phone: form.phone || undefined,
        interests: form.interests,
      });
      await getSession(); // refresh session so onboardingComplete flips to true
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-900 to-emerald-900 p-8 text-white">
        <h1 className="text-3xl font-black flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-emerald-400" />
          Welcome to CityConnect!
        </h1>
        <p className="mt-2 text-emerald-100 text-sm font-medium">
          Let&apos;s personalize your city experience in two quick steps.
        </p>
        <div className="flex gap-2 mt-6">
          {[1, 2].map(i => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${step >= i ? 'bg-emerald-400' : 'bg-white/10'}`}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-8">
        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            {/* City */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Which city do you call home? *
              </label>
              <select
                value={form.homeCityId}
                onChange={e => setForm({ ...form, homeCityId: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
              >
                <option value="">Select your city...</option>
                {cities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}, {c.country}</option>
                ))}
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Date of Birth *
              </label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
              />
              <p className="text-xs text-slate-400 mt-1.5">Used for age-appropriate content and event recommendations.</p>
            </div>

            <button
              onClick={next}
              className="w-full py-3.5 mt-2 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Interests */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1">
                <Heart className="w-4 h-4 text-emerald-600" />
                What are you into? (pick up to 5)
              </label>
              <p className="text-sm text-slate-500 mb-4">We use this to personalise your feed, events and local deals.</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_TAGS.map(tag => {
                  const selected = form.interests.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                        selected
                          ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                          : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Phone Number <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="tel"
                placeholder="+234 800 000 0000"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
              />
              <p className="text-xs text-slate-400 mt-1.5">Helpful for food delivery and booking confirmations.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-600/20"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Done — Take me to my city!'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
