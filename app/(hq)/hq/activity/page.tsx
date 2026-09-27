import React from 'react';
import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { ShieldAlert, Search, History, Filter } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

export default async function HQActivityPage({ searchParams }: { searchParams: Promise<{ actionType?: string }> }) {
  await requireSystemAdmin();

  const { actionType } = await searchParams;

  let query = db.orm.public.HQAuditEvent.where({});
  
  if (actionType && actionType !== 'ALL') {
    query = query.where({ action: actionType });
  }

  // Get bounded list (say 100 recent)
  const audits = await query.all();
  audits.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recentAudits = audits.slice(0, 100);

  // We need to resolve actor Person records.
  const actors = await Promise.all(
    recentAudits.map(a => db.orm.public.Person.where({ id: a.actorPersonId }).all().first())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Governance Audit Trail</h1>
          <p className="text-slate-400 mt-2">Immutable record of all platform administration actions.</p>
        </div>
        <form className="flex gap-3 w-full sm:w-auto" method="GET">
          <div className="relative flex-1 sm:w-64">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select name="actionType" defaultValue={actionType || 'ALL'} className="w-full bg-slate-900 border border-slate-800 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none appearance-none">
              <option value="ALL">All Actions</option>
              <option value="ORGANIZATION_SUSPENDED">Org Suspended</option>
              <option value="ORGANIZATION_REACTIVATED">Org Reactivated</option>
            </select>
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 py-2.5 transition-colors">
            Filter
          </button>
        </form>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actor (Admin)</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Context</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {recentAudits.map((audit: any, idx: number) => {
              const actor = actors[idx];
              return (
                <tr key={audit.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm text-white font-bold">{new Date(audit.createdAt).toLocaleDateString()}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{new Date(audit.createdAt).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    {actor ? (
                      <div>
                        <Link href={`/hq/users/${actor.id}`} className="font-bold text-indigo-400 hover:underline text-sm">
                          {actor.firstName} {actor.lastName}
                        </Link>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{actor.id.split('-')[0]}</p>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-sm">Unknown System</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className="bg-slate-800 text-slate-200 border border-slate-700/50">{audit.action}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-white">{audit.targetType}</p>
                      {audit.targetType === 'Organization' ? (
                        <Link href={`/hq/tenants/${audit.targetId}`} className="text-[11px] text-emerald-400 hover:underline font-mono mt-0.5 inline-block">
                          {audit.targetId.split('-')[0]}
                        </Link>
                      ) : (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{audit.targetId.split('-')[0]}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-xs text-slate-400 max-w-[200px] truncate ml-auto">
                      {audit.metadata ? JSON.stringify(audit.metadata) : '-'}
                    </div>
                  </td>
                </tr>
              );
            })}
            {recentAudits.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                  <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="font-bold text-white">No audit logs found</p>
                  <p className="text-sm mt-1">Adjust filters or search parameters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {audits.length > 100 && (
          <div className="p-4 bg-slate-800/20 text-center border-t border-slate-800">
            <p className="text-xs text-slate-500 font-bold">Showing latest 100 events.</p>
          </div>
        )}
      </div>
    </div>
  );
}
