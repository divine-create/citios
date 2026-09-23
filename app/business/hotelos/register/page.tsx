import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import HotelRegisterForm from "./HotelRegisterForm";
import Link from 'next/link';

export const metadata = {
  title: 'Register HOTEL | CityConnect HOTELOS',
  description: 'Onboard your educational institution into CityOS.',
};

export default async function RegisterHOTELPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <nav className="w-full bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/business/HOTELos" className="font-bold text-xl tracking-tight text-slate-900">CityOS <span className="text-blue-600">HOTEL</span></Link>
          <div className="text-sm font-medium text-slate-500">
            {session ? (
              <span>Logged in as <strong className="text-slate-900">{session.user?.name || session.user?.email}</strong></span>
            ) : (
              <span>Sign in required</span>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-blue-600 p-8 text-white text-center">
            <h1 className="text-3xl font-black mb-2">HOTEL Registration</h1>
            <p className="text-blue-100">Tell us about your institution to set up your HOTELOS portal.</p>
          </div>
          <div className="p-8 md:p-10">
            <HotelRegisterForm isLoggedIn={!!session} />
          </div>
        </div>
      </div>
    </div>
  );
}


