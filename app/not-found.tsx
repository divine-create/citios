import React from 'react';
import Link from 'next/link';
import { Home, Compass, Store, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center">
        {/* Brand Logo */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md shadow-teal-900/10 mb-4 border border-slate-100 shrink-0">
          <img src="/images/9jalive-logo.jpg" alt="9jaLive" className="w-full h-full object-cover" />
        </div>

        <span className="text-xs font-black tracking-widest text-teal-600 uppercase bg-teal-50 px-3 py-1 rounded-full mb-3">
          404 · Page Not Found
        </span>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          Lost in the city?
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          The page or business you are looking for does not exist, has moved, or is temporarily unavailable.
        </p>

        <div className="w-full flex flex-col gap-2.5">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>Return to City Home</span>
          </Link>

          <Link
            href="/explore"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
          >
            <Compass className="w-4 h-4" />
            <span>Explore City Directory</span>
          </Link>

          <Link
            href="/market"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition"
          >
            <Store className="w-4 h-4" />
            <span>Local Marketplaces</span>
          </Link>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-8">
        9jaLive Hyperlocal Operating System · All rights reserved.
      </p>
    </div>
  );
}
