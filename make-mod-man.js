import fs from 'fs';

const code = `'use client';

import React from 'react';
import { Button, Badge } from '@/components/ui';
import { Plus, Settings2 } from 'lucide-react';
import { formatNaira } from '@/lib/utils';

export default function ModifierManager({ slug, groups, options, inventory, settings }: any) {
  if (groups.length === 0) {
    return (
      <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings2 size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-900">No modifier groups yet.</h3>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto mb-6">Create groups such as Size, Toppings, Extras, or Milk Options to allow customers to customize their orders.</p>
        <Button leftIcon={<Plus size={16} />}>Create Modifier Group</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button leftIcon={<Plus size={16} />}>Create Group</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map((group: any) => {
          const groupOptions = options.filter((o: any) => o.modifierGroupId === group.id);
          
          return (
            <div key={group.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{group.name}</h3>
                  <div className="flex gap-2 mt-2">
                    {group.isRequired ? <Badge variant="warning">Required</Badge> : <Badge variant="default">Optional</Badge>}
                    {group.minSelections > 0 && <span className="text-xs font-bold text-slate-400">Min: {group.minSelections}</span>}
                    {group.maxSelections > 0 && <span className="text-xs font-bold text-slate-400">Max: {group.maxSelections}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
              <div className="p-0">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {groupOptions.map((opt: any) => (
                      <tr key={opt.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-semibold text-slate-800">{opt.name}</td>
                        <td className="px-5 py-3 text-slate-500 font-bold">{opt.priceDelta > 0 ? \`+\${formatNaira(opt.priceDelta)}\` : 'Free'}</td>
                        {settings?.enableInventory && (
                          <td className="px-5 py-3 text-right">
                            {opt.inventoryItemId ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Impacts Stock</span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-md">No Impact</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {groupOptions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-5 py-4 text-center text-slate-500 italic text-xs">No options defined.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('components/restaurantos/management/ModifierManager.tsx', code);
