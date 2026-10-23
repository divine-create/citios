'use client';

import React, { useState } from 'react';
import { Button, Input, Badge } from '@/components/ui';
import { createRecipe, createInventoryItem } from '@/lib/actions/restaurantos';
import { Plus, Trash2, X, ChefHat, BookOpen, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';

interface RecipeBuilderProps {
  inventory?: any[];
  menu?: any[];
  organizationId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function RecipeBuilder({
  inventory = [],
  menu = [],
  organizationId,
  onComplete,
  onCancel
}: RecipeBuilderProps) {
  const [name, setName] = useState('');
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [yieldQty, setYieldQty] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<{ itemId: string; quantity: number }[]>([]);
  const [loading, setLoading] = useState(false);

  // Local inventory state so quick-added items appear immediately
  const [localInventory, setLocalInventory] = useState<any[]>(Array.isArray(inventory) ? inventory : []);

  // Quick add raw material state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickUnit, setQuickUnit] = useState('kg');
  const [quickCost, setQuickCost] = useState('0');
  const [quickLoading, setQuickLoading] = useState(false);

  // Usable ingredients: raw materials and sub-assemblies, or fallback to all items
  const usableItems = localInventory.filter((i: any) => i.type !== 'FINISHED_GOOD');
  const availableItems = usableItems.length > 0 ? usableItems : localInventory;

  const handleMenuItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const menuItemId = e.target.value;
    setSelectedMenuItemId(menuItemId);
    if (menuItemId) {
      const selectedItem = menu.find((m: any) => m.id === menuItemId);
      if (selectedItem && (!name || menu.some((m: any) => m.name === name))) {
        setName(selectedItem.name);
      }
    }
  };

  const handleAddIngredient = () => {
    if (availableItems.length === 0) {
      setShowQuickAdd(true);
      toast.info('No inventory items yet. Add an ingredient below to save it directly to your pantry.');
      return;
    }
    setIngredients([...ingredients, { itemId: availableItems[0].id, quantity: 1 }]);
  };

  const handleQuickAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      toast.error('Please enter an ingredient name.');
      return;
    }

    setQuickLoading(true);
    try {
      const res = await createInventoryItem({
        organizationId,
        name: quickName.trim(),
        unit: quickUnit.trim() || 'unit',
        quantity: 0,
        lowStockLevel: 5,
        cost: parseFloat(quickCost) || 0,
        type: 'RAW_MATERIAL'
      });

      if (res && (res as any).error) {
        toast.error((res as any).error);
        return;
      }

      const newItem = (res as any)?.item || res;
      if (newItem && newItem.id) {
        setLocalInventory((prev) => [...prev, newItem]);
        setIngredients((prev) => [...prev, { itemId: newItem.id, quantity: 1 }]);
        setQuickName('');
        setQuickCost('0');
        setShowQuickAdd(false);
        toast.success(`Added "${newItem.name}" to inventory and recipe!`);
      } else {
        toast.error('Failed to create inventory ingredient.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error creating inventory ingredient.');
    } finally {
      setQuickLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a recipe name.');
      return;
    }
    if (yieldQty <= 0) {
      toast.error('Yield quantity must be greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const res = await createRecipe({
        organizationId,
        name: name.trim(),
        yieldQuantity: yieldQty,
        instructions: instructions.trim() || undefined,
        menuItemId: selectedMenuItemId || undefined,
        ingredients: ingredients
          .filter((ing) => ing.itemId && ing.quantity > 0)
          .map((ing) => ({
            itemId: ing.itemId,
            quantity: Number(ing.quantity)
          }))
      });

      if (res && (res as any).error) {
        toast.error((res as any).error);
        return;
      }

      toast.success('Recipe created successfully!');
      onComplete();
    } catch (e: any) {
      console.error('Error creating recipe:', e);
      toast.error(e.message || 'Failed to create recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ChefHat size={22} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Create Recipe (BOM)</h3>
            <p className="text-xs text-slate-500">Define yields, instructions, and raw material portions for automated stock depletion.</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Input
            label="Recipe Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 50L Pasta Sauce or Pepperoni Pizza"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Link to Menu Item (Optional)
          </label>
          <select
            className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-800"
            value={selectedMenuItemId}
            onChange={handleMenuItemChange}
          >
            <option value="">-- Standalone / Prep Recipe --</option>
            {menu.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.category || 'General'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <Input
            label="Yield Quantity (Portions/Units)"
            type="number"
            min={1}
            value={yieldQty}
            onChange={(e) => setYieldQty(Math.max(1, Number(e.target.value)))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Preparation Steps & Instructions
        </label>
        <textarea
          className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-800"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. 1. Dice the onions. 2. Sauté with garlic in olive oil for 5 minutes. 3. Simmer sauce for 45 mins..."
        />
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Raw Materials & Ingredients (BOM)
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              These items are deducted proportionally whenever this dish is ordered at the POS.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <PackagePlus size={14} className="mr-1.5 text-slate-500" />
              {showQuickAdd ? 'Hide Quick Add' : 'Quick Add Ingredient'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddIngredient}
              className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold"
            >
              <Plus size={14} className="mr-1.5" />
              Add Ingredient
            </Button>
          </div>
        </div>

        {/* Quick Add Raw Material Drawer/Section */}
        {showQuickAdd && (
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <PackagePlus size={14} className="text-emerald-600" />
                Quick-Add Ingredient to Inventory
              </span>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mozzarella, Olive Oil, Beef"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Unit</label>
                <input
                  type="text"
                  placeholder="e.g. kg, g, liters, pcs"
                  value={quickUnit}
                  onChange={(e) => setQuickUnit(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <Button
                  onClick={handleQuickAddIngredient}
                  isLoading={quickLoading}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  Save & Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Ingredients List */}
        {ingredients.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
            <BookOpen size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No ingredients added yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Click &quot;Add Ingredient&quot; above to link your raw materials, or click &quot;Quick Add Ingredient&quot; to register new inventory on the fly.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ingredients.map((ing, i) => {
              const currentItem = availableItems.find((rm: any) => rm.id === ing.itemId);
              return (
                <div key={i} className="flex flex-wrap sm:flex-nowrap gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex-1 min-w-[200px]">
                    <select
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 font-medium text-slate-800"
                      value={ing.itemId}
                      onChange={(e) => {
                        const newIngs = [...ingredients];
                        newIngs[i].itemId = e.target.value;
                        setIngredients(newIngs);
                      }}
                    >
                      {availableItems.map((rm: any) => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name} ({rm.unit || 'unit'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        className="w-32 h-10 px-3 pr-12 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 font-medium text-slate-800"
                        value={ing.quantity}
                        onChange={(e) => {
                          const newIngs = [...ingredients];
                          newIngs[i].quantity = Math.max(0, parseFloat(e.target.value) || 0);
                          setIngredients(newIngs);
                        }}
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                        {currentItem?.unit || 'unit'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Remove Ingredient"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end items-center gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          isLoading={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
        >
          Save Recipe
        </Button>
      </div>
    </div>
  );
}
