import React from 'react';
import Link from 'next/link';
import { Package, Send, Settings, Users, BarChart3, Activity, UserCheck } from 'lucide-react';

export default function LogisticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-500" />
            CityDrive
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Logistics Operating System</p>
        </div>
        
        <nav className="p-4 flex-1 space-y-1">
          <Link
            href="/business/logisticsos/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
          >
            <Activity className="w-5 h-5 text-teal-400" />
            Live Operations
          </Link>
          <Link
            href="/business/logisticsos/dispatches"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
          >
            <Send className="w-5 h-5 text-blue-400" />
            Dispatch Board
          </Link>
          <Link
            href="/business/logisticsos/fleet"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
          >
            <Users className="w-5 h-5 text-emerald-400" />
            Fleet & Drivers
          </Link>
          <Link
            href="/business/logisticsos/customers"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
          >
            <UserCheck className="w-5 h-5 text-amber-400" />
            Customers & Booking
          </Link>
          <Link
            href="/business/logisticsos/settlements"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
          >
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Billing & Settlement
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link
            href="/business/logisticsos/pricing"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
          >
            <Settings className="w-4 h-4 text-slate-400" />
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
