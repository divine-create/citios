'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Utensils, DollarSign, Tag, Loader2 } from 'lucide-react';
import { upsertManagedMenuItem, deleteManagedMenuItem } from '@/lib/actions/hq-managed-business';
import MediaLinkOrUploadInput from './MediaLinkOrUploadInput';
import { toast } from 'sonner';

interface MenuItemData {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  kitchenStation: string | null;
}

interface ManagedCatalogEditorProps {
  organizationId: string;
  initialItems: MenuItemData[];
  verticalType: string;
}

export default function ManagedCatalogEditor({
  organizationId,
  initialItems,
  verticalType,
}: ManagedCatalogEditorProps) {
  const [items, setItems] = useState<MenuItemData[]>(initialItems);
  const [editingItem, setEditingItem] = useState<Partial<MenuItemData> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = Array.from(new Set(items.map((i) => i.category || 'Mains'))).filter(Boolean);

  const filteredItems = selectedCategory === 'ALL' ? items : items.filter((i) => i.category === selectedCategory);

  const handleOpenAdd = () => {
    setEditingItem({
      organizationId,
      name: '',
      category: categories[0] || 'Rice & Meals',
      price: 2500,
      description: '',
      imageUrl: '',
      isAvailable: true,
      kitchenStation: 'Main Kitchen',
    } as any);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItemData) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem.price) {
      toast.error('Please enter an item name and price.');
      return;
    }

    setSaving(true);
    try {
      const res = await upsertManagedMenuItem({
        id: editingItem.id,
        organizationId,
        name: editingItem.name,
        category: editingItem.category || 'General',
        price: Number(editingItem.price),
        description: editingItem.description || undefined,
        imageUrl: editingItem.imageUrl || undefined,
        isAvailable: editingItem.isAvailable ?? true,
        kitchenStation: editingItem.kitchenStation || undefined,
      });

      if (res.success) {
        toast.success(editingItem.id ? 'Item updated successfully!' : 'New item added to catalog!');
        // Update local state
        if (editingItem.id) {
          setItems((prev) =>
            prev.map((it) => (it.id === editingItem.id ? ({ ...it, ...editingItem } as MenuItemData) : it))
          );
        } else {
          setItems((prev) => [
            {
              id: res.menuItemId || String(Date.now()),
              name: editingItem.name!,
              category: editingItem.category || 'General',
              price: Number(editingItem.price),
              description: editingItem.description || null,
              imageUrl: editingItem.imageUrl || null,
              isAvailable: editingItem.isAvailable ?? true,
              kitchenStation: editingItem.kitchenStation || null,
            },
            ...prev,
          ]);
        }
        setIsModalOpen(false);
        setEditingItem(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from this catalog?`)) return;

    try {
      const res = await deleteManagedMenuItem(itemId, organizationId);
      if (res.success) {
        toast.success(`Removed ${name}`);
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white">Menu & Catalog Manager</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-xs">
              {items.length} items
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Insert dishes, set prices in ₦, link/upload images, and manage availability for residents.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl transition-all shrink-0 shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" /> Add Item / Dish
        </button>
      </div>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-white text-slate-950'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Categories ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-teal-500 text-slate-950 font-black'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Catalog Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all group"
          >
            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-850 shrink-0">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/150x150?text=No+Photo';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-[10px]">
                    <Utensils className="w-5 h-5 mb-1" /> No Photo
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="text-sm font-bold text-white truncate" title={item.name}>
                    {item.name}
                  </h4>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 ${
                      item.isAvailable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {item.isAvailable ? 'In Stock' : '86ed'}
                  </span>
                </div>

                <p className="text-[11px] text-teal-400 font-bold mt-0.5">{item.category}</p>
                <p className="text-xs font-mono font-black text-white mt-1.5">₦{item.price.toLocaleString()}</p>
              </div>
            </div>

            {item.description && (
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-3 leading-relaxed">{item.description}</p>
            )}

            <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-4">
              <span className="text-[10px] text-slate-500 font-mono">
                {item.kitchenStation || 'Main Kitchen'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                  title="Edit item"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.name)}
                  className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                  title="Delete item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
            <Utensils className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white">No Items in this Category</h3>
            <p className="text-xs text-slate-500 mt-1">Click "Add Item / Dish" above to populate the catalog.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/40">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-teal-400" />
                {editingItem.id ? 'Edit Catalog Item' : 'Add New Item / Dish'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="e.g. Seafood Okro Soup or Refuel Jollof"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.category || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    placeholder="e.g. Rice & Meals, Grills, Drinks"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Price (₦ NGN) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="50"
                    value={editingItem.price || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                    placeholder="3500"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Description / Ingredients
                </label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Ingredients, portion size, flavor notes..."
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Image Input (Link or Upload) */}
              <MediaLinkOrUploadInput
                label="Item Image (Direct Link or Upload)"
                value={editingItem.imageUrl || ''}
                onChange={(url) => setEditingItem({ ...editingItem, imageUrl: url })}
                placeholder="https://crunchies.s3.eu-west-1.wasabisys.com/...png"
                description="Provide direct image URL from official brand site or upload image directly."
              />

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Kitchen / Bar Station
                  </label>
                  <input
                    type="text"
                    value={editingItem.kitchenStation || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, kitchenStation: e.target.value })}
                    placeholder="Main Kitchen, Grill, Bar"
                    className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="isAvailableToggle"
                    checked={editingItem.isAvailable ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, isAvailable: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-teal-500 focus:ring-0"
                  />
                  <label htmlFor="isAvailableToggle" className="text-xs font-bold text-white cursor-pointer">
                    Available for Ordering
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl transition-all disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingItem.id ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
