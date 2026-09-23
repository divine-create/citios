'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const urlError = searchParams.get('error');

  const [identifier, setIdentifier] = useState(''); // email or phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>(() => {
    if (!urlError) return '';
    if (urlError === 'CredentialsSignin') return 'Incorrect email/phone or password. Please try again.';
    if (urlError === 'OAuthSignin' || urlError === 'OAuthCallback') return 'Google Sign-In is not configured yet. Please log in with your email or phone.';
    if (urlError === 'Configuration') return 'Authentication server configuration update in progress. Please log in with email/phone.';
    return 'An authentication error occurred. Please try again with your email or phone.';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Please enter your email or phone number.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: cleanIdentifier,
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setError('Incorrect email/phone or password. Please try again or create an account.');
        setLoading(false);
        return;
      }

      // Successful login
      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await signIn('google', { callbackUrl, redirect: false });
      if (res?.error) {
        setError('Google Sign-In is not configured on this server yet. Please log in with your email or phone.');
        setLoading(false);
      }
    } catch {
      setError('Google Sign-In is not configured on this server yet. Please log in with your email or phone.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold leading-relaxed animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <input
            type="text"
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Email address or phone number"
            className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all"
          />
        </div>

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full pl-4 pr-11 py-3.5 bg-white border border-slate-300 rounded-xl text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-teal-700 hover:bg-teal-800 active:scale-[0.99] disabled:opacity-60 text-white font-black text-[16px] rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
        </button>
      </form>

      {/* Forgotten Password link */}
      <div className="text-center pt-1">
        <Link
          href={`#?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-[13px] font-semibold text-teal-700 hover:underline inline-block"
        >
          Forgotten password?
        </Link>
      </div>

      {/* Divider */}
      <div className="relative my-3">
        <div className="border-t border-slate-200 w-full" />
      </div>

      {/* Create New Account Button (Facebook style green CTA) */}
      <div className="text-center">
        <Link
          href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-[14px] rounded-xl shadow-sm transition-all"
        >
          Create new account
        </Link>
      </div>

      {/* Social / Alternative Sign-in */}
      <div className="pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
