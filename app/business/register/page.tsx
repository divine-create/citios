import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import RegisterForm from "./RegisterForm";
import Link from 'next/link';

export const metadata = {
  title: 'Register Institution | CityConnect',
  description: 'Create your CityOS organization and start managing your institution.',
};

export default async function RegisterBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await searchParams;
  const initialType = (resolvedParams.type || "SCHOOL").toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Simple Header */}
      <nav className="w-full bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight text-slate-900">City<span className="text-blue-600">OS</span></Link>
          <div className="text-sm font-medium text-slate-500">
            {session ? (
              <span>Logged in as <strong className="text-slate-900">{session.user?.name || session.user?.email}</strong></span>
            ) : (
              <span>Sign in required</span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-blue-600 p-6 text-white text-center">
            <h1 className="text-2xl font-black mb-2">Register your {initialType.toLowerCase()}</h1>
            <p className="text-blue-100 text-sm">Join the CityConnect operating system today.</p>
          </div>
          <div className="p-8">
            <RegisterForm initialType={initialType} isLoggedIn={!!session} />
          </div>
        </div>
      </div>
    </div>
  );
}
