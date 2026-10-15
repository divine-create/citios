import React from 'react';
import { requireSystemAdmin } from '@/lib/rbac';
import { getHQCommandCenterData } from '@/lib/actions/hq-dashboard';
import { Activity, Users, Building, Truck, Wallet, ShieldAlert, ArrowRight, History, Map, ShieldCheck, Sparkles, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

function formatDate(temporalOrDate: any): string {
  try {
    if (!temporalOrDate) return '-';
    const str = temporalOrDate.toString ? temporalOrDate.toString() : String(temporalOrDate);
    return new Date(str).toLocaleDateString();
  } catch {
    return '-';
  }
}

function formatTime(temporalOrDate: any): string {
  try {
    if (!temporalOrDate) return '-';
    const str = temporalOrDate.toString ? temporalOrDate.toString() : String(temporalOrDate);
    return new Date(str).toLocaleTimeString();
  } catch {
    return '-';
  }
}

export default async function HQDashboardPage() {
  await requireSystemAdmin();

  const { metrics, activity } = await getHQCommandCenterData();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">CityOS HQ Command</h1>
          <p className="text-slate-400 mt-1">Platform Control Plane & Operational Snapshot</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400">
            Active Cities: <strong className="text-white font-mono">{metrics.cities?.total || 1}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400">
            Platform Wallet: <strong className="text-purple-400 font-mono">&#8358;{metrics.wallet?.balance?.toLocaleString() || '0.00'}</strong>
          </span>
        </div>
      </div>

      {/* Managed Businesses Quick Launch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/hq/managed"
          className="bg-gradient-to-r from-teal-950/60 to-slate-900 border border-teal-500/30 rounded-2xl p-5 hover:border-teal-500/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Managed Businesses Studio</h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase">
                  Admin Custodian
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Insert menus, prices in ₦, link/upload images, video tours, and publish proxy broadcasts.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-teal-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>

        <Link
          href="/hq/orders"
          className="bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/30 rounded-2xl p-5 hover:border-amber-500/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">HQ Managed Orders & Dispatch</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                  Resident Orders
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Total admin control to coordinate, fulfill, and dispatch resident orders for unconfirmed spots.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>
      </div>

      {/* Action Banners for Pending Tasks */}
      {(metrics.discovery?.pending > 0 || metrics.claims?.pending > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.discovery?.pending > 0 && (
            <Link
              href="/hq/discovery"
              className="bg-teal-950/40 border border-teal-800/60 rounded-2xl p-5 hover:bg-teal-900/30 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
                  <Map className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Staged Businesses Awaiting Review</h3>
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase">
                      Action Required
                    </span>
                  </div>
                  <p className="text-xs text-teal-200/80 mt-1">
                    <strong className="text-white font-mono">{metrics.discovery.pending}</strong> businesses staged from directories are waiting to be verified and published.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-teal-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>
          )}

          {metrics.claims?.pending > 0 && (
            <Link
              href="/hq/claims"
              className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-5 hover:bg-amber-900/30 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Business Ownership Claims</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                      Action Required
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/80 mt-1">
                    <strong className="text-white font-mono">{metrics.claims.pending}</strong> claimant submissions need phone and address verification.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Link href="/hq/discovery" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-teal-500/50 transition-colors block">
          <div className="flex items-center gap-2.5 text-slate-400 mb-3">
            <Map className="w-4 h-4 text-teal-400" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest">Discovery Staging</h3>
          </div>
          <p className="text-3xl font-black text-white">{metrics.discovery?.pending || 0}</p>
          <p className="text-[11px] text-teal-400/80 font-medium mt-1.5">{metrics.discovery?.published || 0} published live</p>
        </Link>

        <Link href="/hq/claims" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/50 transition-colors block">
          <div className="flex items-center gap-2.5 text-slate-400 mb-3">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest">Pending Claims</h3>
          </div>
          <p className="text-3xl font-black text-white">{metrics.claims?.pending || 0}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1.5">Owner verifications</p>
        </Link>

        <Link href="/hq/tenants" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/50 transition-colors block">
          <div className="flex items-center gap-2.5 text-slate-400 mb-3">
            <Building className="w-4 h-4 text-emerald-500" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest">Active Tenants</h3>
          </div>
          <p className="text-3xl font-black text-white">{metrics.organizations?.active || 0}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1.5">{metrics.organizations?.suspended || 0} suspended</p>
        </Link>

        <Link href="/hq/users" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/50 transition-colors block">
          <div className="flex items-center gap-2.5 text-slate-400 mb-3">
            <Users className="w-4 h-4 text-blue-500" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest">Total Citizens</h3>
          </div>
          <p className="text-3xl font-black text-white">{metrics.users?.total || 0}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1.5">Registered residents</p>
        </Link>

        <Link href="/hq/fleet" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/50 transition-colors block">
          <div className="flex items-center gap-2.5 text-slate-400 mb-3">
            <Truck className="w-4 h-4 text-amber-500" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest">Logistics Fleet</h3>
          </div>
          <p className="text-3xl font-black text-white">{metrics.fleet?.total || 0}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-1.5">Couriers & Drivers</p>
        </Link>

        <Link href="/hq/ledger" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-purple-500/50 transition-colors block">
          <div className="flex items-center gap-2.5 text-slate-400 mb-3">
            <Wallet className="w-4 h-4 text-purple-500" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest">Platform Wallet</h3>
          </div>
          <p className="text-2xl font-black text-white truncate">&#8358;{metrics.wallet?.balance ? Math.round(metrics.wallet.balance).toLocaleString() : '0'}</p>
          <p className="text-[11px] text-purple-400 font-medium mt-1.5">Master balance</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Organizations */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-slate-400">
              <Building className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Recent Organizations</h3>
            </div>
            <Link href="/hq/tenants" className="text-xs font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3 flex-1">
            {activity.recentOrganizations.map((org: any) => (
              <div key={org.id} className="flex justify-between items-center bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-black text-white truncate">{org.name}</p>
                  <p className="text-xs text-slate-400">{org.type} · {formatDate(org.createdAt)}</p>
                </div>
                <Link href={`/hq/tenants/${org.id}`} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0">
                  Inspect
                </Link>
              </div>
            ))}
            {activity.recentOrganizations.length === 0 && <p className="text-slate-500 text-xs py-4 text-center">No recent organizations.</p>}
          </div>
        </div>

        {/* Governance Activity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-slate-400">
              <History className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Governance Audit Trail</h3>
            </div>
            <Link href="/hq/activity" className="text-xs font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View Trail <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3 flex-1">
            {activity.recentAudits.map((audit: any) => (
              <div key={audit.id} className="flex justify-between items-center bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-black text-white">{audit.action}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Target: {audit.targetType} ({audit.targetId?.slice(0, 8)}) · {formatTime(audit.createdAt)}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 shrink-0">
                  {formatDate(audit.createdAt)}
                </span>
              </div>
            ))}
            {activity.recentAudits.length === 0 && <p className="text-slate-500 text-xs py-4 text-center">No recent audit logs.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
