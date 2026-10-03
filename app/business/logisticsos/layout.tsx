import React from 'react';
import Link from 'next/link';
import { Package, Map, Settings, Users, BarChart3, Activity } from 'lucide-react';

export default function LogisticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-500" />
            LogisticsOS
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Provider Dashboard</p>
        </div>
        
        <nav className="p-4 flex-1 space-y-1">
          <Link href="/business/logisticsos/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-900/40 text-teal-400 font-medium">
            <Activity className="w-5 h-5" />
            Live Operations
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors">
            <Map className="w-5 h-5" />
            Dispatch Map
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors">
            <Users className="w-5 h-5" />
            Fleet & Drivers
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors">
            <BarChart3 className="w-5 h-5" />
            Settlements
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm">
            <Settings className="w-4 h-4" />
            Pricing Rules
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
