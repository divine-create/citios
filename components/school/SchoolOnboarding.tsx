'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Globe, Calendar, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { createSchool } from '@/app/actions/school-onboarding';

export default function SchoolOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Data
  const [data, setData] = useState({
    name: '',
    shortName: '',
    address: '',
    email: '',
    phone: '',
    slug: '',
    tagline: '',
    academicYear: new Date().getFullYear(),
    termStructure: 'TRIMESTER' as 'SEMESTER' | 'TRIMESTER',
    gradingScale: 'LETTER' as 'LETTER' | 'PERCENTAGE',
  });

  const update = (field: string, value: any) => setData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!data.name || !data.slug) {
      setError('Please fill in the required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createSchool(data);
      // Wait a moment so the success state feels deliberate
      setTimeout(() => {
        router.push('/school/admin');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to create school');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-8 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10 flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Register Your School</h1>
              <p className="text-blue-100 font-medium text-sm mt-1">Get your digital campus up and running in minutes.</p>
            </div>
          </div>

          <div className="flex gap-2 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-1.5 rounded-full flex-1 transition-colors duration-500 ${step >= i ? 'bg-blue-400' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-500">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Official School Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Greenwood International Academy"
                  value={data.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Short Name</label>
                  <input
                    type="text"
                    placeholder="GIA"
                    value={data.shortName}
                    onChange={(e) => update('shortName', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Contact Email</label>
                  <input
                    type="email"
                    placeholder="hello@greenwood.edu"
                    value={data.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Physical Address</label>
                <input
                  type="text"
                  placeholder="123 Education Lane"
                  value={data.address}
                  onChange={(e) => update('address', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>

              <button
                onClick={() => data.name ? setStep(2) : setError('School Name is required')}
                className="w-full mt-4 py-3.5 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-blue-800">
                <Globe className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">Your Microsite is your school's public face. Parents and students will visit this web address.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Web Address (Subdomain) *</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="greenwood"
                    value={data.slug}
                    onChange={(e) => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-slate-900"
                  />
                  <div className="px-4 py-3 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl text-slate-500 font-medium select-none">
                    .citios.vercel.app
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">Letters, numbers, and hyphens only.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">School Tagline</label>
                <input
                  type="text"
                  placeholder="Empowering the leaders of tomorrow."
                  value={data.tagline}
                  onChange={(e) => update('tagline', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => data.slug ? setStep(3) : setError('Web address is required')}
                  className="flex-1 py-3.5 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-indigo-800">
                <Calendar className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">We'll pre-configure your academic calendar and grading scale to save you time.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Term Structure</label>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${data.termStructure === 'TRIMESTER' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input type="radio" name="term" checked={data.termStructure === 'TRIMESTER'} onChange={() => update('termStructure', 'TRIMESTER')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">Trimester</p>
                        <p className="text-xs text-slate-500">3 terms per year</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${data.termStructure === 'SEMESTER' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input type="radio" name="term" checked={data.termStructure === 'SEMESTER'} onChange={() => update('termStructure', 'SEMESTER')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">Semester</p>
                        <p className="text-xs text-slate-500">2 terms per year</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Grading Scale</label>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${data.gradingScale === 'LETTER' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input type="radio" name="grading" checked={data.gradingScale === 'LETTER'} onChange={() => update('gradingScale', 'LETTER')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">Letter Grades</p>
                        <p className="text-xs text-slate-500">Standard A, B, C, D, F</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${data.gradingScale === 'PERCENTAGE' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input type="radio" name="grading" checked={data.gradingScale === 'PERCENTAGE'} onChange={() => update('gradingScale', 'PERCENTAGE')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">Percentages</p>
                        <p className="text-xs text-slate-500">0 - 100% scale</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="px-6 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Provisioning...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> Finish & Create School
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
