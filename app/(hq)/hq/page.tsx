import React from 'react';
import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { getHQCommandCenterData } from '@/lib/actions/hq-dashboard';
import { Activity, Users, Building, Truck, Wallet, ShieldAlert, ArrowRight, History } from 'lucide-react';
import Link from 'next/link';

export default async function HQDashboardPage() {
  await requireSystemAdmin();

  const { metrics, activity } = await getHQCommandCenterData();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">CityOS HQ</h1>
        <p className="text-slate-400 mt-2">Platform Control Plane & Operational Snapshot</p>
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-3 text-slate-400 mb-4">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Total Citizens</h3>
          </div>
          <p className="text-4xl font-black text-white">{metrics.users.total}</p>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-3 text-slate-400 mb-4">
            <Building className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Active Tenants</h3>
          </div>
          <p className="text-4xl font-black text-white">{metrics.organizations.active}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-3 text-slate-400 mb-4">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Suspended Orgs</h3>
          </div>
          <p className="text-4xl font-black text-white">{metrics.organizations.suspended}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-3 text-slate-400 mb-4">
            <Truck className="w-5 h-5 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Logistics Fleet</h3>
          </div>
          <p className="text-4xl font-black text-white">{metrics.fleet.total}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-3 text-slate-400 mb-4">
            <Wallet className="w-5 h-5 text-purple-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Platform Wallet</h3>
          </div>
          <p className="text-4xl font-black text-white">&#8358;{metrics.wallet?.balance?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Platform Activity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-slate-400">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Recent Tenants</h3>
            </div>
            <Link href="/hq/tenants" className="text-sm font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4 flex-1">
            {activity.recentOrganizations.map((org: any) => (
              <div key={org.id} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                <div>
                  <p className="text-sm font-black text-white">{org.name}</p>
                  <p className="text-xs text-slate-400">{org.type} - {new Date(org.createdAt).toLocaleDateString()}</p>
                </div>
                <Link href={`/hq/tenants/${org.id}`} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
                  Inspect
                </Link>
              </div>
            ))}
            {activity.recentOrganizations.length === 0 && <p className="text-slate-500 text-sm">No recent tenants.</p>}
          </div>
        </div>

        {/* Governance Activity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-slate-400">
              <History className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Governance Audit</h3>
            </div>
            <Link href="/hq/activity" className="text-sm font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View Trail <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4 flex-1">
            {activity.recentAudits.map((audit: any) => (
              <div key={audit.id} className="flex flex-col bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between">
                  <p className="text-sm font-black text-white">{audit.action}</p>
                  <p className="text-xs text-slate-400">{new Date(audit.createdAt).toLocaleTimeString()}</p>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Target: {audit.targetType} ({audit.targetId.split('-')[0]})
                </p>
              </div>
            ))}
            {activity.recentAudits.length === 0 && <p className="text-slate-500 text-sm">No recent audit logs.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
