'use client';

import React, { useState } from 'react';
import { useWorkspace } from '@/components/cityos/workspaces/WorkspaceProvider';
import { Button, Input, EmptyState } from '@/components/ui';
import { Flame, Package, Plus, Search, ChevronRight, CheckCircle2 } from 'lucide-react';
import { formatNaira } from '@/lib/utils';
import { createProductionRun } from '@/lib/actions/restaurantos';

export default function ProductionRunsPage() {
  const { workspaceData } = useWorkspace();
  const org = workspaceData?.organization;
  const recipes = workspaceData?.restaurantos?.recipes || [];
  const inventory = workspaceData?.restaurantos?.inventory || [];
  const productionRuns = workspaceData?.restaurantos?.productionRuns || [];
  
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [batchMultiplier, setBatchMultiplier] = useState<number>(1);
  const [actualYield, setActualYield] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We only want recipes that produce an inventory item (Prepped Batches), 
  // not Made-to-Order Menu Item recipes.
  // We can identify these because they have a `producedItem` attached in schema,
  // or we can just filter by recipes that are linked to an inventory item.
  // For now, let's look for inventory items that have a `recipeId` attached, 
  // which means this recipe produces that item.
  
  const batchRecipes = recipes.filter((r: any) => 
    inventory.some((inv: any) => inv.recipeId === r.id)
  );

  const handleCreateRun = async () => {
    if (!selectedRecipe || !org) return;
    const finalYield = Number(actualYield);
    if (isNaN(finalYield) || finalYield <= 0) {
      setError("Please enter a valid actual yield.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createProductionRun({
        organizationId: org.id,
        recipeId: selectedRecipe.id,
        batchMultiplier: batchMultiplier,
        actualYield: finalYield
      });
      
      // Reset state, relying on standard revalidation or requiring a refresh for MVP
      setIsCreating(false);
      setSelectedRecipe(null);
      setBatchMultiplier(1);
      setActualYield('');
      // In a real app, we'd trigger a router.refresh() here.
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to log production run. Check raw ingredient stock.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInventoryName = (id: string) => inventory.find((i: any) => i.id === id)?.name || 'Unknown Item';
  const getRecipeName = (id: string) => recipes.find((r: any) => r.id === id)?.name || 'Unknown Recipe';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kitchen Prep & Batches</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Log bulk prep to accurately deduct raw ingredients and yield prepped stock.</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} leftIcon={<Plus size={16} />}>
            Log Production Run
          </Button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">New Production Run</h2>
            <button onClick={() => setIsCreating(false)} className="text-sm font-bold text-slate-500 hover:text-slate-800">Cancel</button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">1. Select Batch Recipe</label>
              {batchRecipes.length === 0 ? (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-sm font-medium">
                  No prep recipes found. Go to Inventory, create a Sub-Assembly item (like "Pizza Dough"), and attach a recipe to it.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {batchRecipes.map((recipe: any) => (
                    <button
                      key={recipe.id}
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        setActualYield(recipe.yieldQuantity * batchMultiplier);
                      }}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedRecipe?.id === recipe.id 
                          ? 'border-ink bg-slate-900 text-white shadow-md' 
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <h3 className="font-bold">{recipe.name}</h3>
                      <p className={`text-xs mt-1 ${selectedRecipe?.id === recipe.id ? 'text-slate-300' : 'text-slate-500'}`}>
                        Target Yield: {recipe.yieldQuantity}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedRecipe && (
              <>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Raw Materials to Deduct</h4>
                  <ul className="space-y-2">
                    {selectedRecipe.ingredients.map((ing: any) => (
                      <li key={ing.id} className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{getInventoryName(ing.itemId)}</span>
                        <span className="font-bold text-slate-900 text-right">
                          {(ing.quantity * batchMultiplier).toFixed(2)} units
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">2. Batch Multiplier</label>
                    <Input 
                      type="number" 
                      min="0.1" 
                      step="0.1"
                      value={batchMultiplier} 
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        setBatchMultiplier(m);
                        setActualYield(selectedRecipe.yieldQuantity * m);
                      }} 
                    />
                    <p className="text-xs text-slate-400 mt-1">E.g., 2 = double the recipe</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">3. Actual Yield</label>
                    <Input 
                      type="number" 
                      value={actualYield} 
                      onChange={(e) => setActualYield(e.target.value ? Number(e.target.value) : '')} 
                    />
                    <p className="text-xs text-slate-400 mt-1">What you actually got (accounts for shrinkage)</p>
                  </div>
                </div>

                {error && <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100">{error}</div>}

                <Button className="w-full" size="lg" onClick={handleCreateRun} isLoading={isSubmitting}>
                  Log Batch & Deduct Inventory
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {productionRuns.length === 0 ? (
            <EmptyState 
              icon={<Flame size={24} />}
              title="No batches logged yet"
              description="When the kitchen preps items in bulk, log them here to keep raw ingredient stock accurate."
              action={{ label: "Log First Batch", onClick: () => setIsCreating(true) }}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {productionRuns.sort((a:any, b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((run: any) => (
                <div key={run.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <Package size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{getRecipeName(run.recipeId)}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {new Date(run.createdAt).toLocaleString()} • {run.batchMultiplier}x Batch
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Yield</p>
                      <p className="font-black text-slate-900">{run.actualYield} units</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Material Cost</p>
                      <p className="font-black text-slate-900">{formatNaira(run.totalCost)}</p>
                    </div>
                    <div className="hidden sm:flex px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold items-center gap-1.5 border border-emerald-100">
                      <CheckCircle2 size={14} /> Logged
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
