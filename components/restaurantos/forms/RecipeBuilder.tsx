import React, { useState } from 'react';
import { Button, Input, Badge } from '@/components/ui';
import { createRecipe } from '@/lib/actions/restaurantos';

export function RecipeBuilder({ inventory, organizationId, onComplete, onCancel }: any) {
  const [name, setName] = useState('');
  const [yieldQty, setYieldQty] = useState(1);
  const [instructions, setInstructions] = useState('');
  
  const [ingredients, setIngredients] = useState<{ itemId: string; quantity: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const rawMaterials = inventory.filter((i: any) => i.type === 'RAW_MATERIAL');

  const handleAddIngredient = () => {
    if (rawMaterials.length === 0) return;
    setIngredients([...ingredients, { itemId: rawMaterials[0].id, quantity: 1 }]);
  };

  const handleSave = async () => {
    if (!name || yieldQty <= 0 || ingredients.length === 0) return;
    setLoading(true);
    try {
      await createRecipe({
        organizationId,
        name,
        yieldQuantity: yieldQty,
        instructions,
        ingredients
      });
      onComplete();
    } catch (e: any) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black">Create Recipe (BOM)</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Recipe Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 50L Pasta Sauce" />
        <Input label="Yield Quantity" type="number" value={yieldQty} onChange={e => setYieldQty(Number(e.target.value))} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instructions</label>
        <textarea
          className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="Prep steps..."
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Materials (BOM)</label>
          <Button variant="outline" size="sm" onClick={handleAddIngredient}>+ Add Ingredient</Button>
        </div>

        {ingredients.map((ing, i) => (
          <div key={i} className="flex gap-4 items-center">
            <select
              className="flex-1 h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
              value={ing.itemId}
              onChange={e => {
                const newIngs = [...ingredients];
                newIngs[i].itemId = e.target.value;
                setIngredients(newIngs);
              }}
            >
              {rawMaterials.map((rm: any) => (
                <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>
              ))}
            </select>
            
            <Input
              type="number"
              className="w-32"
              value={ing.quantity}
              onChange={e => {
                const newIngs = [...ingredients];
                newIngs[i].quantity = Number(e.target.value);
                setIngredients(newIngs);
              }}
            />

            <button onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))} className="text-red-500 font-bold p-2 hover:bg-red-50 rounded-lg">Remove</button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} isLoading={loading}>Save Recipe</Button>
      </div>
    </div>
  );
}
