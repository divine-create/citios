import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTransactionTrace } from '@/lib/actions/hq-ledger';
import { ArrowLeft, CreditCard, Box, Calendar, Tag, User, MapPin, Receipt, RefreshCcw, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default async function Transaction360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transaction: any = await getTransactionTrace(id);

  if (!transaction) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/hq/ledger" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Master Ledger
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Transaction 360</h1>
            <p className="text-slate-400 mt-2 font-mono text-sm">{transaction.id}</p>
          </div>
          <Badge variant={transaction.status === 'COMPLETED' ? 'success' : 'warning'} className="text-sm px-4 py-1.5">
            {transaction.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Transaction Metadata
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">REFERENCE</p>
              <p className="text-sm text-slate-300 font-medium">{transaction.reference || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">DESCRIPTION</p>
              <p className="text-sm text-slate-300 font-medium">{transaction.description || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">CREATED AT</p>
              <p className="text-sm text-slate-300 font-medium">{new Date(transaction.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {transaction.payment && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 border-t-4 border-t-blue-500">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" /> Originating Payment
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-2xl font-black text-white">{transaction.payment.amount} {transaction.payment.currency}</span>
                <Badge variant={transaction.payment.status === 'COMPLETED' ? 'success' : 'warning'}>{transaction.payment.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">METHOD</p>
                  <p className="text-sm text-slate-300 font-medium">{transaction.payment.method}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">PROVIDER</p>
                  <p className="text-sm text-slate-300 font-medium">{transaction.payment.provider || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">PAYMENT ID</p>
                  <p className="text-[10px] text-slate-400 font-mono break-all">{transaction.payment.id}</p>
                </div>
              </div>
              
              {/* Linked Orders */}
              {(transaction.payment.retailOrderId || transaction.payment.restaurantOrderId) && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-xs font-bold text-slate-500 mb-2">LINKED ORDERS</p>
                  <div className="flex flex-col gap-2">
                    {transaction.payment.retailOrderId && (
                      <Badge variant="teal">ShopOS Order: {transaction.payment.retailOrderId.slice(0,8)}</Badge>
                    )}
                    {transaction.payment.restaurantOrderId && (
                      <Badge variant="warning">RestaurantOS Order: {transaction.payment.restaurantOrderId.slice(0,8)}</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ledger Entries */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Box className="w-4 h-4" /> Ledger Entries (Double-Entry Effects)
          </h2>
        </div>
        <div className="divide-y divide-slate-800">
          {transaction.entries && transaction.entries.length > 0 ? transaction.entries.map((le: any) => (
            <div key={le.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/20">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${le.amount >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                   {le.amount >= 0 ? '+' : '-' }
                </div>
                <div>
                  <p className="font-black text-white">{Math.abs(le.amount).toLocaleString()} {le.currency}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">LE: {le.id}</p>
                </div>
              </div>
              
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex-1 md:ml-8 flex flex-col md:flex-row items-start md:items-center justify-between">
                <div>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Target Wallet</p>
                   {le.wallet?.organization ? (
                     <Link href={`/hq/tenants/${le.wallet.organization.id}`} className="text-sm font-bold text-blue-400 hover:underline flex items-center gap-1">
                       <MapPin className="w-3 h-3" /> {le.wallet.organization.name}
                     </Link>
                   ) : le.wallet?.person ? (
                     <Link href={`/hq/users/${le.wallet.person.id}`} className="text-sm font-bold text-blue-400 hover:underline flex items-center gap-1">
                       <User className="w-3 h-3" /> {le.wallet.person.email || 'Citizen Wallet'}
                     </Link>
                   ) : (
                     <span className="text-sm font-bold text-purple-400 flex items-center gap-1">
                       <Activity className="w-3 h-3" /> System / Platform Wallet
                     </span>
                   )}
                   <p className="text-xs text-slate-500 font-mono mt-1">WAL: {le.walletId}</p>
                </div>
                <Link href={`/hq/ledger/wallets/${le.walletId}`} className="mt-4 md:mt-0 shrink-0">
                  <Button variant="outline" size="sm">Inspect Wallet</Button>
                </Link>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-slate-500 text-sm font-medium">
              No ledger entries explicitly recorded for this transaction. (Could be a direct cash transaction or missing ledger integration).
            </div>
          )}
        </div>
      </div>

      {/* Refunds and Events */}
      {transaction.payment && (transaction.payment.refunds?.length > 0 || transaction.payment.events?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {transaction.payment.refunds && transaction.payment.refunds.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 border-t-4 border-t-amber-500">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-amber-500" /> Refunds
              </h2>
              <div className="space-y-4">
                {transaction.payment.refunds.map((r: any) => (
                  <div key={r.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                     <div className="flex justify-between mb-2">
                        <span className="text-lg font-black text-white">{r.amount} {r.currency}</span>
                        <Badge variant={r.status === 'COMPLETED' ? 'success' : 'default'}>{r.status}</Badge>
                     </div>
                     <p className="text-xs text-slate-400 mb-2">Reason: {r.reason || 'N/A'}</p>
                     <p className="text-[10px] text-slate-500 font-mono">ID: {r.id}</p>
                     <p className="text-[10px] text-slate-500 font-mono">Date: {new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transaction.payment.events && transaction.payment.events.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Provider Webhook Events
              </h2>
              <div className="space-y-3">
                {transaction.payment.events.map((e: any) => (
                  <div key={e.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-300">{e.type}</span>
                        <span className="text-[10px] text-slate-500">{new Date(e.createdAt).toLocaleString()}</span>
                     </div>
                     <p className="text-[10px] text-slate-500 font-mono break-all">{e.providerEventId}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
