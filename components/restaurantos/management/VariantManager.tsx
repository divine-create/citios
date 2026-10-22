'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  Loader2,
  X,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { formatNaira } from '@/lib/utils';
import {
  createVariant,
  updateVariant,
  deleteVariant,
  toggleVariantAvailability,
  updateRestaurantOSSettings,
} from '@/lib/actions/restaurantos';
import { toast } from 'sonner';
import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string | null;
  description?: string | null;
  isAvailable: boolean;
}

interface MenuItemVariant {
  id: string;
  menuItemId: string;
  organizationId: string;
  name: string;
  price: number;
  isAvailable: boolean;
  createdAt: string;
}

interface VariantManagerProps {
  slug: string;
  menuItems: MenuItem[];
  variants: MenuItemVariant[];
  settings?: any;
}

const COMMON_PRESETS = [
  { label: 'Small', name: 'Small' },
  { label: 'Regular', name: 'Regular' },
  { label: 'Large', name: 'Large' },
  { label: 'Extra Large', name: 'Extra Large' },
  { label: 'Single', name: 'Single Portion' },
  { label: 'Double', name: 'Double Portion' },
  { label: 'Half', name: 'Half' },
  { label: 'Full', name: 'Full' },
  { label: '50cl', name: '50cl' },
  { label: '75cl', name: '75cl' },
  { label: '1 Litre', name: '1 Litre' },
  { label: 'Family Size', name: 'Family Size' },
];

export default function VariantManager({
  slug,
  menuItems = [],
  variants = [],
  settings,
}: VariantManagerProps) {
  const router = useRouter();

  // Local state for instant optimistic updates
  const [itemsList, setItemsList] = useState<MenuItem[]>(menuItems);
  const [variantsList, setVariantsList] = useState<MenuItemVariant[]>(variants);
  const [capabilityEnabled, setCapabilityEnabled] = useState<boolean>(
    settings ? settings.enableVariants !== false : true
  );
  const [isEnablingCapability, setIsEnablingCapability] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [editingVariant, setEditingVariant] = useState<MenuItemVariant | null>(null);
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete modal state
  const [deletingVariant, setDeletingVariant] = useState<MenuItemVariant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick toggle availability loading tracker
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    itemsList.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set).sort();
  }, [itemsList]);

  // Group variants by menu item
  const variantsByMenuItem = useMemo(() => {
    const map = new Map<string, MenuItemVariant[]>();
    variantsList.forEach((v) => {
      const arr = map.get(v.menuItemId) || [];
      arr.push(v);
      map.set(v.menuItemId, arr);
    });
    return map;
  }, [variantsList]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return itemsList.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const itemMatches =
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query);
        const itemVariants = variantsByMenuItem.get(item.id) || [];
        const variantMatches = itemVariants.some((v) =>
          v.name.toLowerCase().includes(query)
        );
        return itemMatches || variantMatches;
      }
      return true;
    });
  }, [itemsList, selectedCategory, searchQuery, variantsByMenuItem]);

  // Handle Enable Capability
  const handleEnableCapability = async () => {
    setIsEnablingCapability(true);
    try {
      const res = await updateRestaurantOSSettings(slug, {
        enableVariants: true,
      });
      if (res && 'error' in res && res.error) {
        toast.error(res.error);
      } else {
        setCapabilityEnabled(true);
        toast.success('Variants capability enabled successfully!');
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to enable capability.');
    } finally {
      setIsEnablingCapability(false);
    }
  };

  // Open Create Modal
  const openCreateModal = (preselectedItemId?: string) => {
    setModalMode('create');
    setEditingVariant(null);
    setSelectedMenuItemId(preselectedItemId || itemsList[0]?.id || '');
    setVariantName('');
    const baseItem = itemsList.find(
      (i) => i.id === (preselectedItemId || itemsList[0]?.id)
    );
    setVariantPrice(baseItem ? String(baseItem.price) : '');
    setActionError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (variant: MenuItemVariant) => {
    setModalMode('edit');
    setEditingVariant(variant);
    setSelectedMenuItemId(variant.menuItemId);
    setVariantName(variant.name);
    setVariantPrice(String(variant.price));
    setActionError(null);
    setIsModalOpen(true);
  };

  // Submit Create / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantName.trim()) {
      setActionError('Variant name is required.');
      return;
    }
    const parsedPrice = parseFloat(variantPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setActionError('Please enter a valid price (₦0 or greater).');
      return;
    }
    if (!selectedMenuItemId) {
      setActionError('Please select a menu item.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      if (modalMode === 'create') {
        const res = await createVariant({
          organizationId: slug,
          menuItemId: selectedMenuItemId,
          name: variantName.trim(),
          price: parsedPrice,
        });

        if ('error' in res && res.error) {
          setActionError(res.error);
          setIsSubmitting(false);
          return;
        }

        const newVariant = res.variant;
        setVariantsList((prev) => [...prev, newVariant]);
        toast.success(`Variant "${variantName}" created successfully!`);
        setIsModalOpen(false);
        router.refresh();
      } else if (editingVariant) {
        const res = await updateVariant(editingVariant.id, {
          name: variantName.trim(),
          price: parsedPrice,
        });

        if ('error' in res && res.error) {
          setActionError(res.error);
          setIsSubmitting(false);
          return;
        }

        setVariantsList((prev) =>
          prev.map((v) =>
            v.id === editingVariant.id
              ? { ...v, name: variantName.trim(), price: parsedPrice }
              : v
          )
        );
        toast.success(`Variant updated successfully!`);
        setIsModalOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Availability (86'ing)
  const handleToggleAvailability = async (variant: MenuItemVariant) => {
    setTogglingId(variant.id);
    const nextStatus = !variant.isAvailable;

    // Optimistic update
    setVariantsList((prev) =>
      prev.map((v) => (v.id === variant.id ? { ...v, isAvailable: nextStatus } : v))
    );

    try {
      const res = await toggleVariantAvailability(variant.id);
      if ('error' in res && res.error) {
        // Rollback
        setVariantsList((prev) =>
          prev.map((v) =>
            v.id === variant.id ? { ...v, isAvailable: variant.isAvailable } : v
          )
        );
        toast.error(res.error);
      } else {
        toast.success(
          nextStatus
            ? `"${variant.name}" is now available!`
            : `"${variant.name}" is now 86'd (unavailable).`
        );
      }
    } catch (err: any) {
      // Rollback
      setVariantsList((prev) =>
        prev.map((v) =>
          v.id === variant.id ? { ...v, isAvailable: variant.isAvailable } : v
        )
      );
      toast.error(err?.message || 'Failed to update availability.');
    } finally {
      setTogglingId(null);
    }
  };

  // Delete Variant
  const handleDeleteVariant = async () => {
    if (!deletingVariant) return;
    setIsDeleting(true);

    try {
      const res = await deleteVariant(deletingVariant.id);
      if ('error' in res && res.error) {
        toast.error(res.error);
      } else {
        setVariantsList((prev) => prev.filter((v) => v.id !== deletingVariant.id));
        toast.success(`Variant "${deletingVariant.name}" removed.`);
        setDeletingVariant(null);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete variant.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Total summary metrics
  const totalVariants = variantsList.length;
  const availableVariants = variantsList.filter((v) => v.isAvailable).length;
  const unAvailableVariants = totalVariants - availableVariants;
  const itemsWithVariantsCount = Array.from(variantsByMenuItem.keys()).filter(
    (k) => (variantsByMenuItem.get(k) || []).length > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Capability Notification Banner if disabled */}
      {!capabilityEnabled && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <Layers size={22} />
            </div>
            <div>
              <p className="font-black text-sm">Variants Capability is Inactive</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Enable variants to activate size, portion, and style choices across your POS and online menus.
              </p>
            </div>
          </div>
          <Button
            onClick={handleEnableCapability}
            isLoading={isEnablingCapability}
            className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2"
          >
            Enable Variants Now
          </Button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Variants</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalVariants}</p>
          <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
            Across all menu items
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Items Configured</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {itemsWithVariantsCount} <span className="text-sm font-medium text-slate-400">/ {itemsList.length}</span>
          </p>
          <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
            Dishes with sizes/styles
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Available Now</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{availableVariants}</p>
          <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
            Active in POS & CityFood
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">86&apos;d (Unavailable)</p>
          <p className="text-2xl font-black text-rose-700 mt-1">{unAvailableVariants}</p>
          <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
            Temporarily paused
          </span>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        <div className="flex flex-1 items-center gap-2 max-w-md bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items or variants..."
            className="w-full text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {itemsList.length > 0 && (
            <Button
              onClick={() => openCreateModal()}
              leftIcon={<Plus size={16} />}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm"
            >
              Add Variant
            </Button>
          )}
          <Link
            href={`/workspaces/restaurantos/${slug}/management/menu`}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm transition flex items-center gap-1.5 shrink-0"
          >
            <UtensilsCrossed size={16} className="text-slate-500" />
            <span>Manage Menu</span>
          </Link>
        </div>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Categories ({itemsList.length})
          </button>
          {categories.map((cat) => {
            const count = itemsList.filter((i) => i.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State: No menu items at all */}
      {itemsList.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
            <UtensilsCrossed size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900">No menu items found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Variants are attached to dishes and drinks. Create your menu items first in the Menu Manager before configuring sizes and styles.
          </p>
          <div className="pt-2">
            <Link
              href={`/workspaces/restaurantos/${slug}/management/menu`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition shadow-sm"
            >
              <span>Go to Menu Manager</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State: Search filter no match */
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
            <Filter size={24} />
          </div>
          <h4 className="text-lg font-bold text-slate-900">No matching items or variants</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We couldn&apos;t find any dishes or variants matching &quot;{searchQuery}&quot;. Try adjusting your search query or category filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}
            className="text-xs font-bold text-teal-600 hover:underline pt-2 inline-block cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        /* Menu Items with Variants Grid */
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const itemVariants = variantsByMenuItem.get(item.id) || [];
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all"
              >
                {/* Menu Item Header */}
                <div className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-black/5 bg-slate-100 shadow-xs"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 ring-1 ring-black/5">
                        <UtensilsCrossed size={20} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-base tracking-tight truncate">
                          {item.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-bold uppercase tracking-wider shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>Base Price: <strong className="text-slate-800">{formatNaira(item.price)}</strong></span>
                        <span>·</span>
                        <span>{itemVariants.length} {itemVariants.length === 1 ? 'Variant' : 'Variants'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Add variant specifically for this item */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openCreateModal(item.id)}
                    leftIcon={<Plus size={14} />}
                    className="text-xs font-bold shrink-0 border-slate-200 hover:border-teal-500 hover:text-teal-700 bg-white"
                  >
                    Add Variant
                  </Button>
                </div>

                {/* Variants List for this Item */}
                <div className="p-4 md:p-5">
                  {itemVariants.length === 0 ? (
                    <div className="py-4 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <span>No variants configured yet. This item sells at its standard base price ({formatNaira(item.price)}).</span>
                      <button
                        onClick={() => openCreateModal(item.id)}
                        className="font-bold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={12} /> Add first size or style
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {itemVariants.map((v) => {
                        const isToggling = togglingId === v.id;
                        return (
                          <div
                            key={v.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                              v.isAvailable
                                ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                                : 'bg-rose-50/30 border-rose-200/70 opacity-80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-black text-slate-900 text-sm">{v.name}</p>
                                <p className="text-base font-black text-slate-900 mt-1">
                                  {formatNaira(v.price)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleToggleAvailability(v)}
                                disabled={isToggling}
                                title={v.isAvailable ? 'Click to 86 / mark unavailable' : 'Click to mark available'}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                                  v.isAvailable
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                }`}
                              >
                                {isToggling ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : v.isAvailable ? (
                                  <>
                                    <CheckCircle2 size={10} /> Available
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={10} /> 86&apos;d
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2.5">
                              <button
                                onClick={() => openEditModal(v)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                                title="Edit variant name & price"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setDeletingVariant(v)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete variant"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Variant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {modalMode === 'create' ? 'Add Item Variant' : 'Edit Variant'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalMode === 'create'
                      ? 'Configure sizes, portions, or style variants.'
                      : 'Update variant name and pricing.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Menu Item Selector (enabled only in create mode) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Menu Item
                </label>
                {modalMode === 'create' ? (
                  <select
                    value={selectedMenuItemId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedMenuItemId(id);
                      const it = itemsList.find((i) => i.id === id);
                      if (it && !variantPrice) {
                        setVariantPrice(String(it.price));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-800 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  >
                    {itemsList.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.category}) — Base {formatNaira(it.price)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700">
                    {itemsList.find((i) => i.id === selectedMenuItemId)?.name || 'Selected Dish'}
                  </div>
                )}
              </div>

              {/* Quick Preset Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Quick Name Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setVariantName(preset.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        variantName === preset.name
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variant Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Variant Name *
                </label>
                <input
                  type="text"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  placeholder="e.g. Small Plate, Large, Family Pack..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Variant Price (₦) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    ₦
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-black focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  This exact price will be charged when this variant is selected in POS or online.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {modalMode === 'create' ? 'Save Variant' : 'Update Variant'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Delete Variant?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove &quot;{deletingVariant.name}&quot;? Customers and cashiers will no longer be able to select this size/style.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingVariant(null)}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteVariant}
                isLoading={isDeleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
