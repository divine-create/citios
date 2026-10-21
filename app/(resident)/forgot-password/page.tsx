'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { requestPasswordReset } from '@/app/actions/auth';
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Send,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestPasswordReset({ email: cleanEmail });
      if (res && 'error' in res) {
        setError(res.error);
      } else {
        setIsSuccess(true);
        setCooldown(60);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to process your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await requestPasswordReset({ email: email.trim().toLowerCase() });
      if (res && 'error' in res) {
        setError(res.error);
      } else {
        setCooldown(60);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to resend email. Please try again.');
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
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Sign In
          </Link>

          {!isSuccess ? (
            <div>
              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mb-4">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-black text-ink tracking-tight">
                  Forgot your password?
                </h1>
                <p className="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">
                  Enter your registered email address and we will send you a secure link to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold leading-relaxed animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-[12px] font-bold text-slate-600 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@domain.com"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 bg-teal-800 hover:bg-teal-900 active:scale-[0.99] disabled:opacity-60 text-white font-black text-[14px] rounded-xl shadow-md shadow-teal-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Protected by CityOS Identity Security</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-800 flex items-center justify-center mx-auto mb-4 border border-teal-100 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-xl font-black text-ink tracking-tight mb-2">
                Check Your Email
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed mb-6 max-w-sm mx-auto">
                If an account exists for <span className="font-bold text-slate-900">{email}</span>, we have dispatched a password reset link. Please check your inbox and spam folder.
              </p>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-slate-500 text-[12px] leading-relaxed mb-6">
                The link is valid for <span className="font-bold text-slate-800">30 minutes</span>. After that, you will need to request a new link.
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || submitting}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] disabled:opacity-50 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {submitting
                    ? 'Resending...'
                    : cooldown > 0
                    ? `Resend link in ${cooldown}s`
                    : 'Resend Email'}
                </button>

                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="block text-center py-2 text-xs font-bold text-teal-700 hover:underline"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
