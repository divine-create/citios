'use client';

import React, { useState } from 'react';
import { Button, Badge } from '@/components/ui';
import { Plus, Settings2, Trash2, SlidersHorizontal, AlertCircle, X, Layers } from 'lucide-react';
import { formatNaira } from '@/lib/utils';
import {
  createModifierGroup,
  createModifierOption,
  deleteModifierGroup,
  deleteModifierOption,
} from '@/lib/actions/restaurantos';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ModifierManager({
  slug,
  groups = [],
  options = [],
  inventory = [],
  settings,
}: {
  slug: string;
  groups: any[];
  options: any[];
  inventory: any[];
  settings: any;
}) {
  const router = useRouter();

  // Local state for optimistic updates
  const [groupsList, setGroupsList] = useState<any[]>(groups);
  const [optionsList, setOptionsList] = useState<any[]>(options);

  // Group Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [minSelections, setMinSelections] = useState('0');
  const [maxSelections, setMaxSelections] = useState('1');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Option Modal
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [targetGroup, setTargetGroup] = useState<any | null>(null);
  const [optionName, setOptionName] = useState('');
  const [priceDelta, setPriceDelta] = useState('0');
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [isSubmittingOption, setIsSubmittingOption] = useState(false);
  const [optionError, setOptionError] = useState<string | null>(null);

  // Deleting
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [deletingOptionId, setDeletingOptionId] = useState<string | null>(null);

  // Open Create Group Modal
  const openCreateGroup = () => {
    setGroupName('');
    setIsRequired(false);
    setMinSelections('0');
    setMaxSelections('1');
    setGroupError(null);
    setIsGroupModalOpen(true);
  };

  // Open Add Option Modal
  const openAddOption = (group: any) => {
    setTargetGroup(group);
    setOptionName('');
    setPriceDelta('0');
    setInventoryItemId('');
    setOptionError(null);
    setIsOptionModalOpen(true);
  };

  // Submit Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setGroupError('Group name is required.');
      return;
    }

    setIsSubmittingGroup(true);
    setGroupError(null);

    try {
      const res = await createModifierGroup({
        organizationId: slug,
        name: groupName.trim(),
        isRequired,
        minSelections: parseInt(minSelections || '0', 10),
        maxSelections: parseInt(maxSelections || '1', 10),
      });

      if (res && res.id) {
        setGroupsList((prev) => [...prev, res]);
        toast.success(`Modifier group "${groupName}" created!`);
        setIsGroupModalOpen(false);
        router.refresh();
      } else {
        setGroupError('Failed to create group.');
      }
    } catch (err: any) {
      setGroupError(err?.message || 'Failed to create group.');
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // Submit Add Option
  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGroup) return;
    if (!optionName.trim()) {
      setOptionError('Option name is required.');
      return;
    }

    const price = parseFloat(priceDelta || '0');
    if (isNaN(price) || price < 0) {
      setOptionError('Price delta must be ₦0 or greater.');
      return;
    }

    setIsSubmittingOption(true);
    setOptionError(null);

    try {
      const res = await createModifierOption({
        organizationId: slug,
        modifierGroupId: targetGroup.id,
        name: optionName.trim(),
        priceDelta: price,
        inventoryItemId: inventoryItemId || undefined,
      });

      if (res && res.id) {
        setOptionsList((prev) => [...prev, res]);
        toast.success(`Option "${optionName}" added to "${targetGroup.name}"!`);
        setIsOptionModalOpen(false);
        router.refresh();
      } else {
        setOptionError('Failed to add option.');
      }
    } catch (err: any) {
      setOptionError(err?.message || 'Failed to add option.');
    } finally {
      setIsSubmittingOption(false);
    }
  };

  // Delete Group
  const handleDeleteGroup = async (groupId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete modifier group "${name}"?`)) return;

    setDeletingGroupId(groupId);
    try {
      const res = await deleteModifierGroup(groupId);
      if (res && 'error' in res && res.error) {
        toast.error(res.error);
      } else {
        setGroupsList((prev) => prev.filter((g) => g.id !== groupId));
        setOptionsList((prev) => prev.filter((o) => o.modifierGroupId !== groupId));
        toast.success(`Group "${name}" deleted.`);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete group.');
    } finally {
      setDeletingGroupId(null);
    }
  };

  // Delete Option
  const handleDeleteOption = async (optionId: string, name: string) => {
    setDeletingOptionId(optionId);
    try {
      const res = await deleteModifierOption(optionId);
      if (res && 'error' in res && res.error) {
        toast.error(res.error);
      } else {
        setOptionsList((prev) => prev.filter((o) => o.id !== optionId));
        toast.success(`Option "${name}" removed.`);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete option.');
    } finally {
      setDeletingOptionId(null);
    }
  };

  if (groupsList.length === 0) {
    return (
      <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
          <SlidersHorizontal size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-900">No modifier groups yet</h3>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto mb-6 text-sm leading-relaxed">
          Create customization groups such as Extra Toppings, Choice of Protein, Sides, or Sauce Options to allow customers to customize their orders.
        </p>
        <Button
          onClick={openCreateGroup}
          leftIcon={<Plus size={16} />}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
        >
          Create Modifier Group
        </Button>

        {/* Modal when empty */}
        {renderGroupModal()}
      </div>
    );
  }

  function renderGroupModal() {
    if (!isGroupModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <SlidersHorizontal size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Create Modifier Group</h3>
                <p className="text-xs text-slate-500">e.g. Choice of Protein, Toppings, Extras</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
            {groupError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{groupError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Group Name *
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Choice of Meat, Toppings, Extra Cheese"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isRequired"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <label htmlFor="isRequired" className="text-xs font-bold text-slate-700 cursor-pointer">
                Required Selection (Customer must choose at least one)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Min Selections
                </label>
                <input
                  type="number"
                  min="0"
                  value={minSelections}
                  onChange={(e) => setMinSelections(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Max Selections
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxSelections}
                  onChange={(e) => setMaxSelections(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGroupModalOpen(false)}
                disabled={isSubmittingGroup}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmittingGroup}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Create Group
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderOptionModal() {
    if (!isOptionModalOpen || !targetGroup) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Add Option to &quot;{targetGroup.name}&quot;</h3>
                <p className="text-xs text-slate-500">Define option name and price delta.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOptionModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleAddOption} className="p-6 space-y-4">
            {optionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{optionError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Option Name *
              </label>
              <input
                type="text"
                value={optionName}
                onChange={(e) => setOptionName(e.target.value)}
                placeholder="e.g. Extra Plantain, Grilled Chicken, Mild Sauce"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Price Delta (₦)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  +₦
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={priceDelta}
                  onChange={(e) => setPriceDelta(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-black focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Set to 0 if this option is included for free.</p>
            </div>

            {settings?.enableInventory && inventory.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Linked Inventory Item (Optional)
                </label>
                <select
                  value={inventoryItemId}
                  onChange={(e) => setInventoryItemId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                >
                  <option value="">No inventory linkage</option>
                  {inventory.map((inv: any) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} ({inv.quantity} {inv.unit} in stock)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOptionModalOpen(false)}
                disabled={isSubmittingOption}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmittingOption}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Add Option
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {groupsList.length} {groupsList.length === 1 ? 'Modifier Group' : 'Modifier Groups'}
        </p>
        <Button
          onClick={openCreateGroup}
          leftIcon={<Plus size={16} />}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
        >
          Create Group
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groupsList.map((group: any) => {
          const groupOptions = optionsList.filter((o: any) => o.modifierGroupId === group.id);
          const isDeletingThisGroup = deletingGroupId === group.id;

          return (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-start gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                      {group.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                      {group.isRequired ? (
                        <Badge variant="warning">Required</Badge>
                      ) : (
                        <Badge variant="default">Optional</Badge>
                      )}
                      {group.minSelections > 0 && (
                        <span className="text-xs font-bold text-slate-400">
                          Min: {group.minSelections}
                        </span>
                      )}
                      {group.maxSelections > 0 && (
                        <span className="text-xs font-bold text-slate-400">
                          Max: {group.maxSelections}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddOption(group)}
                      leftIcon={<Plus size={14} />}
                      className="text-xs font-bold border-slate-200 hover:border-indigo-500 hover:text-indigo-700 bg-white"
                    >
                      Add Option
                    </Button>
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      disabled={isDeletingThisGroup}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete modifier group"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-0">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {groupOptions.map((opt: any) => {
                        const isDeletingThisOption = deletingOptionId === opt.id;
                        return (
                          <tr key={opt.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 font-semibold text-slate-800">
                              {opt.name}
                            </td>
                            <td className="px-5 py-3 text-slate-600 font-bold">
                              {opt.priceDelta > 0 ? `+${formatNaira(opt.priceDelta)}` : 'Free'}
                            </td>
                            {settings?.enableInventory && (
                              <td className="px-5 py-3 text-right">
                                {opt.inventoryItemId ? (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    Impacts Stock
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                    No Impact
                                  </span>
                                )}
                              </td>
                            )}
                            <td className="px-3 py-3 text-right w-10">
                              <button
                                onClick={() => handleDeleteOption(opt.id, opt.name)}
                                disabled={isDeletingThisOption}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Remove option"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {groupOptions.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-6 text-center text-slate-400 text-xs italic"
                          >
                            No options defined yet. Click &quot;Add Option&quot; above to create choices.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Render modals */}
      {renderGroupModal()}
      {renderOptionModal()}
    </div>
  );
}
