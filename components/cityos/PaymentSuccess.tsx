'use client';

import Link from 'next/link';
import { Check, Truck } from 'lucide-react';

export default function PaymentSuccess() {
  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
        <Check className="w-7 h-7" />
      </div>
      <h1 className="text-lg font-black text-ink">Payment received</h1>
      <p className="text-sm text-slate-500">Your order went through. Track it with CityDrive.</p>
      <Link href="/drive/delivery" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">
        <Truck className="w-3.5 h-3.5" /> Track delivery
      </Link>
    </div>
  );
}
