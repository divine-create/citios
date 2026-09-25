import os

os.makedirs('app/(hq)/hq', exist_ok=True)

layout_content = """import React from 'react';
import Link from 'next/link';
import { requireSystemAdmin } from '@/lib/rbac';
import { ShieldAlert, Users, Building, Activity, Map, ArrowLeft, LogOut, FileText } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function HQLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSystemAdmin();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6">
          <Link href="/hq" className="flex items-center gap-2 text-white">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <span className="font-black text-xl tracking-tight">HQ<span className="text-slate-500">Command</span></span>
          </Link>
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-2">Platform Admin Only</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <Link href="/hq" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium text-slate-300 hover:text-white transition-colors">
            <Activity className="w-4 h-4" /> Overview
          </Link>
          <Link href="/hq/tenants" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium text-slate-300 hover:text-white transition-colors">
            <Building className="w-4 h-4" /> Tenants & Orgs
          </Link>
          <Link href="/hq/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium text-slate-300 hover:text-white transition-colors">
            <Users className="w-4 h-4" /> Citizens & Users
          </Link>
          <Link href="/hq/ledger" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium text-slate-300 hover:text-white transition-colors">
            <FileText className="w-4 h-4" /> Master Ledger
          </Link>
          <Link href="/hq/fleet" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium text-slate-300 hover:text-white transition-colors">
            <Map className="w-4 h-4" /> Logistics Fleet
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium text-slate-300 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Exit to CityOS
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-sm font-bold text-white">Secure Session: {session.user.name}</h2>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Live</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
"""

with open('app/(hq)/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(layout_content)
