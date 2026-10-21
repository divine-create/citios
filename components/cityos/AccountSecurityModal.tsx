'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Lock,
} from 'lucide-react';
import { getUserPasswordStatus, setUserPassword } from '@/app/actions/auth';

interface AccountSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

export default function AccountSecurityModal({
  isOpen,
  onClose,
  userEmail,
}: AccountSecurityModalProps) {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(userEmail || null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoadingStatus(true);
    setError('');
    setSuccess('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    getUserPasswordStatus()
      .then((res: any) => {
        if (!mounted) return;
        if (res && !res.error) {
          setHasPassword(Boolean(res.hasPassword));
          if (res.email) setAccountEmail(res.email);
        }
      })
      .catch((err) => {
        console.error('Failed to load password status:', err);
      })
      .finally(() => {
        if (mounted) setLoadingStatus(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (hasPassword && !currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await setUserPassword({
        currentPassword: hasPassword ? currentPassword : undefined,
        newPassword,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(res.message || 'Password saved successfully.');
        setHasPassword(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="security-modal-title" className="text-[16px] font-black text-ink leading-tight">
                Account Security & Password
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate max-w-[220px]">
                {accountEmail || 'Manage sign-in credentials'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {loadingStatus ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span className="text-xs font-bold">Checking security status...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Status Badge */}
              {!hasPassword ? (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                      Google Sign-In
                    </span>
                    <span className="text-[11px] font-bold text-amber-800">No password set yet</span>
                  </div>
                  <p className="text-[12px] text-amber-800/90 leading-relaxed font-medium">
                    You currently sign in using Google. Create a password below so you can also log in directly using your email and password.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-100 flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-teal-700 shrink-0" />
                  <p className="text-[12px] font-bold text-teal-900 leading-tight">
                    Direct Email & Password Sign-in is active on your account.
                  </p>
                </div>
              )}

              {/* Feedback messages */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-bold flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="flex-1 leading-relaxed">{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="flex-1 leading-relaxed">{success}</span>
                </div>
              )}

              {/* Current Password Field (Only shown if user already has a password) */}
              {hasPassword && (
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-600 flex items-center justify-between">
                    <span>Current Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full px-4 py-3 pr-11 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 text-[14px] font-bold text-ink placeholder:font-normal placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      tabIndex={-1}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password Field */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-600">
                  {hasPassword ? 'New Password' : 'Create Password'}
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 text-[14px] font-bold text-ink placeholder:font-normal placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-600">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-slate-50 border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-teal-600 text-[14px] font-bold text-ink placeholder:font-normal placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs inline-flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{hasPassword ? 'Update Password' : 'Set Account Password'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
