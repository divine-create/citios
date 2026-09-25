import React from 'react';
import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { FileText, Search, ArrowRightLeft, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function HQLedgerPage() {
  await requireSystemAdmin();

  // Fetch recent transactions (limit to 50 for performance on the overview)
  // In Prisma Next, we fetch via all() then slice, or we could use db.sql if needed.
  // We'll just fetch all and slice for this mockup.
  const txs = await db.orm.public.Transaction.all().then(rows => rows.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50));

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Master Ledger</h1>
          <p className="text-slate-400 mt-2">Immutable view of all financial transactions across the platform.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search reference..." 
              className="bg-slate-900 border border-slate-800 text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-slate-600 w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Description</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {txs.map((t: any) => (
              <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                      <ArrowRightLeft className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-black text-white">{t.reference || 'SYS-TXN'}</p>
                      <p className="text-xs text-slate-500 font-medium">{t.id.split('-')[0]}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-300 text-sm font-medium">
                  {t.description || 'System movement'}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={t.status === 'COMPLETED' ? 'success' : 'warning'} className={t.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}>
                    {t.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right text-slate-400 text-sm font-medium">
                  {new Date(t.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {txs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  No transactions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
