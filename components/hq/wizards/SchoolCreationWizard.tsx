'use client';

import React, { useState } from 'react';
import { 
  GraduationCap, Check, ArrowRight, ArrowLeft, AlertCircle, 
  MapPin, Phone, MessageSquare, Globe, Plus, Trash2, BookOpen, School as SchoolIcon
} from 'lucide-react';
import { createHQManagedBusiness, CreateHQManagedBusinessPayload } from '@/lib/actions/hq-managed-business';
import MediaLinkOrUploadInput from '../MediaLinkOrUploadInput';

interface SchoolCreationWizardProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const SCHOOL_LEVELS = [
  'Creche, Daycare & Nursery',
  'Primary & Basic Elementary School',
  'Secondary College & High School',
  'Vocational, Creative & Tech Academy',
];

const CURRICULUM_OPTIONS = [
  'Nigerian National Curriculum (NERDC)',
  'British International Curriculum (Cambridge)',
  'Montessori Early Years Education',
  'Dual Blend (National + International)',
];

const CAMPUS_FACILITIES = [
  'Modern Science Laboratories',
  'Sports Field & Football Pitch',
  'ICT Computer & Robotics Lab',
  'Dedicated School Bus Shuttle Service',
  'Boarding & Modern Hostel Facilities',
  'Fully Air-Conditioned Digital Library',
];

export default function SchoolCreationWizard({ onSuccess, onCancel }: SchoolCreationWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Institution Profile
  const [name, setName] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('Primary & Basic Elementary School');
  const [curriculum, setCurriculum] = useState('Dual Blend (National + International)');
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([
    'Modern Science Laboratories',
    'ICT Computer & Robotics Lab',
    'Dedicated School Bus Shuttle Service',
  ]);
  const [description, setDescription] = useState('');

  // Location & Contacts
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [latitude, setLatitude] = useState<number>(4.9757);
  const [longitude, setLongitude] = useState<number>(8.3417);

  // Media
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Tuition Fees
  const [feeSchedule, setFeeSchedule] = useState<Array<{ name: string; price: number; description: string }>>([
    { name: 'Nursery 1 - 3 Tuition', price: 120000, description: 'Termly tuition including instructional materials' },
    { name: 'Primary 1 - 6 Tuition', price: 180000, description: 'Termly tuition including ICT and lab fees' },
    { name: 'JSS 1 - 3 Junior Secondary', price: 240000, description: 'Termly tuition including STEM practicals' },
  ]);

  // Single Fee Adder
  const [newClassName, setNewClassName] = useState('');
  const [newTuitionFee, setNewTuitionFee] = useState('');
  const [newFeeNotes, setNewFeeNotes] = useState('');

  const toggleFacility = (facility: string) => {
    setSelectedFacilities(prev =>
      prev.includes(facility) ? prev.filter(f => f !== facility) : [...prev, facility]
    );
  };

  const handleAddFeeTier = () => {
    if (!newClassName.trim()) return;
    const fee = Number(newTuitionFee) || 0;
    setFeeSchedule(prev => [
      ...prev,
      {
        name: newClassName.trim(),
        price: fee,
        description: newFeeNotes.trim(),
      }
    ]);
    setNewClassName('');
    setNewTuitionFee('');
    setNewFeeNotes('');
  };

  const handleRemoveFeeTier = (index: number) => {
    setFeeSchedule(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('School / Institution name is required.');
      setStep(1);
      return;
    }
    if (!address.trim()) {
      setError('Campus street address is required.');
      setStep(2);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateHQManagedBusinessPayload = {
        name: name.trim(),
        type: 'SCHOOL',
        storeCategory: schoolLevel,
        description: description.trim() || `${name} is a premier educational institution in Calabar offering ${curriculum}. Equipped with ${selectedFacilities.slice(0, 2).join(', ')}.`,
        address: address.trim(),
        latitude,
        longitude,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        website: website.trim(),
        logoUrl: logoUrl.trim(),
        coverUrl: coverUrl.trim(),
        videos: videoUrl.trim() ? [videoUrl.trim()] : [],
        curriculum,
        amenities: selectedFacilities,
        initialItems: feeSchedule.map(f => ({
          name: f.name,
          price: f.price,
          description: f.description,
          category: 'Tuition Fee',
        })),
      };

      const res = await createHQManagedBusiness(payload);
      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to onboard school');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Progress (Sticky top) */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center justify-between w-full min-w-max gap-4">
          {[
            { s: 1, title: '1. Academic Profile' },
            { s: 2, title: '2. Campus & Admissions' },
            { s: 3, title: '3. Campus Media' },
            { s: 4, title: '4. Tuition & Classes' },
          ].map(({ s, title }) => (
            <button
              key={s}
              onClick={() => setStep(s as any)}
              className={`font-bold pb-1 flex items-center gap-1.5 transition-all ${
                step === s 
                  ? 'text-indigo-400 border-b-2 border-indigo-400' 
                  : step > s 
                  ? 'text-emerald-400' 
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              {step > s ? <Check size={14} /> : null}
              {title}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 text-slate-100">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Academic Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Institution / School Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Hillcrest International Academy, Calabar Royal College, Access Tech Academy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm font-bold px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Education Level
                </label>
                <select
                  value={schoolLevel}
                  onChange={(e) => setSchoolLevel(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  {SCHOOL_LEVELS.map(sl => <option key={sl} value={sl} className="bg-slate-950 text-white">{sl}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Educational Curriculum
                </label>
                <select
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  {CURRICULUM_OPTIONS.map(co => <option key={co} value={co} className="bg-slate-950 text-white">{co}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Campus Facilities (Select all that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CAMPUS_FACILITIES.map((facility) => {
                  const isSelected = selectedFacilities.includes(facility);
                  return (
                    <button
                      key={facility}
                      type="button"
                      onClick={() => toggleFacility(facility)}
                      className={`p-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                      }`}
                    >
                      <span>{facility}</span>
                      {isSelected && <Check size={14} className="text-indigo-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                About School & Academic Philosophy
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Nurturing future leaders in Calabar with high academic standards, STEM innovation, and character building..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Campus Location & Admissions Desk */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Campus Physical Address *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 Diamond Hill, Old Ikang Road, Calabar"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-sm pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Admissions Office Telephone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    placeholder="e.g. 08031122334"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>WhatsApp Parent Hotline *</span>
                  <span className="text-[10px] text-emerald-400 font-bold">Enrolment Inquiries</span>
                </label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    placeholder="e.g. 08123456789"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 placeholder:text-emerald-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Official School Portal / Website
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="url"
                  placeholder="e.g. https://hillcrestcalabar.edu.ng"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Campus Visuals & Virtual Tour */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                School Crest / Emblem
              </label>
              <MediaLinkOrUploadInput
                label="School Crest"
                value={logoUrl}
                onChange={setLogoUrl}
                placeholder="Paste school crest URL or upload file"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Hero Campus Cover Banner
              </label>
              <MediaLinkOrUploadInput
                label="Campus Banner"
                value={coverUrl}
                onChange={setCoverUrl}
                placeholder="Paste high-res campus photo URL or upload banner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Virtual Campus Tour Video (YouTube or Vimeo)
              </label>
              <input
                type="url"
                placeholder="e.g. https://www.youtube.com/watch?v=sampleCampusTour"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full text-xs px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Tuition & Classes */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Add Fee Tier Box */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} className="text-indigo-400" />
                + Add Class Level & Termly Tuition Fee
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Class Level (e.g. Primary 1, JSS 2)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 sm:col-span-2"
                />
                <input
                  type="number"
                  placeholder="Tuition (₦/term)"
                  value={newTuitionFee}
                  onChange={(e) => setNewTuitionFee(e.target.value)}
                  className="text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Inclusions (e.g. Books, ICT & lab fees included)"
                  value={newFeeNotes}
                  onChange={(e) => setNewFeeNotes(e.target.value)}
                  className="flex-1 text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddFeeTier}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  Add Fee Schedule
                </button>
              </div>
            </div>

            {/* Fee Schedule List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Configured Class Tuition Schedules ({feeSchedule.length} levels)
                </span>
                <span className="text-[11px] text-slate-500">Termly tuition structure in Nigerian Naira (₦)</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {feeSchedule.map((tier, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-sm text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <SchoolIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <span className="font-bold text-white">{tier.name}</span>
                        <p className="text-[11px] text-slate-400">{tier.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-indigo-400">₦{tier.price.toLocaleString()}<span className="text-[10px] text-slate-500 font-normal">/term</span></span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeeTier(idx)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove fee schedule"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation (Sticky bottom of wizard) */}
      <div className="sticky bottom-0 z-10 bg-slate-950/95 backdrop-blur-md px-6 py-3.5 border-t border-slate-800 flex items-center justify-between shrink-0">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((step - 1) as any)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((step + 1) as any)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            Continue <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? 'Onboarding School...' : 'Complete & Launch School'}
          </button>
        )}
      </div>
    </div>
  );
}
