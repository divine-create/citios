import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { createProductionRun } from '@/lib/actions/restaurantos';

export function ProductionRunLogger({ recipes, organizationId, onComplete, onCancel }: any) {
  const [recipeId, setRecipeId] = useState(recipes[0]?.id || '');
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const [actualYield, setActualYield] = useState(recipes[0]?.yieldQuantity || 1);
  const [loading, setLoading] = useState(false);

  const selectedRecipe = recipes.find((r: any) => r.id === recipeId);

  const handleSave = async () => {
    if (!recipeId || batchMultiplier <= 0 || actualYield <= 0) return;
    setLoading(true);
    try {
      await createProductionRun({
        organizationId,
        recipeId,
        batchMultiplier,
        actualYield,
      });
      onComplete();
    } catch (e: any) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (recipes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
        <p className="text-slate-500 mb-4">You need to create Recipes before logging a Production Run.</p>
        <Button onClick={onCancel}>Close</Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black">Log Production Run</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Recipe</label>
        <select
          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
          value={recipeId}
          onChange={e => {
            const rid = e.target.value;
            setRecipeId(rid);
            const r = recipes.find((x: any) => x.id === rid);
            if (r) setActualYield(r.yieldQuantity * batchMultiplier);
          }}
        >
          {recipes.map((r: any) => (
            <option key={r.id} value={r.id}>{r.name} (Yields {r.yieldQuantity})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input 
          label="Batch Multiplier" 
          type="number" 
          value={batchMultiplier} 
          onChange={e => {
            const m = Number(e.target.value);
            setBatchMultiplier(m);
            if (selectedRecipe) setActualYield(selectedRecipe.yieldQuantity * m);
          }} 
        />
        <Input 
          label="Actual Yield" 
          type="number" 
          value={actualYield} 
          onChange={e => setActualYield(Number(e.target.value))} 
        />
      </div>
      
      {selectedRecipe && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase">Will deduct:</p>
          <ul className="text-sm space-y-1 text-slate-700">
            {selectedRecipe.ingredients.map((ing: any) => (
              <li key={ing.id}>• {ing.quantity * batchMultiplier}x of Item {ing.itemId}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} isLoading={loading}>Log Run & Deduct Stock</Button>
      </div>
    </div>
  );
}
