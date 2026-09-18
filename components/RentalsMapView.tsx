import React from 'react';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

export default function RentalsMapView() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="max-w-lg text-center p-8">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-200 text-slate-500 flex items-center justify-center mb-6">
          <Building2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">Property rentals aren&apos;t connected yet</h1>
        <p className="text-slate-500 mb-8">
          CityOS can&apos;t show rental listings yet — a property and listings architecture is not part of the live system.
        </p>
        <Link href="/" className="inline-flex px-6 py-3 rounded-xl bg-teal-800 text-white font-bold hover:bg-teal-900 transition-colors">
          Return Home
        </Link>
      </div>
    </div>
  );
}
