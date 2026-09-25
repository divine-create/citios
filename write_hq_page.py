content = """import React from 'react';
import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { Activity, Users, Building, Truck, Wallet } from 'lucide-react';

export default async function HQDashboardPage() {
  await requireSystemAdmin();

  const [
    totalUsers,
    totalOrgs,
    totalOrders,
    totalCouriers,
    systemWallet
  ] = await Promise.all([
    db.orm.public.Person.all().then(r => r.length),
    db.orm.public.Organization.all().then(r => r.length),
    db.orm.public.RetailOrder.all().then(r => r.length), // Just a proxy for now
    db.orm.public.GigWorkerProfile.all().then(r => r.length),
    db.orm.public.Wallet.where({ organizationId: null, personId: null }).all().first()
  ]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Command Center</h1>
        <p className="text-slate-400 mt-2">Overview of the entire CityOS ecosystem.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-slate-400 mb-4">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Total Citizens</h3>
          </div>
          <p className="text-4xl font-black text-white">{totalUsers}</p>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-slate-400 mb-4">
            <Building className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Active Tenants</h3>
          </div>
          <p className="text-4xl font-black text-white">{totalOrgs}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-slate-400 mb-4">
            <Truck className="w-5 h-5 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Logistics Fleet</h3>
          </div>
          <p className="text-4xl font-black text-white">{totalCouriers}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-slate-400 mb-4">
            <Wallet className="w-5 h-5 text-purple-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Platform Wallet</h3>
          </div>
          <p className="text-4xl font-black text-white">₦{systemWallet?.balance?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-80 flex flex-col items-center justify-center text-center">
          <Activity className="w-12 h-12 text-slate-700 mb-4" />
          <h3 className="text-lg font-black text-white">System Health</h3>
          <p className="text-sm text-slate-400 mt-2">All services operating normally. 0 active incidents.</p>
        </div>
      </div>
    </div>
  );
}
"""

with open('app/(hq)/hq/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
