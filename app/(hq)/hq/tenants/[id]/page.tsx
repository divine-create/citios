import React from 'react';
import { inspectOrganization } from '@/lib/actions/hq';
import { requireSystemAdmin } from '@/lib/rbac';
import { Building, MapPin, Users, Wallet, Activity, ShieldAlert, ArrowLeft, MoreVertical, Key, Eye } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import TenantActions from '@/components/hq/TenantActions';

export default async function Tenant360Page({ params }: { params: Promise<{ id: string }> }) {
  await requireSystemAdmin();
  const { id } = await params;
  
  const data = await inspectOrganization(id);
  const org = data.organization;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/hq/tenants" className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            {org.name}
            {org.status === 'SUSPENDED' && <Badge variant="error" className="bg-red-500/10 text-red-400 border border-red-500/20 text-sm py-1">Suspended</Badge>}
          </h1>
          <p className="text-slate-400 mt-1 font-mono text-xs">{org.id}</p>
        </div>
        <div className="ml-auto">
          <TenantActions orgId={org.id} status={org.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Core Info */}
        <div className="col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Building className="w-4 h-4" /> Identity
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-bold mb-1">Type</p>
                <Badge className="bg-slate-800 text-slate-300 border border-slate-700">{org.type}</Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold mb-1">Created At</p>
                <p className="text-sm text-white font-medium">{new Date(org.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Memberships ({data.memberships.length})
            </h3>
            <div className="space-y-3">
              {data.memberships.map((m: any) => (
                <div key={m.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                  <div className="truncate pr-2">
                    <p className="text-sm font-bold text-white truncate">{m.person.firstName} {m.person.lastName}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {m.roles.map((r: any) => (
                        <Badge key={r.id} className="text-[9px] px-1.5 py-0 bg-slate-700 text-slate-300 border-none">{r.role}</Badge>
                      ))}
                    </div>
                  </div>
                  <Link href={`/hq/users/${m.personId}`} className="shrink-0 p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors tooltip" title="View Person">
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
              {data.memberships.length === 0 && <p className="text-xs text-slate-500">No members attached.</p>}
            </div>
          </div>
        </div>

        {/* Financials & Activity */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Locations
              </h3>
              <p className="text-3xl font-black text-white">{data.locations.length}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Wallet Balances
              </h3>
              <p className="text-sm text-slate-400">Ledger details omitted in snapshot</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> HQ Governance Audit
              </h3>
            </div>
            <div className="divide-y divide-slate-800/50">
              {data.recentAuditEvents.map((audit: any) => (
                <div key={audit.id} className="p-4 hover:bg-slate-800/20 transition-colors flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black text-white">{audit.action}</p>
                    </div>
                    <p className="text-xs text-slate-400">Actor ID: <Link href={`/hq/users/${audit.actorPersonId}`} className="text-emerald-400 hover:underline">{audit.actorPersonId.split('-')[0]}</Link></p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-4 text-right">{new Date(audit.createdAt).toLocaleString()}</span>
                </div>
              ))}
              {data.recentAuditEvents.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">No governance actions recorded for this tenant.</div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
             <div className="p-6 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Recent Operational Activity
              </h3>
            </div>
            <div className="divide-y divide-slate-800/50">
              {data.recentTransactions.map((tx: any) => (
                <div key={tx.id} className="p-4 hover:bg-slate-800/20 transition-colors flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-white">Transaction</p>
                    <p className="text-xs text-slate-500 mt-1">{tx.status}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono text-slate-300 font-bold">{tx.amount.toFixed(2)} {tx.currency}</span>
                    <p className="text-xs text-slate-500 mt-1">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {data.recentOrders.map((o: any) => (
                <div key={o.id} className="p-4 hover:bg-slate-800/20 transition-colors flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-white">Retail Order</p>
                    <span className="text-xs text-slate-400">{o.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mt-1">{new Date(o.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {data.recentTransactions.length === 0 && data.recentOrders.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">No recent activity.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
