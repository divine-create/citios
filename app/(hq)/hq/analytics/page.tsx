import React from 'react';
import { requireSystemAdmin } from '@/lib/rbac';
import { getPlatformAnalytics, getSearchIntelligence } from '@/lib/actions/analytics';
import { Activity, Users, Building, ShoppingBag, CreditCard, Search, ArrowRight, Store } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default async function HQAnalyticsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await requireSystemAdmin();
  
  const sp = await searchParams;
  const days = parseInt(sp.days as string || '30', 10);
  
  const [platform, searchIntel] = await Promise.all([
    getPlatformAnalytics(days),
    getSearchIntelligence(days)
  ]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Platform Analytics</h1>
          <p className="text-slate-400 mt-2 font-medium">Measurement & Intelligence covering the last {days} days.</p>
        </div>
        
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
           {[7, 30, 90].map(d => (
             <Link key={d} href={`/hq/analytics?days=${d}`}>
               <div className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${days === d ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                 {d}d
               </div>
             </Link>
           ))}
        </div>
      </div>

      {/* Platform Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Citizens</h3>
          </div>
          <p className="text-3xl font-black text-white">{platform.users.total.toLocaleString()}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="success">+{platform.users.recent.toLocaleString()}</Badge>
            <span className="text-xs text-slate-500">newly registered</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Building className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Organizations</h3>
          </div>
          <p className="text-3xl font-black text-white">{platform.organizations.total.toLocaleString()}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="success">+{platform.organizations.recent.toLocaleString()}</Badge>
            <span className="text-xs text-slate-500">new businesses</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Payment Volume</h3>
          </div>
          <p className="text-3xl font-black text-emerald-400">${platform.financial.recentPaymentVolume.toLocaleString()}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-bold text-white">{platform.financial.recentPaymentCount.toLocaleString()}</span>
            <span className="text-xs text-slate-500">payments processed</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Orders (Retail)</h3>
          </div>
          <p className="text-3xl font-black text-white">{platform.orders.retailRecent.toLocaleString()}</p>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
            <Store className="w-3 h-3" /> +{platform.orders.restaurantRecent.toLocaleString()} Restaurant Orders
          </div>
        </div>
      </div>

      
      {/* Search Intelligence */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-teal-400" /> Search Intelligence
            </h2>
            <p className="text-sm text-slate-400 mt-1">Hyperlocal discovery intent</p>
          </div>
          <div className="text-right">
             <p className="text-2xl font-black text-white">{searchIntel.totalSearches.toLocaleString()}</p>
             <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Searches</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
           {/* Volume Stats */}
           <div className="p-6">
             <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Volume</h3>
             <div className="space-y-4">
               <div>
                 <p className="text-2xl font-black text-white">{searchIntel.uniqueSearchers.toLocaleString()}</p>
                 <p className="text-xs text-slate-500">Unique Searchers</p>
               </div>
               <div>
                 <p className="text-2xl font-black text-white">{searchIntel.searchesToday.toLocaleString()}</p>
                 <p className="text-xs text-slate-500">Searches Today</p>
               </div>
               <div>
                 <p className="text-2xl font-black text-rose-400">{searchIntel.zeroResultSearches.toLocaleString()}</p>
                 <p className="text-xs text-slate-500">Zero-Result Searches</p>
               </div>
             </div>
           </div>

           {/* Popular Searches */}
           <div className="p-6 lg:col-span-2">
             <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Popular Searches</h3>
             {searchIntel.topSearches.length > 0 ? (
               <div className="space-y-2">
                 {searchIntel.topSearches.map((s) => (
                   <div key={s.query} className="flex items-center justify-between px-3 py-2 bg-slate-800/30 rounded-lg">
                     <span className="text-sm font-bold text-slate-200">{s.query}</span>
                     <div className="flex items-center gap-4 text-xs">
                       <span className="text-slate-400">{s.count} searches</span>
                       <span className="text-slate-400">{s.avgResults} avg results</span>
                       {s.zeroRate > 0 && <span className="text-rose-400">{s.zeroRate}% zero rate</span>}
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-sm text-slate-500">No search data recorded.</p>
             )}
           </div>
           
           {/* Demand Gaps & Verticals */}
           <div className="p-6 space-y-8">
             <div>
               <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Demand Gaps</h3>
               {searchIntel.demandGaps.length > 0 ? (
                 <div className="space-y-2">
                   {searchIntel.demandGaps.map(g => (
                     <div key={g.query} className="flex justify-between items-center text-sm">
                       <span className="text-slate-300 font-medium">{g.query}</span>
                       <span className="text-rose-400">{g.count} ({g.zeroRate}%)</span>
                     </div>
                   ))}
                 </div>
               ) : <p className="text-xs text-slate-500">No demand gaps detected.</p>}
             </div>
             
             <div>
               <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">By Vertical</h3>
               {searchIntel.byVertical.length > 0 ? (
                 <div className="space-y-2">
                   {searchIntel.byVertical.map(v => (
                     <div key={v.vertical} className="flex justify-between items-center text-sm">
                       <span className="text-slate-300 font-medium">{v.vertical}</span>
                       <span className="text-slate-400">{v.count}</span>
                     </div>
                   ))}
                 </div>
               ) : <p className="text-xs text-slate-500">No vertical data.</p>}
             </div>

             <div>
               <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">By Location</h3>
               {searchIntel.byLocation.length > 0 ? (
                 <div className="space-y-2">
                   {searchIntel.byLocation.map(l => (
                     <div key={l.locationId} className="flex justify-between items-center text-sm">
                       <span className="text-slate-300 font-medium truncate w-32">{l.locationId}</span>
                       <span className="text-slate-400">{l.count} ({l.zeroRate}%)</span>
                     </div>
                   ))}
                 </div>
               ) : <p className="text-xs text-slate-500">No location data.</p>}
             </div>
           </div>
        </div>
      </div>

      {/* Metric Definitions & Governance */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-black text-white flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-slate-400" /> Canonical Metric Registry
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-bold text-slate-300">Total Users</p>
            <p className="text-xs text-slate-500 mt-1">Authoritative count of `Person` records. Never behavioral.</p>
          </div>
          <div>
            <p className="font-bold text-slate-300">Payment Volume</p>
            <p className="text-xs text-slate-500 mt-1">Aggregated `Payment.amount` created within the period.</p>
          </div>
          <div>
            <p className="font-bold text-slate-300">Search Events</p>
            <p className="text-xs text-slate-500 mt-1">Behavioral `MeasurementEvent` generated server-side during explore queries.</p>
          </div>
          <div>
            <p className="font-bold text-slate-300">Orders</p>
            <p className="text-xs text-slate-500 mt-1">Separated by vertical logic (`RetailOrder`, `RestaurantOrder`).</p>
          </div>
        </div>
      </div>

    </div>
  );
}
