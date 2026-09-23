import React, { Suspense } from 'react';
import LoginForm from './LoginForm';
import Link from 'next/link';
import { Building2, Store, Users, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Log in to CityConnect',
  description: 'Log into CityConnect to connect with your community, local businesses, schools, and city services.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col justify-between py-8 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto w-full flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16 my-auto">
        {/* Left Column: Brand & Tagline (Facebook Style) */}
        <div className="text-center lg:text-left lg:max-w-md xl:max-w-lg space-y-4">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-teal-800 to-teal-600 rounded-2xl flex items-center justify-center shadow-md shadow-teal-900/10 group-hover:scale-105 transition-transform">
              <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <span className="text-3xl sm:text-4xl font-black text-teal-800 tracking-tight">
              City<span className="text-slate-900">Connect</span>
            </span>
          </Link>

          <h2 className="text-xl sm:text-2xl xl:text-3xl font-bold text-slate-800 leading-snug">
            CityConnect helps you connect with your city, discover local stores, and manage everyday life with your neighbors.
          </h2>

          <div className="hidden lg:flex items-center gap-6 pt-2 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5">
              <Store className="w-4 h-4 text-teal-700" />
              <span>Local Marketplaces</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-700" />
              <span>Resident Community</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Verified Portals</span>
            </div>
          </div>
        </div>

        {/* Right Column: Facebook-style Elevated Login Card */}
        <div className="w-full max-w-[396px]">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-300/40 border border-slate-100">
            <Suspense fallback={<div className="text-center py-10 text-slate-400 text-sm">Loading sign in form...</div>}>
              <LoginForm />
            </Suspense>
          </div>

          <div className="text-center mt-6 text-xs text-slate-600">
            <Link href="/business/register" className="font-bold text-slate-800 hover:underline">
              Create a Business or Organization account
            </Link>{' '}
            for a school, store, hotel, or clinic.
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full pt-12 pb-4 text-center text-xs text-slate-400 border-t border-slate-200 mt-12">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-2 font-medium">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/explore" className="hover:underline">Explore</Link>
          <Link href="/market" className="hover:underline">CityMart</Link>
          <Link href="/schools" className="hover:underline">Schools</Link>
          <Link href="/services" className="hover:underline">Services</Link>
          <Link href="#" className="hover:underline">Privacy</Link>
          <Link href="#" className="hover:underline">Terms</Link>
        </div>
        <p>CityConnect Platform © {new Date().getFullYear()} · All rights reserved.</p>
      </footer>
    </div>
  );
}
