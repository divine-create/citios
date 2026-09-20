import React, { Suspense } from 'react';
import RegisterForm from './RegisterForm';
import Link from 'next/link';
import { Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Create an Account | CityConnect',
  description: 'Join CityConnect to access local businesses, resident services, and community networks.',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-12 h-12 bg-gradient-to-tr from-teal-700 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-900/10 group-hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            City<span className="text-teal-600">Connect</span>
          </span>
        </Link>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Join your city network
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Create your personal resident account or get ready to manage your business
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-100">
          <Suspense fallback={<div className="text-center py-12 text-slate-400 text-sm">Loading registration...</div>}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
