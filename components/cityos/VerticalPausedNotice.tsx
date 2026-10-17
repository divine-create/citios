'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';

interface VerticalPausedNoticeProps {
  verticalName: string;
  verticalId: string;
  description?: string;
  backUrl?: string;
}

export default function VerticalPausedNotice({
  verticalName,
  verticalId,
  description,
  backUrl = '/',
}: VerticalPausedNoticeProps) {
  return (
    <div className="max-w-lg mx-auto text-center py-20 px-4 animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center mx-auto mb-5 shadow-xs">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-md border border-amber-200/60 inline-block mb-3">
        Service Paused
      </span>

      <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
        {verticalName} is temporarily unavailable
      </h1>

      <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-8">
        {description ||
          `${verticalName} is currently undergoing scheduled maintenance or is paused in this city. Please check back shortly.`}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href={backUrl}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to CityOS Home
        </Link>
        <Link
          href="/food"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
        >
          Explore CityFood <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
