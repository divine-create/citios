import React from 'react';
import Link from 'next/link';
import { getLedgerEntries, getPlatformEconomyOverview } from '@/lib/actions/hq-ledger';
import { Search, ArrowRightLeft, CreditCard, Activity, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default async function HQLedgerPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams;
  const page = parseInt(sp.page as string || '1', 10);
  const search = sp.search as string || '';
  const orgId = sp.org as string || '';

  const [ledgerData, overview] = await Promise.all([
    getLedgerEntries({
      page,
      pageSize: 50,
      search,
      organizationId: orgId || undefined
    }),
    getPlatformEconomyOverview()
  ]);

  const totalPages = Math.ceil((ledgerData.total as number) / 50);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Economy Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Total TXNs</h3>
          </div>
          <p className="text-3xl font-black text-white">{(overview.metrics.totalTransactions as number)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Payment Vol</h3>
          </div>
          <p className="text-3xl font-black text-white">${(overview.metrics.totalPaymentVolume as number).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">{(overview.metrics.successfulPaymentsCount as number)} successful</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Refunds</h3>
          </div>
          <p className="text-3xl font-black text-white">${(overview.metrics.totalRefundVolume as number).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">{(overview.metrics.refundCount as number)} processed</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">System Wallet</h3>
          </div>
          {overview.systemWallet ? (
             <p className="text-3xl font-black text-white">${overview.systemWallet.balance.toLocaleString()}</p>
          ) : (
             <p className="text-sm font-medium text-slate-500">No system wallet found</p>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Master Ledger</h1>
          <p className="text-slate-400 mt-2">Immutable view of all financial transactions across the platform.</p>
        </div>
        <form className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              name="search"
              defaultValue={search}
              type="text" 
              placeholder="Search ID..." 
              className="w-full bg-slate-900 border border-slate-800 text-white text-sm rounded-xl pl-9 pr-4 h-11 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all"
            />
          </div>
          <input type="hidden" name="org" value={orgId} />
          <Button type="submit" variant="secondary" className="h-11 px-6">Search</Button>
          {search && (
            <Link href="/hq/ledger">
              <Button type="button" variant="ghost" className="h-11">Clear</Button>
            </Link>
          )}
        </form>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entry / Transaction</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Wallet</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Date</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {ledgerData.entries.map((le: any) => (
              <tr key={le.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                      <ArrowRightLeft className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-black text-white text-sm">{le.transaction?.description || 'System movement'}</p>
                      <p className="text-xs text-slate-500 font-medium">TX: {le.transaction?.id.split('-')[0]}... &bull; LE: {le.id.split('-')[0]}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <p className="text-sm font-medium text-slate-300">
                     {le.wallet?.organization?.name || le.wallet?.person?.email || 'Platform Wallet'}
                   </p>
                   <p className="text-xs text-slate-500">{le.walletId.slice(0, 8)}...</p>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={le.amount >= 0 ? 'success' : 'default'} className={le.amount >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}>
                    {le.amount >= 0 ? '+' : ''}{le.amount.toLocaleString()} {le.currency}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right text-slate-400 text-sm font-medium">
                  {new Date(le.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/hq/ledger/${le.id}`}>
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">Inspect <ArrowRight className="w-4 h-4 ml-1" /></Button>
                  </Link>
                </td>
              </tr>
            ))}
            {ledgerData.entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No ledger entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-800 p-4 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">Showing page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Link href={page > 1 ? `/hq/ledger?page=${page - 1}&search=${search}&org=${orgId}` : '#'}>
                <Button variant="secondary" size="sm" disabled={page <= 1}>Previous</Button>
              </Link>
              <Link href={page < totalPages ? `/hq/ledger?page=${page + 1}&search=${search}&org=${orgId}` : '#'}>
                <Button variant="secondary" size="sm" disabled={page >= totalPages}>Next</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
