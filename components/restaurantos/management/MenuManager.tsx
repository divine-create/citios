'use client';

import React, { useState } from 'react';
import { Button, Badge, Input } from '@/components/ui';
import { Plus, Search, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { formatNaira } from '@/lib/utils';
import { toggleMenuItemAvailability } from '@/lib/actions/restaurantos';
import { useRouter } from 'next/navigation';

export default function MenuManager({ slug, menu, settings }: { slug: string; menu: any[]; settings: any }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', ...Array.from(new Set(menu.map(m => m.category))).filter(Boolean)] as string[];

  const filtered = menu.filter(m => {
    if (categoryFilter !== 'All' && m.category !== categoryFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleToggleAvailable = async (id: string, currentlyAvailable: boolean) => {
    await toggleMenuItemAvailability(id);
    router.refresh();
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
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button leftIcon={<Plus size={16} />}>Create Menu Item</Button>
      </div>

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
                  <p className="font-bold text-slate-900">{item.name}</p>
                  {item.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.description}</p>}
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
