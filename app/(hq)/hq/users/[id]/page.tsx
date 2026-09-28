import React from 'react';
import { inspectPerson } from '@/lib/actions/hq';
import { requireSystemAdmin } from '@/lib/rbac';
import { Users, Mail, Phone, Building, Wallet, ShieldAlert, ArrowLeft, ArrowRight, Activity, Shield } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

export default async function Person360Page({ params }: { params: Promise<{ id: string }> }) {
  await requireSystemAdmin();
  const { id } = await params;
  
  const data = await inspectPerson(id);
  const { person, account, identifiers, memberships, wallets, recentAuditEvents } = data;

  const emailId = identifiers.find((i: any) => i.type === 'EMAIL');
  const phoneId = identifiers.find((i: any) => i.type === 'PHONE');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/hq/users" className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            {person.firstName} {person.lastName}
            {person.isSystemAdmin && <Badge variant="error" className="bg-red-500/10 text-red-400 border border-red-500/20 text-sm py-1">System Admin</Badge>}
          </h1>
          <p className="text-slate-400 mt-1 font-mono text-xs">{person.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Identity & Contact */}
        <div className="col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Identity
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/> Email</p>
                <p className="text-sm text-white font-medium">{emailId?.normalizedValue || <span className="text-slate-500 italic">None attached</span>}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/> Phone</p>
                <p className="text-sm text-white font-medium">{phoneId?.normalizedValue || <span className="text-slate-500 italic">None attached</span>}</p>
              </div>
              {account && (
                <div>
                  <p className="text-xs text-slate-500 font-bold mb-1">Account Created</p>
                  <p className="text-sm text-slate-300">{new Date(account.createdAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Wallets
            </h3>
            <div className="space-y-3">
              {wallets.map((w: any) => (
                <div key={w.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-white">Personal Wallet</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{w.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-slate-300 font-bold">{w.balance.toLocaleString()} {w.currency}</p>
                    <Link href={`/hq/ledger/wallets/${w.id}`} className="text-[10px] font-bold text-blue-400 hover:underline">Inspect Wallet</Link>
                  </div>
                </div>
              ))}
              {wallets.length === 0 && <p className="text-xs text-slate-500">No personal wallets attached.</p>}
            </div>
          </div>
        </div>

        {/* Memberships & Activity */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Building className="w-4 h-4" /> Organizations & Memberships
              </h3>
              <Badge className="bg-slate-800 text-slate-400 border-none">{memberships.length} Orgs</Badge>
            </div>
            <div className="divide-y divide-slate-800/50">
              {memberships.map((m: any) => (
                <div key={m.id} className="p-4 hover:bg-slate-800/20 transition-colors flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black text-white">{m.organization.name}</p>
                      {m.organization.status === 'SUSPENDED' && <Badge variant="error" className="bg-red-500/10 text-red-400 border-none px-1.5 py-0 text-[9px]">SUSPENDED</Badge>}
                    </div>
                    <div className="flex gap-1">
                      {m.roles.map((r: any) => (
                        <Badge key={r.id} className="text-[9px] px-1.5 py-0 bg-slate-700 text-slate-300 border-none">{r.role}</Badge>
                      ))}
                    </div>
                  </div>
                  <Link href={`/hq/tenants/${m.organizationId}`} className="shrink-0 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors tooltip" title="View Organization">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
              {memberships.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">No organization memberships.</div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
             <div className="p-6 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Admin Action Trail
              </h3>
            </div>
            <div className="divide-y divide-slate-800/50">
              {recentAuditEvents.map((audit: any) => (
                <div key={audit.id} className="p-4 hover:bg-slate-800/20 transition-colors flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-white">{audit.action}</p>
                    <p className="text-xs text-slate-400 mt-1">Target: {audit.targetType} ({audit.targetId.split('-')[0]})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{new Date(audit.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {recentAuditEvents.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">No administrative governance actions recorded by this user.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
