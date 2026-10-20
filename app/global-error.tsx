'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-200 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md mb-4 border border-slate-100 shrink-0">
            <img src="/images/9jalive-logo.jpg" alt="9jaLive" className="w-full h-full object-cover" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-2">Application Error</h1>
          <p className="text-sm text-slate-500 mb-6">
            A critical system error occurred. Please refresh or try again shortly.
          </p>

          <button
            onClick={() => reset()}
            className="w-full py-3 px-4 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
