import fs from 'fs';

const code = `'use client';

import React from 'react';
import { Button, Badge } from '@/components/ui';
import { Plus, BookOpen, AlertCircle } from 'lucide-react';

export default function RecipeManager({ slug, recipes, menu, inventory, settings }: any) {
  if (recipes.length === 0) {
    return (
      <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-900">No recipes configured.</h3>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto mb-6">Recipes are optional. Create one when you want to understand ingredient composition or theoretical food cost.</p>
        <Button leftIcon={<Plus size={16} />}>Create Recipe</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
           <Badge variant="teal">{recipes.length} Active Recipes</Badge>
           <Badge variant="default">{menu.length - recipes.length} Unmapped Items</Badge>
        </div>
        <Button leftIcon={<Plus size={16} />}>Create Recipe</Button>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Menu Item</th>
              <th className="px-6 py-4">Yield</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recipes.map((r: any) => {
              const m = menu.find((i: any) => i.id === r.menuItemId);
              return (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{m?.name || 'Unknown Item'}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">Yields {r.yieldQuantity || 1} unit(s)</td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-1 text-[11px] font-black uppercase text-emerald-600">
                       <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Valid
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm">Edit Recipe</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('components/restaurantos/management/RecipeManager.tsx', code);
