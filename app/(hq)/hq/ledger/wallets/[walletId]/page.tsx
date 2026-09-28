import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { inspectWallet } from '@/lib/actions/hq-ledger';
import { ArrowLeft, Wallet as WalletIcon, Box, ArrowRight, User, MapPin, Activity, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default async function WalletInspectionPage({ params }: { params: Promise<{ walletId: string }> }) {
  const { walletId } = await params;
  const data = await inspectWallet(walletId);

  if (!data) {
    notFound();
  }

  const { wallet, recentEntries } = data;

  const isPlatformWallet = !wallet.organizationId && !wallet.personId;
  const ownerType = wallet.organization ? 'Organization' : (wallet.person as any) ? 'Citizen' : 'Platform';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <Link href="/hq/ledger" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Master Ledger
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Wallet Inspection</h1>
            <p className="text-slate-400 mt-2 font-mono text-sm">{wallet.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
           <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <WalletIcon className="w-4 h-4" /> Wallet Balance
          </h2>
          <div className="flex items-end gap-3 mb-6">
            <span className="text-5xl font-black text-white">{wallet.balance.toLocaleString()}</span>
            <span className="text-xl font-bold text-slate-500 mb-1">{wallet.currency}</span>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">STATUS</span>
            <Badge variant="success">ACTIVE</Badge>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            {ownerType === 'Organization' ? <MapPin className="w-4 h-4" /> : ownerType === 'Citizen' ? <User className="w-4 h-4" /> : <Activity className="w-4 h-4" />} 
            Owner Identity
          </h2>
          
          <div className="space-y-4">
             {isPlatformWallet ? (
                <div>
                   <p className="text-sm font-bold text-purple-400 mb-1">System / Platform Master Wallet</p>
                   <p className="text-xs text-slate-500">Collects platform fees and acts as the central settlement treasury.</p>
                </div>
             ) : wallet.organization ? (
                <div>
                   <p className="text-xs font-bold text-slate-500 mb-1">ORGANIZATION</p>
                   <Link href={`/hq/tenants/${wallet.organizationId}`} className="text-lg font-black text-blue-400 hover:underline">{(wallet.organization as any).name as string}</Link>
                   <p className="text-xs text-slate-500 font-mono mt-1">{wallet.organizationId}</p>
                </div>
             ) : (wallet.person as any) ? (
                <div>
                   <p className="text-xs font-bold text-slate-500 mb-1">CITIZEN</p>
                   <Link href={`/hq/users/${wallet.personId}`} className="text-lg font-black text-blue-400 hover:underline">{((wallet.person as any).email || (wallet.person as any).name) as string}</Link>
                   <p className="text-xs text-slate-500 font-mono mt-1">{wallet.personId}</p>
                </div>
             ) : null}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
         <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Box className="w-4 h-4" /> Recent Ledger Entries
          </h2>
          <Link href={`/hq/ledger?walletId=${wallet.id}`}>
             <Button variant="outline" size="sm">View All in Ledger</Button>
          </Link>
        </div>
        <div className="divide-y divide-slate-800">
          {recentEntries.length > 0 ? recentEntries.map((le: any) => (
             <div key={le.id} className="p-4 flex items-center justify-between hover:bg-slate-800/20">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${le.amount >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                     {le.amount >= 0 ? '+' : '-' }
                  </div>
                  <div>
                    <p className="font-black text-white text-sm">{le.transaction?.description || 'System movement'}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">TX: {le.transaction?.id.split('-')[0]}... &bull; LE: {le.id.split('-')[0]}...</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                   <div className="text-right">
                     <p className={`font-black ${le.amount >= 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {le.amount >= 0 ? '+' : ''}{le.amount.toLocaleString()} {le.currency}
                     </p>
                     <p className="text-[10px] text-slate-500">{new Date(le.createdAt).toLocaleString()}</p>
                   </div>
                   <Link href={`/hq/ledger/${le.id}`}>
                      <Button variant="ghost" size="sm" className="text-blue-400"><ArrowRight className="w-4 h-4" /></Button>
                   </Link>
                </div>
             </div>
          )) : (
             <div className="p-8 text-center text-slate-500 text-sm font-medium">
               No ledger entries recorded.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
