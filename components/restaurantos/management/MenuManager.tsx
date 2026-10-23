"use client";

import React, { useState } from 'react';
import { Button, Badge, Input } from '@/components/ui';
import { Plus, Search, Edit2, Sparkles, Image as ImageIcon, Trash2, X, Check } from 'lucide-react';
import { formatNaira } from '@/lib/utils';
import { toggleMenuItemAvailability, createMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/actions/restaurantos';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { STANDARDIZED_FOOD_CATEGORIES } from '@/lib/food-categories';
import {
  MENU_LIBRARY,
  MENU_LIBRARY_CATEGORIES,
  getMenuLibraryItems,
  MenuItemLibraryEntry,
} from '@/lib/menu-library';
import MenuLibraryPickerModal from '@/components/common/MenuLibraryPickerModal';
import MenuItemImagePicker from '@/components/common/MenuItemImagePicker';

const DEFAULT_CATEGORIES = STANDARDIZED_FOOD_CATEGORIES
  .filter((c) => c.id !== 'other')
  .map((c) => c.label);

export default function MenuManager({ slug, menu, settings }: { slug: string; menu: any[]; settings: any }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Menu library state
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<'create' | 'edit'>('create');
  const [libraryCategory, setLibraryCategory] = useState<string>("All");
  const [librarySearch, setLibrarySearch] = useState<string>("");

  const filterCategories = ["All", ...Array.from(new Set(menu.map((m: any) => m.category))).filter(Boolean)] as string[];
  const datalistCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...menu.map((m: any) => m.category)])).filter(Boolean) as string[];

  const filtered = menu.filter((m: any) => {
    if (categoryFilter !== "All" && m.category !== categoryFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleToggleAvailable = async (id: string, currentlyAvailable: boolean) => {
    await toggleMenuItemAvailability(id);
    router.refresh();
  };

  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", category: "", imageUrl: "" });

  // Edit item state
  const [editingItem, setEditingItem] = useState<{
    id: string;
    name: string;
    description: string;
    price: string;
    category: string;
    imageUrl: string;
    kitchenStation: string;
    isAvailable: boolean;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenEdit = (item: any) => {
    setEditingItem({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      price: String(item.price ?? ''),
      category: item.category || '',
      imageUrl: item.imageUrl || '',
      kitchenStation: item.kitchenStation || 'Main Kitchen',
      isAvailable: item.isAvailable ?? true,
    });
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    if (!editingItem.name.trim() || !editingItem.price || !editingItem.category.trim()) {
      return toast.error("Name, price, and category are required");
    }
    const parsedPrice = parseFloat(editingItem.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return toast.error("Price must be a valid number greater than or equal to 0");
    }

    setIsUpdating(true);
    const res: any = await updateMenuItem(editingItem.id, {
      name: editingItem.name.trim(),
      description: editingItem.description.trim() || null,
      price: parsedPrice,
      category: editingItem.category.trim(),
      imageUrl: editingItem.imageUrl.trim() || null,
      kitchenStation: editingItem.kitchenStation.trim() || 'Main Kitchen',
      isAvailable: editingItem.isAvailable,
    });
    setIsUpdating(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`"${editingItem.name}" updated successfully!`);
      setEditingItem(null);
      router.refresh();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    const res: any = await deleteMenuItem(id);
    setDeletingId(null);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`"${name}" deleted!`);
      if (editingItem?.id === id) {
        setEditingItem(null);
      }
      router.refresh();
    }
  };

  const handleSelectFromLibrary = (lib: MenuItemLibraryEntry) => {
    setNewItem({
      ...newItem,
      name: lib.name,
      category: lib.category,
      imageUrl: lib.imageUrl,
      price: lib.price.toString(),
      description: lib.description,
    });
    toast.success(`Loaded "${lib.name}" from library!`);
  };

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
      setNewItem({ name: "", description: "", price: "", category: "", imageUrl: "" });
      router.refresh();
    }
  };

  const libraryItems = getMenuLibraryItems(libraryCategory, librarySearch);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <Input 
            placeholder="Search menu..." 
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            leftIcon={<Search size={16} />}
            className="w-full sm:w-64"
          />
          <select 
            className="h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {filterCategories.map((c: any) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setLibraryTarget('create');
              setIsLibraryModalOpen(true);
            }}
            leftIcon={<Sparkles size={16} className="text-orange-500" />}
          >
            Browse Library ({MENU_LIBRARY.length})
          </Button>
          <Button onClick={() => setIsCreating(true)} leftIcon={<Plus size={16} />}>
            Create Menu Item
          </Button>
        </div>
      </div>

      {isCreating && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Create New Item</h3>
          
          {/* Quick Add from Menu Library */}
          <div className="mb-6 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Quick Add from Menu Library ({MENU_LIBRARY.length} Items)
                </p>
                <p className="text-[11px] text-slate-500">Pick authentic Nigerian dishes, grills, soups & cold drinks with photos</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Filter library..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-44"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLibraryTarget('create');
                    setIsLibraryModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 whitespace-nowrap px-2 py-1 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  View All Grid
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="px-4 py-2 border-b border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-hide bg-slate-50/50">
              {MENU_LIBRARY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setLibraryCategory(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-colors ${
                    libraryCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Card Scroll Track */}
            <div className="flex gap-3 overflow-x-auto p-4 scrollbar-hide snap-x">
              {libraryItems.map((lib) => (
                <button 
                  key={lib.id} 
                  type="button"
                  onClick={() => handleSelectFromLibrary(lib)}
                  className="shrink-0 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 transition-all text-left w-56 snap-start group"
                >
                  <img src={lib.imageUrl} alt={lib.name} className="w-12 h-12 rounded-lg object-cover ring-1 ring-black/5 shrink-0 bg-white" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">{lib.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{lib.category}</p>
                    <p className="text-[11px] font-black text-slate-900 mt-0.5">{formatNaira(lib.price)}</p>
                  </div>
                </button>
              ))}
              {libraryItems.length === 0 && (
                <p className="text-xs text-slate-400 py-3 px-2">No library items found matching "{librarySearch}".</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Input label="Name" value={newItem.name} onChange={(e: any) => setNewItem({...newItem, name: e.target.value})} />
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <input 
                list="cat-list"
                value={newItem.category}
                onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
                placeholder="e.g. Mains, Drinks"
              />
              <datalist id="cat-list">
                {datalistCategories.map((c: string) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <Input label="Price (₦)" type="number" value={newItem.price} onChange={(e: any) => setNewItem({...newItem, price: e.target.value})} />
            <Input label="Description (Optional)" value={newItem.description} onChange={(e: any) => setNewItem({...newItem, description: e.target.value})} />
            
            <div className="sm:col-span-2">
              <MenuItemImagePicker
                value={newItem.imageUrl}
                onChange={(url) => setNewItem({ ...newItem, imageUrl: url })}
                onOpenLibrary={() => {
                  setLibraryTarget('create');
                  setIsLibraryModalOpen(true);
                }}
                organizationId={slug}
                label="Dish / Beverage Photo"
                description="Pick from our 50-dish authentic library or upload a high-resolution photo."
              />
            </div>
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
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide ${item.isAvailable ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}
                  >
                    {item.isAvailable ? "Available" : "86'd"}
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
                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Edit2 size={16} />}
                    onClick={() => handleOpenEdit(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    leftIcon={<Trash2 size={16} />}
                    onClick={() => handleDelete(item.id, item.name)}
                    isLoading={deletingId === item.id}
                  >
                    Delete
                  </Button>
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

      {/* Edit Item Modal */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Edit Menu Item</h3>
                  <p className="text-xs text-slate-500">Update item details, pricing, station, and presentation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Item Name"
                    value={editingItem.name}
                    onChange={(e: any) => setEditingItem({ ...editingItem, name: e.target.value })}
                    placeholder="e.g. Special Jollof Rice"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                  <input
                    list="edit-cat-list"
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
                    placeholder="e.g. Mains, Drinks"
                  />
                  <datalist id="edit-cat-list">
                    {datalistCategories.map((c: string) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <Input
                  label="Price (₦)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingItem.price}
                  onChange={(e: any) => setEditingItem({ ...editingItem, price: e.target.value })}
                  placeholder="2500"
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kitchen Station</label>
                  <select
                    value={editingItem.kitchenStation}
                    onChange={(e) => setEditingItem({ ...editingItem, kitchenStation: e.target.value })}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
                  >
                    {['Main Kitchen', 'Bar', 'Grill', 'Salad Station', 'Bakery', 'Dessert'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Availability Status</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, isAvailable: true })}
                      className={`flex-1 h-12 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                        editingItem.isAvailable
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Check size={14} /> Available
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, isAvailable: false })}
                      className={`flex-1 h-12 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                        !editingItem.isAvailable
                          ? 'bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      86'd (Unavailable)
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Description (Optional)"
                    value={editingItem.description}
                    onChange={(e: any) => setEditingItem({ ...editingItem, description: e.target.value })}
                    placeholder="Flavor notes, ingredients, or allergens"
                  />
                </div>

                <div className="sm:col-span-2">
                  <MenuItemImagePicker
                    value={editingItem.imageUrl}
                    onChange={(url) => setEditingItem({ ...editingItem, imageUrl: url })}
                    onOpenLibrary={() => {
                      setLibraryTarget('edit');
                      setIsLibraryModalOpen(true);
                    }}
                    organizationId={slug}
                    label="Dish / Beverage Photo"
                    description="Pick from our 50-dish authentic library or upload a high-resolution photo."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <Button
                variant="ghost"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                leftIcon={<Trash2 size={16} />}
                onClick={() => handleDelete(editingItem.id, editingItem.name)}
                isLoading={deletingId === editingItem.id}
              >
                Delete Item
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} isLoading={isUpdating}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Grid Picker Modal */}
      <MenuLibraryPickerModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        selectedImageUrl={libraryTarget === 'edit' ? editingItem?.imageUrl : newItem.imageUrl}
        onSelect={(lib) => {
          if (libraryTarget === 'edit' && editingItem) {
            setEditingItem({
              ...editingItem,
              imageUrl: lib.imageUrl,
              category: editingItem.category || lib.category,
              description: editingItem.description || lib.description,
            });
            toast.success(`Applied image from "${lib.name}" to editor!`);
          } else {
            if (!isCreating) {
              setIsCreating(true);
            }
            handleSelectFromLibrary(lib);
          }
          setIsLibraryModalOpen(false);
        }}
      />
    </div>
  );
}
