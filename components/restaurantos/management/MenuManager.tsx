'use client';

import React, { useState } from 'react';
import { Button, Badge, Input } from '@/components/ui';
import { Plus, Search, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { formatNaira } from '@/lib/utils';
import { toggleMenuItemAvailability, createMenuItem } from '@/lib/actions/restaurantos';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function MenuManager({ slug, menu, settings }: { slug: string; menu: any[]; settings: any }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', ...Array.from(new Set(menu.map((m: any) => m.category))).filter(Boolean)] as string[];

  const filtered = menu.filter((m: any) => {
    if (categoryFilter !== 'All' && m.category !== categoryFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleToggleAvailable = async (id: string, currentlyAvailable: boolean) => {
    await toggleMenuItemAvailability(id);
    router.refresh();
  };

  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: '' });

  const handleCreate = async () => {
    if (!newItem.name || !newItem.price || !newItem.category) {
      return toast.error("Name, price, and category are required");
    }
    setLoading(true);
    const res: any = await createMenuItem({
      organizationId: slug,
      name: newItem.name,
      description: newItem.description,
      price: parseFloat(newItem.price),
      category: newItem.category,
      imageUrl: (newItem as any).imageUrl || undefined
    });
    setLoading(false);
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Menu item created!");
      setIsCreating(false);
      setNewItem({ name: '', description: '', price: '', category: '' });
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <Input 
            placeholder="Search menu..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
            className="w-full sm:w-64"
          />
          <select 
            className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((c: any) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button onClick={() => setIsCreating(true)} leftIcon={<Plus size={16} />}>Create Menu Item</Button>
      </div>

      {isCreating && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Create New Item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Input label="Name" value={newItem.name} onChange={(e: any) => setNewItem({...newItem, name: e.target.value})} />
            <Input label="Category (e.g. Mains, Drinks)" value={newItem.category} onChange={(e: any) => setNewItem({...newItem, category: e.target.value})} list="cat-list" />
            <datalist id="cat-list">
              {categories.map((c: any) => <option key={c} value={c} />)}
            </datalist>
            <Input label="Price (₦)" type="number" value={newItem.price} onChange={(e: any) => setNewItem({...newItem, price: e.target.value})} />
            <Input label="Description (Optional)" value={newItem.description} onChange={(e: any) => setNewItem({...newItem, description: e.target.value})} />
            <Input label="Image URL (Optional)" value={(newItem as any).imageUrl || ''} onChange={(e: any) => setNewItem({...newItem, imageUrl: e.target.value} as any)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={loading}>Save Item</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Item Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Availability</th>
              {settings?.enableRecipes && <th className="px-6 py-4">Recipe</th>}
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-black/5 bg-slate-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 ring-1 ring-black/5 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      {item.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{item.category}</td>
                <td className="px-6 py-4 font-black text-slate-900">{formatNaira(item.price)}</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleToggleAvailable(item.id, item.isAvailable)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide ${item.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
                  >
                    {item.isAvailable ? 'Available' : '86\'d'}
                  </button>
                </td>
                {settings?.enableRecipes && (
                  <td className="px-6 py-4">
                    {item.recipeId ? (
                      <Badge variant="teal">Configured</Badge>
                    ) : (
                      <Badge variant="default">No Recipe</Badge>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 text-right space-x-2">
                  <Button variant="ghost" size="sm" leftIcon={<Edit2 size={16} />}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <h3 className="text-lg font-black text-slate-900">No items found.</h3>
            <p className="text-slate-500 mt-1 text-sm">Adjust your filters or create a new menu item.</p>
          </div>
        )}
      </div>
    </div>
  );
}
