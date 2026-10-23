"use client";

import React, { useState } from 'react';
import { Button, Input, Badge, EmptyState } from '@/components/ui';
import { Plus, Search, PackageOpen, ArrowUpRight, ArrowDownRight, Edit2, Trash2, Scale, X, Layers, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStock,
  DEFAULT_RESTAURANT_UNITS
} from '@/lib/actions/restaurantos';
import UnitManager from './UnitManager';

interface InventoryManagerProps {
  slug: string;
  items: any[];
  movements: any[];
  units?: string[];
}

export default function InventoryManager({
  slug,
  items = [],
  movements = [],
  units = []
}: InventoryManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'UNITS' | 'MOVEMENTS'>('ITEMS');
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  
  // Available units list
  const availableUnits = units.length > 0 ? units : [...DEFAULT_RESTAURANT_UNITS];

  // Create state
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    unit: availableUnits[0] || "kg",
    quantity: "",
    lowStockLevel: "5",
    cost: "0",
    type: "RAW_MATERIAL"
  });

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    unit: "kg",
    lowStockLevel: "5",
    cost: "0",
    type: "RAW_MATERIAL"
  });
  const [editLoading, setEditLoading] = useState(false);

  // Delete Item State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Stock Adjustment state
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  // Filter items
  const filteredItems = items.filter(i => {
    if (typeFilter !== "ALL" && i.type !== typeFilter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Calculate unit usage
  const unitCounts: Record<string, number> = {};
  for (const item of items) {
    const u = String(item.unit || '').trim();
    unitCounts[u] = (unitCounts[u] || 0) + 1;
  }
  const defaultSet = new Set(DEFAULT_RESTAURANT_UNITS.map(u => u.toLowerCase()));
  const unitsUsage = availableUnits.map(unit => ({
    unit,
    count: unitCounts[unit] || 0,
    isCustom: !defaultSet.has(unit.toLowerCase()),
  }));

  const handleCreate = async () => {
    if (!newItem.name.trim() || !newItem.unit) {
      return toast.error("Name and Unit are required");
    }
    setLoading(true);
    try {
      const res: any = await createInventoryItem({
        organizationId: slug,
        name: newItem.name.trim(),
        unit: newItem.unit,
        quantity: parseFloat(newItem.quantity || "0"),
        lowStockLevel: parseFloat(newItem.lowStockLevel || "5"),
        cost: parseFloat(newItem.cost || "0"),
        type: newItem.type as any,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Inventory item "${newItem.name}" created!`);
        setIsCreating(false);
        setNewItem({
          name: "",
          unit: availableUnits[0] || "kg",
          quantity: "",
          lowStockLevel: "5",
          cost: "0",
          type: "RAW_MATERIAL"
        });
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create inventory item');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      unit: item.unit || availableUnits[0] || "kg",
      lowStockLevel: String(item.lowStockLevel ?? "5"),
      cost: String(item.cost ?? "0"),
      type: item.type || "RAW_MATERIAL"
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editForm.name.trim()) {
      return toast.error("Item name cannot be empty.");
    }
    if (!editForm.unit.trim()) {
      return toast.error("Unit cannot be empty.");
    }

    setEditLoading(true);
    try {
      const res: any = await updateInventoryItem(editingItem.id, {
        name: editForm.name.trim(),
        unit: editForm.unit.trim(),
        lowStockLevel: parseFloat(editForm.lowStockLevel) || 0,
        cost: parseFloat(editForm.cost) || 0,
        type: editForm.type as any,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Item "${editForm.name}" updated successfully!`);
        setEditingItem(null);
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update item.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!confirm(`Are you sure you want to delete inventory item "${item.name}"?`)) {
      return;
    }

    setDeletingId(item.id);
    try {
      const res: any = await deleteInventoryItem(item.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Item "${item.name}" deleted successfully.`);
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete inventory item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdjust = async (itemId: string) => {
    const delta = parseFloat(adjustAmount);
    if (!delta || isNaN(delta)) return toast.error("Enter a valid adjustment amount");

    setLoading(true);
    try {
      const res: any = await adjustStock(itemId, delta, adjustNote || undefined);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Stock adjusted successfully!");
        setAdjustingId(null);
        setAdjustAmount("");
        setAdjustNote("");
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Tab Bar & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setActiveTab('ITEMS')} 
            className={"px-4 py-2 text-sm font-black rounded-lg transition-all " + (activeTab === 'ITEMS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >
            Current Stock ({items.length})
          </button>
          <button 
            onClick={() => setActiveTab('UNITS')} 
            className={"flex items-center gap-1.5 px-4 py-2 text-sm font-black rounded-lg transition-all " + (activeTab === 'UNITS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >
            <Scale size={15} />
            Units of Measure ({availableUnits.length})
          </button>
          <button 
            onClick={() => setActiveTab('MOVEMENTS')} 
            className={"px-4 py-2 text-sm font-black rounded-lg transition-all " + (activeTab === 'MOVEMENTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >
            Audit Trail ({movements.length})
          </button>
        </div>

        {activeTab === 'ITEMS' && (
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="RAW_MATERIAL">Raw Materials</option>
              <option value="SUB_ASSEMBLY">Sub-Assemblies</option>
              <option value="FINISHED_GOOD">Finished Goods</option>
            </select>

            <Input 
              placeholder="Search items..." 
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
              className="h-10 text-sm"
            />
            <Button
              onClick={() => setIsCreating(true)}
              leftIcon={<Plus size={16} />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold whitespace-nowrap h-10 shadow-sm"
            >
              New Item
            </Button>
          </div>
        )}
      </div>

      {/* Units of Measure Tab */}
      {activeTab === 'UNITS' && (
        <UnitManager slug={slug} initialUnits={availableUnits} initialUsage={unitsUsage} />
      )}

      {/* Create New Item Form */}
      {isCreating && activeTab === 'ITEMS' && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in zoom-in-95 duration-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Add Inventory Item</h3>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Input
              label="Item Name"
              placeholder="e.g. Basmati Rice, Olive Oil"
              value={newItem.name}
              onChange={(e: any) => setNewItem({...newItem, name: e.target.value})}
              required
            />
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit of Measure</label>
                <button
                  type="button"
                  onClick={() => setActiveTab('UNITS')}
                  className="text-[11px] font-bold text-emerald-600 hover:underline"
                >
                  + Manage Units
                </button>
              </div>
              <select
                className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:border-emerald-500"
                value={newItem.unit}
                onChange={(e: any) => setNewItem({...newItem, unit: e.target.value})}
              >
                {availableUnits.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Type</label>
              <select
                className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:border-emerald-500"
                value={newItem.type}
                onChange={(e: any) => setNewItem({...newItem, type: e.target.value})}
              >
                <option value="RAW_MATERIAL">Raw Material (e.g. Flour, Meat)</option>
                <option value="SUB_ASSEMBLY">Sub-assembly / Prepped (e.g. Tomato Sauce base)</option>
                <option value="FINISHED_GOOD">Finished Good / Retail (e.g. Bottled Water, Cake)</option>
              </select>
            </div>

            <Input
              label="Initial Quantity"
              type="number"
              step="any"
              placeholder="0"
              value={newItem.quantity}
              onChange={(e: any) => setNewItem({...newItem, quantity: e.target.value})}
            />
            <Input
              label="Low Stock Warning At"
              type="number"
              step="any"
              placeholder="5"
              value={newItem.lowStockLevel}
              onChange={(e: any) => setNewItem({...newItem, lowStockLevel: e.target.value})}
            />
            <Input
              label="Cost per Unit (₦)"
              type="number"
              step="any"
              placeholder="0.00"
              value={newItem.cost}
              onChange={(e: any) => setNewItem({...newItem, cost: e.target.value})}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Save Item
            </Button>
          </div>
        </div>
      )}

      {/* Items Table & Movement Table */}
      {activeTab !== 'UNITS' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {activeTab === 'ITEMS' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Item Name & Type</th>
                  <th className="px-6 py-4">In Stock</th>
                  <th className="px-6 py-4">Unit Cost</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] font-black text-slate-400 mt-0.5 tracking-wider uppercase">
                        {item.type ? item.type.replace('_', ' ') : 'RAW MATERIAL'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-lg text-slate-900">{item.quantity}</span>
                      <span className="text-xs text-slate-500 ml-1 font-semibold">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">₦{item.cost?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4">
                      {item.quantity <= 0 ? (
                        <Badge variant="error">Out of Stock</Badge>
                      ) : item.quantity <= item.lowStockLevel ? (
                        <Badge variant="warning">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">Healthy</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {adjustingId === item.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input 
                            placeholder="+/- Qty" 
                            type="number" 
                            step="any" 
                            value={adjustAmount} 
                            onChange={(e: any) => setAdjustAmount(e.target.value)} 
                            className="w-24 h-9 text-sm"
                            autoFocus
                          />
                          <Button size="sm" isLoading={loading} onClick={() => handleAdjust(item.id)} className="bg-emerald-600 text-white">Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setAdjustingId(null)}>✕</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAdjustingId(item.id)}
                            className="text-xs"
                          >
                            Adjust
                          </Button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            disabled={deletingId === item.id}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Change</th>
                  <th className="px-6 py-4">Type / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-medium whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{m.itemName}</td>
                    <td className="px-6 py-4">
                      <span className={"inline-flex items-center gap-1 font-black " + (m.delta > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {m.delta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(m.delta)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-700">{m.type.replace('_', ' ')}</p>
                      {m.note && <p className="text-[10px] text-slate-500 mt-0.5">{m.note}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {activeTab === 'ITEMS' && filteredItems.length === 0 && (
            <EmptyState 
              icon={<PackageOpen size={32} />}
              title="No inventory items"
              description="Start tracking your raw materials, ingredients, and prepped batches."
              action={{ label: "Add Item", onClick: () => setIsCreating(true) }}
            />
          )}

          {activeTab === 'MOVEMENTS' && movements.length === 0 && (
            <EmptyState 
              icon={<PackageOpen size={32} />}
              title="No stock movements"
              description="Adjustments, sales, and production yields will appear here."
            />
          )}
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">Edit Inventory Item</h3>
                <p className="text-xs text-slate-500">Update item details, measurement unit, or categorization.</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <Input
                label="Item Name"
                value={editForm.name}
                onChange={(e: any) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit of Measure</label>
                  <select
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500"
                    value={editForm.unit}
                    onChange={(e: any) => setEditForm({ ...editForm, unit: e.target.value })}
                  >
                    {availableUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Type</label>
                  <select
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500"
                    value={editForm.type}
                    onChange={(e: any) => setEditForm({ ...editForm, type: e.target.value })}
                  >
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="SUB_ASSEMBLY">Sub-assembly / Prepped</option>
                    <option value="FINISHED_GOOD">Finished Good / Retail</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Low Stock Warning At"
                  type="number"
                  step="any"
                  value={editForm.lowStockLevel}
                  onChange={(e: any) => setEditForm({ ...editForm, lowStockLevel: e.target.value })}
                />
                <Input
                  label="Unit Cost (₦)"
                  type="number"
                  step="any"
                  value={editForm.cost}
                  onChange={(e: any) => setEditForm({ ...editForm, cost: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={editLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
