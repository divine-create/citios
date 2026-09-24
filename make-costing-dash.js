import fs from 'fs';

const code = `'use client';

import React from 'react';
import { Button, Badge } from '@/components/ui';
import { formatNaira } from '@/lib/utils';
import { AlertTriangle, TrendingDown, Percent } from 'lucide-react';

export default function CostingDashboard({ slug, menu, recipes, ingredients, inventory, settings }: any) {
  
  // Calculate theoretical costs
  const costedMenu = menu.map((m: any) => {
    let theoreticalCost = 0;
    let hasCostBasis = false;
    let incomplete = false;

    if (m.inventoryItemId) {
      const inv = inventory.find((i: any) => i.id === m.inventoryItemId);
      if (inv) {
        theoreticalCost = inv.cost || 0;
        hasCostBasis = true;
      } else {
        incomplete = true;
      }
    } else {
      const recipe = recipes.find((r: any) => r.menuItemId === m.id);
      if (recipe) {
        const recipeIngs = ingredients.filter((i: any) => i.recipeId === recipe.id);
        if (recipeIngs.length > 0) {
          hasCostBasis = true;
          for (const ing of recipeIngs) {
            const inv = inventory.find((i: any) => i.id === ing.itemId);
            if (inv) {
              theoreticalCost += (inv.cost * ing.quantity) / (recipe.yieldQuantity || 1);
            } else {
              incomplete = true;
            }
          }
        }
      }
    }

    const margin = m.price - theoreticalCost;
    const costPercent = m.price > 0 ? (theoreticalCost / m.price) * 100 : 0;

    return {
      ...m,
      theoreticalCost,
      margin,
      costPercent,
      hasCostBasis,
      incomplete
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-white">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Theoretical Cost</p>
          <div className="flex items-center gap-2">
            <Percent className="text-emerald-400" size={24} />
            <h2 className="text-2xl font-black text-white">
              {costedMenu.filter(m => m.hasCostBasis).length > 0 
                ? (costedMenu.filter(m => m.hasCostBasis).reduce((s, m) => s + m.costPercent, 0) / costedMenu.filter(m => m.hasCostBasis).length).toFixed(1) + '%'
                : '--%'}
            </h2>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Menu Item</th>
              <th className="px-6 py-4">Selling Price</th>
              <th className="px-6 py-4">Theoretical Cost</th>
              <th className="px-6 py-4">Est. Gross Margin</th>
              <th className="px-6 py-4">Food Cost %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {costedMenu.map((m: any) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{m.name}</td>
                <td className="px-6 py-4 font-black text-slate-900">{formatNaira(m.price)}</td>
                
                {m.hasCostBasis ? (
                  <>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {formatNaira(m.theoreticalCost)}
                      {m.incomplete && <AlertTriangle size={14} className="inline ml-2 text-amber-500" title="Missing inventory pricing" />}
                    </td>
                    <td className="px-6 py-4 font-black text-emerald-600">{formatNaira(m.margin)}</td>
                    <td className="px-6 py-4">
                      <span className={\`inline-flex items-center px-2 py-1 rounded-md text-xs font-black \${m.costPercent > 35 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}\`}>
                        {m.costPercent.toFixed(1)}%
                      </span>
                    </td>
                  </>
                ) : (
                  <td colSpan={3} className="px-6 py-4">
                     <div className="flex items-center gap-2">
                       <Badge variant="default">Cost Unavailable</Badge>
                       <span className="text-xs text-slate-400">Needs Recipe Configuration</span>
                     </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('components/restaurantos/management/CostingDashboard.tsx', code);
