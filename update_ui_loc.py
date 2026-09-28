import os

f = 'app/(hq)/hq/analytics/page.tsx'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

vertical_ui = """
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
"""

location_ui = vertical_ui + """
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
"""

c = c.replace(vertical_ui.strip(), location_ui.strip())

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

