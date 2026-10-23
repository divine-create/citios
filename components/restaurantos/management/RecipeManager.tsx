'use client';

import React, { useState } from 'react';
import { Button, Badge } from '@/components/ui';
import { Plus, BookOpen, AlertCircle, ChefHat } from 'lucide-react';
import { RecipeBuilder } from '@/components/restaurantos/forms/RecipeBuilder';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function RecipeManager({ slug, recipes = [], menu = [], inventory = [], settings }: any) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  if (isCreating) {
    return (
      <div className="space-y-4">
        <RecipeBuilder
          inventory={inventory}
          organizationId={slug}
          onComplete={() => {
            setIsCreating(false);
            toast.success('Recipe created successfully!');
            router.refresh();
          }}
          onCancel={() => setIsCreating(false)}
        />
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
          <BookOpen size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-900">No recipes configured</h3>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto mb-6 text-sm leading-relaxed">
          Map your dishes to raw ingredients to track inventory consumption, portions, and theoretical food costing.
        </p>
        <Button
          onClick={() => setIsCreating(true)}
          leftIcon={<Plus size={16} />}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          Create First Recipe
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="teal">{recipes.length} Active Recipes</Badge>
          <Badge variant="default">{Math.max(0, menu.length - recipes.length)} Unmapped Items</Badge>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          leftIcon={<Plus size={16} />}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
        >
          Create Recipe
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Menu Item / Recipe</th>
              <th className="px-6 py-4">Yield</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recipes.map((r: any) => {
              const m = menu.find((i: any) => i.id === r.menuItemId);
              return (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{r.name || m?.name || 'Recipe'}</p>
                    {m && <p className="text-xs text-slate-400 mt-0.5">Linked to: {m.name}</p>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    Yields {r.yieldQuantity || 1} unit(s)
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-emerald-600">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Active</span>
                    </div>
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
