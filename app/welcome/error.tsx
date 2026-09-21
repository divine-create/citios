'use client';

import { useEffect } from 'react';

export default function WelcomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[WelcomeError]', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <section className="w-full max-w-lg rounded-3xl bg-white border border-red-100 shadow-xl p-6 sm:p-8">
        <h1 className="text-xl font-black text-slate-900">Welcome page could not load</h1>
        <p className="mt-2 text-sm text-slate-600">
          The server could not prepare your onboarding profile. Try again, or sign out and sign back in.
        </p>
        {error.digest && (
          <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-xs font-mono text-slate-600 break-all">
            Error digest: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 w-full rounded-xl bg-teal-800 px-4 py-3 text-sm font-black text-white hover:bg-teal-900"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
