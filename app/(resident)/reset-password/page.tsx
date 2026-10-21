'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyResetToken, resetPasswordWithToken } from '@/app/actions/auth';
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [accountEmail, setAccountEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      setTokenError('No reset token provided. Please use the link sent to your email.');
      return;
    }

    let mounted = true;
    verifyResetToken(token)
      .then((res) => {
        if (!mounted) return;
        if (res.valid) {
          setTokenValid(true);
          setAccountEmail(res.email || '');
        } else {
          setTokenValid(false);
          setTokenError(res.error || 'This password reset link is invalid or has expired.');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setTokenValid(false);
        setTokenError(err?.message || 'Failed to verify reset token.');
      })
      .finally(() => {
        if (mounted) setVerifying(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (newPassword.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await resetPasswordWithToken({
        token,
        newPassword,
      });

      if (res?.error) {
        setSubmitError(res.error);
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <span className="text-3xl font-black text-teal-800 tracking-tight">9jaLive</span>
          </Link>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Hyperlocal City Network
          </span>
        </div>

        {/* Card */}
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-3xl rounded-2xl border border-slate-100 sm:px-10">
          {verifying ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-500">Verifying security token...</p>
            </div>
          ) : !tokenValid ? (
            /* Invalid or Expired State */
            <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200/60 shadow-sm">
                <ShieldAlert className="w-7 h-7" />
              </div>

              <h1 className="text-xl font-black text-ink tracking-tight mb-2">
                Link Invalid or Expired
              </h1>

              <p className="text-xs text-slate-600 leading-relaxed mb-6 max-w-sm mx-auto">
                {tokenError || 'This password reset link is invalid, expired, or has already been used.'}
              </p>

              <div className="space-y-3">
                <Link
                  href="/forgot-password"
                  className="block w-full py-3 px-4 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-teal-900/10 text-center"
                >
                  Request a New Reset Link
                </Link>

                <Link
                  href="/login"
                  className="block text-center py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : isSuccess ? (
            /* Success State */
            <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-800 flex items-center justify-center mx-auto mb-4 border border-teal-100 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h1 className="text-xl font-black text-ink tracking-tight mb-2">
                Password Reset Complete!
              </h1>

              <p className="text-xs text-slate-600 leading-relaxed mb-6 max-w-sm mx-auto">
                Your account password has been updated successfully. You can now log in using your new credentials.
              </p>

              <Link
                href="/login"
                className="w-full py-3.5 px-4 bg-teal-800 hover:bg-teal-900 active:scale-[0.99] text-white font-black text-[14px] rounded-xl shadow-md shadow-teal-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* Active Reset Password Form */
            <div className="animate-in fade-in duration-200">
              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mb-4">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-black text-ink tracking-tight">
                  Choose New Password
                </h1>
                <p className="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">
                  {accountEmail ? (
                    <>
                      Setting a new password for <span className="font-bold text-slate-800">{accountEmail}</span>.
                    </>
                  ) : (
                    'Enter your new password below.'
                  )}
                </p>
              </div>

              {submitError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold leading-relaxed animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-4 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full pl-4 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400">
                  Password must be at least 6 characters. Use letters, numbers, and symbols for better security.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 bg-teal-800 hover:bg-teal-900 active:scale-[0.99] disabled:opacity-60 text-white font-black text-[14px] rounded-xl shadow-md shadow-teal-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving new password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
