'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateFullProfile, updateProfileAvatar } from '@/lib/actions/profile';
import { getPresignedUploadUrl } from '@/app/actions/upload';
import { ChevronLeft, Save, Loader2, Camera, Upload, Trash2 } from 'lucide-react';
import Link from 'next/link';

const INTEREST_TAGS = [
  'Foodie', 'Nightlife', 'Sports & Fitness', 'Arts & Culture',
  'Live Music', 'Families & Kids', 'Tech & Startups', 'Volunteering',
  'Shopping', 'Pets', 'Gaming', 'Wellness',
];

type City = { id: string; name: string; country: string };

export default function EditProfileClient({ cities, initialData }: { cities: City[], initialData: any }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  
  const parsedInterests = initialData.residentProfile?.interests 
    ? (typeof initialData.residentProfile.interests === 'string' 
        ? JSON.parse(initialData.residentProfile.interests) 
        : initialData.residentProfile.interests) 
    : [];

  const [avatarUrl, setAvatarUrl] = useState<string>(
    initialData.residentProfile?.avatarUrl || initialData.image || ''
  );

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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile image must be less than 5MB.');
      return;
    }

    setUploadingPhoto(true);
    setError('');

    try {
      const ext = file.name.split('.').pop() || 'png';
      const type = file.type || 'image/png';
      const { signedUrl, publicUrl } = await getPresignedUploadUrl(type, ext);

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image to storage.');
      }

      setAvatarUrl(publicUrl);
      await updateProfileAvatar(publicUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    try {
      setAvatarUrl('');
      await updateProfileAvatar('');
    } catch (err: any) {
      console.error(err);
      setError('Failed to remove photo');
    } finally {
      setUploadingPhoto(false);
    }
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
      await updateFullProfile({
        ...form,
        avatarUrl,
      });
      router.push('/profile');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const initials = `${(form.firstName || 'U')[0]}${(form.lastName || '')[0] || ''}`.toUpperCase();

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

        {/* Profile Picture Upload Section */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-white shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center text-3xl font-black shadow-md">
                {initials}
              </div>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center text-white">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <h3 className="text-sm font-black text-ink">Profile Picture</h3>
            <p className="text-[12px] text-slate-500 font-medium">
              Upload a clear photo to help your neighbors and city recognize you. Max 5MB.
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2.5 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-[12px] font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {avatarUrl ? 'Change photo' : 'Upload photo'}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 text-[12px] font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

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
