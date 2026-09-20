'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateFullProfile, updateProfileAvatar } from '@/lib/actions/profile';
import { getPresignedUploadUrl } from '@/app/actions/upload';
import { getUserPasswordStatus, setUserPassword } from '@/app/actions/auth';
import {
  ChevronLeft,
  Save,
  Loader2,
  Upload,
  Trash2,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import StateLgaSelect, { CityOption } from '@/components/cityos/StateLgaSelect';
import DateOfBirthPicker from '@/components/cityos/DateOfBirthPicker';
import { INTEREST_CATEGORIES } from '@/components/cityos/interestTags';

export default function EditProfileClient({
  cities,
  initialData,
}: {
  cities: CityOption[];
  initialData: any;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');

  const parsedInterests = initialData.residentProfile?.interests
    ? typeof initialData.residentProfile.interests === 'string'
      ? JSON.parse(initialData.residentProfile.interests)
      : initialData.residentProfile.interests
    : [];

  const [avatarUrl, setAvatarUrl] = useState<string>(
    initialData.residentProfile?.avatarUrl || initialData.image || ''
  );

  const [form, setForm] = useState({
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    homeCityId: initialData.homeCityId || '',
    dateOfBirth: initialData.dateOfBirth
      ? new Date(initialData.dateOfBirth).toISOString().split('T')[0]
      : '',
    phone: initialData.residentProfile?.phone || '',
    interests: parsedInterests as string[],
  });

  // Password management state
  const [passwordStatus, setPasswordStatus] = useState<{
    hasPassword: boolean;
    email?: string | null;
  } | null>(null);
  const [loadingPasswordStatus, setLoadingPasswordStatus] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await getUserPasswordStatus();
        if (res && !('error' in res)) {
          setPasswordStatus(res);
        }
      } catch (e) {
        console.error('Failed to load password status', e);
      } finally {
        setLoadingPasswordStatus(false);
      }
    }
    loadStatus();
  }, []);

  const toggleInterest = (tag: string) => {
    setForm((prev) => {
      if (prev.interests.includes(tag)) {
        return { ...prev, interests: prev.interests.filter((t) => t !== tag) };
      }
      if (prev.interests.length >= 8) return prev;
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
    setError('');

    if (!form.firstName || !form.lastName) {
      setError('First and last name are required.');
      return;
    }

    if (!form.phone || form.phone.trim().length < 7) {
      setError('A valid phone number is required.');
      return;
    }

    setLoading(true);

    try {
      await updateFullProfile({
        ...form,
        phone: form.phone.trim(),
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    if (passwordStatus?.hasPassword && !passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await setUserPassword({
        currentPassword: passwordForm.currentPassword || undefined,
        newPassword: passwordForm.newPassword,
      });

      if (res.error) {
        setPasswordError(res.error);
      } else {
        setPasswordSuccess(res.message || 'Password updated successfully.');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setPasswordStatus({ hasPassword: true, email: passwordStatus?.email });
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const initials = `${(form.firstName || 'U')[0]}${(form.lastName || '')[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Personal Info Card */}
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

          {/* Name fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-slate-500">First Name *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-500 text-[14px] font-bold text-ink"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-slate-500">Last Name *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-500 text-[14px] font-bold text-ink"
              />
            </div>
          </div>

          {/* Phone Number (Mandatory) */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-teal-700" />
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-500 text-[14px] font-bold text-ink"
              placeholder="+234 800 000 0000"
            />
            <p className="text-[11px] text-slate-400">
              Required for service bookings, marketplace orders, and account verification.
            </p>
          </div>

          {/* State -> Local Government Filter & Search */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <StateLgaSelect
              cities={cities}
              value={form.homeCityId}
              onChange={(id) => setForm({ ...form, homeCityId: id })}
              label="Home City / Local Government Area"
              required
            />
          </div>

          {/* Segmented Date of Birth Picker */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <DateOfBirthPicker
              value={form.dateOfBirth}
              onChange={(dob) => setForm({ ...form, dateOfBirth: dob })}
              label="Date of Birth"
              required
            />
          </div>

          {/* Categorized Interests */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div>
              <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider block">
                Interests & Passions (pick up to 8)
              </label>
              <p className="text-[11px] text-slate-400 mb-3">
                Help us personalize your city experience, recommendations, and local notifications.
              </p>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {INTEREST_CATEGORIES.map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${
                            selected
                              ? 'bg-teal-800 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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

          <div className="pt-4 pb-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-teal-800 hover:bg-teal-900 active:scale-[0.98] transition-all text-white font-black text-[15px] flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>

      {/* Password & Security Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-black text-ink">Account Security & Password</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {passwordStatus?.hasPassword
                  ? 'Update your password for direct email sign-in'
                  : 'Set a password to enable email & password sign-in'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
          {passwordSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-100">
              {passwordError}
            </div>
          )}

          {loadingPasswordStatus ? (
            <div className="py-6 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-semibold">Checking security status...</span>
            </div>
          ) : (
            <>
              {!passwordStatus?.hasPassword && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium leading-relaxed">
                  <strong>Notice:</strong> Your account was created with Google OAuth. Create a password below so you can also log in directly using your email (<strong>{passwordStatus?.email || 'your email'}</strong>) and password.
                </div>
              )}

              {passwordStatus?.hasPassword && (
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-500">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-500 text-[14px] font-bold text-ink"
                    placeholder="Enter current password"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-500">
                    {passwordStatus?.hasPassword ? 'New Password' : 'Create Password'}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-500 text-[14px] font-bold text-ink"
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-500">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-500 text-[14px] font-bold text-ink"
                    placeholder="Re-enter password"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all text-white font-black text-[13px] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {passwordLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  {passwordStatus?.hasPassword ? 'Update Password' : 'Set Account Password'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
