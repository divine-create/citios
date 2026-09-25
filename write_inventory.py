content = '''"use client";

import React, { useState } from 'react';
import { Button, Input, Badge, EmptyState } from '@/components/ui';
import { Plus, Search, PackageOpen, ArrowUpRight, ArrowDownRight, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createInventoryItem, adjustStock } from '@/lib/actions/restaurantos';

export default function InventoryManager({ slug, items, movements }: { slug: string; items: any[]; movements: any[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'MOVEMENTS'>('ITEMS');
  const [search, setSearch] = useState("");
  
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", unit: "kg", quantity: "", lowStockLevel: "5", cost: "0", type: "RAW_MATERIAL" });

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    if (!newItem.name || !newItem.unit) {
      return toast.error("Name and Unit are required");
    }
    setLoading(true);
    const res: any = await createInventoryItem({
      organizationId: slug,
      name: newItem.name,
      unit: newItem.unit,
      quantity: parseFloat(newItem.quantity || "0"),
      lowStockLevel: parseFloat(newItem.lowStockLevel || "5"),
      cost: parseFloat(newItem.cost || "0"),
      type: newItem.type as any,
    });
    setLoading(false);
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Inventory item created!");
      setIsCreating(false);
      setNewItem({ name: "", unit: "kg", quantity: "", lowStockLevel: "5", cost: "0", type: "RAW_MATERIAL" });
      router.refresh();
    }
  };

  const handleAdjust = async (itemId: string) => {
    const delta = parseFloat(adjustAmount);
    if (!delta || isNaN(delta)) return toast.error("Enter a valid adjustment amount");

    setLoading(true);
    const res: any = await adjustStock(itemId, delta, adjustNote || undefined);
    setLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Stock adjusted successfully!");
      setAdjustingId(null);
      setAdjustAmount("");
      setAdjustNote("");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setActiveTab('ITEMS')} 
            className={px-4 py-2 text-sm font-black rounded-lg transition-all }
          >
            Current Stock
          </button>
          <button 
            onClick={() => setActiveTab('MOVEMENTS')} 
            className={px-4 py-2 text-sm font-black rounded-lg transition-all }
          >
            Audit Trail
          </button>
        </div>

        {activeTab === 'ITEMS' && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Input 
              placeholder="Search items..." 
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
            />
            <Button onClick={() => setIsCreating(true)} leftIcon={<Plus size={16} />}>New Item</Button>
          </div>
        )}
      </div>

      {isCreating && activeTab === 'ITEMS' && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Add Inventory Item</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Input label="Item Name" placeholder="e.g. Basmati Rice" value={newItem.name} onChange={(e: any) => setNewItem({...newItem, name: e.target.value})} />
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</label>
              <select className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:border-emerald-500" value={newItem.unit} onChange={(e: any) => setNewItem({...newItem, unit: e.target.value})}>
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="L">Liters (L)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="pieces">Pieces / Units</option>
                <option value="cartons">Cartons</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Type</label>
              <select className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:border-emerald-500" value={newItem.type} onChange={(e: any) => setNewItem({...newItem, type: e.target.value})}>
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="SUB_ASSEMBLY">Sub-assembly / Prepped</option>
                <option value="FINISHED_GOOD">Finished Good / Retail</option>
              </select>
            </div>

            <Input label="Initial Quantity" type="number" step="0.01" value={newItem.quantity} onChange={(e: any) => setNewItem({...newItem, quantity: e.target.value})} />
            <Input label="Low Stock Warning At" type="number" step="0.01" value={newItem.lowStockLevel} onChange={(e: any) => setNewItem({...newItem, lowStockLevel: e.target.value})} />
            <Input label="Cost per Unit (₦)" type="number" step="0.01" value={newItem.cost} onChange={(e: any) => setNewItem({...newItem, cost: e.target.value})} />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={loading}>Save Item</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
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
                    <p className="text-[10px] font-black text-slate-400 mt-0.5">{item.type.replace('_', ' ')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-black text-lg text-slate-900">{item.quantity}</span>
                    <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
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
                          step="0.01" 
                          value={adjustAmount} 
                          onChange={(e: any) => setAdjustAmount(e.target.value)} 
                          className="w-24 h-9 text-sm"
                        />
                        <Button size="sm" isLoading={loading} onClick={() => handleAdjust(item.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setAdjustingId(null)}>X</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setAdjustingId(item.id)}>Adjust Stock</Button>
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
                    <span className={inline-flex items-center gap-1 font-black }>
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
            description="Start tracking your raw materials and ingredients."
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
    </div>
  );
}
'''

with open('components/restaurantos/management/InventoryManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
