'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, Building2 } from 'lucide-react';

export default function OrgProfileErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('OrgProfile error caught by boundary:', error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto text-center py-16 px-4 space-y-5 animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-800 flex items-center justify-center mx-auto shadow-sm border border-teal-100">
        <Building2 className="w-8 h-8" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          Business Profile Temporarily Unavailable
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          We experienced a momentary issue loading this merchant&apos;s details. You can try refreshing or explore other verified businesses across the city.
        </p>
      </div>

      {process.env.NODE_ENV !== 'production' && error?.message && (
        <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 overflow-auto max-h-32">
          {error.message}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
        <Link
          href="/directory"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </Link>
      </div>
    </div>
  );
}
