'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, AlertCircle, HelpCircle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center">
        {/* Brand Logo */}
        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md shadow-teal-900/10 mb-4 border border-slate-100 shrink-0">
          <img src="/images/9jalive-logo.jpg" alt="9jaLive" className="w-full h-full object-cover" />
        </div>

        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h1 className="text-xl font-black text-slate-900 tracking-tight mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          We encountered an unexpected issue while loading this view. Your session and data remain safe.
        </p>

        {process.env.NODE_ENV !== 'production' && error?.message && (
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 text-left overflow-auto max-h-32 text-xs font-mono text-slate-700">
            {error.message}
          </div>
        )}

        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>

          <Link
            href="/support"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Get Support</span>
          </Link>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-8">
        9jaLive Hyperlocal Operating System · All rights reserved.
      </p>
    </div>
  );
}
