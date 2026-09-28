import os
import re

f = 'app/(hq)/hq/analytics/page.tsx'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

# Replace the Search Intelligence section
search_section = """
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
           </div>
        </div>
      </div>
"""

c = re.sub(r'\{\/\* Search Intelligence \*\/\}.*\{\/\* Metric Definitions', search_section + '\n      {/* Metric Definitions', c, flags=re.DOTALL)

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

