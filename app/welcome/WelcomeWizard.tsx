'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2, Sparkles, Phone, Heart, CheckCircle2, UserCheck, LogIn } from 'lucide-react';
import { completeOnboarding } from '@/app/actions/onboarding';
import { getSession } from 'next-auth/react';
import StateLgaSelect, { CityOption } from '@/components/cityos/StateLgaSelect';
import DateOfBirthPicker from '@/components/cityos/DateOfBirthPicker';
import { INTEREST_CATEGORIES } from '@/components/cityos/interestTags';

interface WelcomeWizardProps {
  cities: CityOption[];
  initialData?: {
    homeCityId?: string;
    dateOfBirth?: string;
    phone?: string;
    interests?: string[];
  };
  isGuest?: boolean;
  alreadyCompleted?: boolean;
}

export default function WelcomeWizard({
  cities,
  initialData,
  isGuest = false,
  alreadyCompleted = false,
}: WelcomeWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    homeCityId: initialData?.homeCityId || '',
    dateOfBirth: initialData?.dateOfBirth || '',
    phone: initialData?.phone || '',
    interests: Array.isArray(initialData?.interests) ? initialData.interests : [],
  });

  const toggleInterest = (tag: string) => {
    setForm((prev) => {
      if (prev.interests.includes(tag)) {
        return { ...prev, interests: prev.interests.filter((t) => t !== tag) };
      }
      if (prev.interests.length >= 8) return prev;
      return { ...prev, interests: [...prev.interests, tag] };
    });
  };

  const next = () => {
    setError('');

    if (!form.homeCityId) {
      setError('Please select your state and local government area (city).');
      return;
    }

    if (!form.dateOfBirth) {
      setError('Please pick your date of birth using the interactive date picker.');
      return;
    }

    if (!form.phone || form.phone.trim().length < 7) {
      setError('Please enter a valid phone number (required for notifications and orders).');
      return;
    }

    setStep(2);
  };

  const submit = async () => {
    if (isGuest) {
      // If browsing as guest preview, redirect to register with callback
      router.push('/register?callbackUrl=/welcome');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await completeOnboarding({
        homeCityId: form.homeCityId,
        dateOfBirth: form.dateOfBirth,
        phone: form.phone.trim(),
        interests: form.interests,
      });
      await getSession(); // refresh session so onboardingComplete flips to true
      setSaveSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 p-6 sm:p-8 text-white relative">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
            Welcome to CityConnect!
          </h1>
          {alreadyCompleted && (
            <Link
              href="/"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all shrink-0"
            >
              Go to City Feed →
            </Link>
          )}
        </div>

        <p className="mt-1.5 text-emerald-100 text-xs sm:text-sm font-medium">
          {alreadyCompleted
            ? 'You are already registered! You can review or update your city preferences anytime.'
            : isGuest
            ? 'Previewing CityConnect Onboarding · Test the city selector, date of birth picker, and interests.'
            : "Let's personalize your city experience in two quick steps."}
        </p>

        {isGuest && (
          <div className="mt-3 px-3 py-1.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-200 text-xs font-semibold flex items-center gap-2">
            <LogIn className="w-3.5 h-3.5 text-amber-300" />
            <span>Guest Preview Mode: <Link href="/login?callbackUrl=/welcome" className="underline font-bold text-white">Log in</Link> or <Link href="/register?callbackUrl=/welcome" className="underline font-bold text-white">Create an account</Link> to save permanently.</span>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          {[1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                step >= i ? 'bg-emerald-400' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 sm:p-8">
        {alreadyCompleted && (
          <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold rounded-2xl flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Your resident profile is active. You can make adjustments and click save anytime.</span>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-5 px-4 py-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs sm:text-sm font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Profile saved successfully! Redirecting to your city...</span>
          </div>
        )}

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-xs sm:text-sm font-bold rounded-2xl animate-in fade-in">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {/* State -> Local Government Filter with Instant Search */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <StateLgaSelect
                cities={cities}
                value={form.homeCityId}
                onChange={(cityId) => setForm({ ...form, homeCityId: cityId })}
                label="Your City / Local Government"
                required
              />
            </div>

            {/* Date of Birth */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <DateOfBirthPicker
                value={form.dateOfBirth}
                onChange={(dob) => setForm({ ...form, dateOfBirth: dob })}
                label="Date of Birth"
                required
              />
            </div>

            {/* Phone Number (Mandatory) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-700" />
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+234 800 000 0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-all"
              />
              <p className="text-[11px] text-slate-400">
                Required for marketplace delivery dispatch, service booking confirmations, and emergency alerts.
              </p>
            </div>

            <button
              onClick={next}
              className="w-full py-4 bg-teal-800 hover:bg-teal-900 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md shadow-teal-900/10 cursor-pointer"
            >
              Continue to Interests <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm sm:text-base font-black text-slate-800 mb-1">
                <Heart className="w-4 h-4 text-emerald-600" />
                What are you into? (pick up to 8)
              </label>
              <p className="text-xs sm:text-sm text-slate-500 mb-4">
                We use your choices to curate your city newsfeed, marketplace discovery, and events.
              </p>

              {/* Categorized Interests */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {INTEREST_CATEGORIES.map((cat) => (
                  <div key={cat.category} className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {cat.category}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.tags.map((tag) => {
                        const selected = form.interests.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleInterest(tag)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              selected
                                ? 'bg-teal-800 border-teal-800 text-white shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-600/20 active:scale-[0.99] cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isGuest ? (
                  'Create Account to Save'
                ) : alreadyCompleted ? (
                  'Save Profile Updates'
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
