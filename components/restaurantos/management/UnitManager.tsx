'use client';

import React, { useState } from 'react';
import { Button, Input, Badge } from '@/components/ui';
import { Scale, Plus, Edit2, Trash2, Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  createUnitOfMeasure,
  updateUnitOfMeasure,
  deleteUnitOfMeasure,
} from '@/lib/actions/restaurantos';
import { DEFAULT_RESTAURANT_UNITS } from '@/lib/restaurant-units';

interface UnitUsageItem {
  unit: string;
  count: number;
  isCustom: boolean;
}

interface UnitManagerProps {
  slug: string;
  initialUnits?: string[];
  initialUsage?: UnitUsageItem[];
}

export default function UnitManager({
  slug,
  initialUnits = [],
  initialUsage = [],
}: UnitManagerProps) {
  const router = useRouter();
  const [units, setUnits] = useState<string[]>(initialUnits.length > 0 ? initialUnits : [...DEFAULT_RESTAURANT_UNITS]);
  const [usage, setUsage] = useState<UnitUsageItem[]>(initialUsage);
  const [newUnit, setNewUnit] = useState('');
  const [loading, setLoading] = useState(false);

  // Rename state
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingLoading, setRenamingLoading] = useState(false);

  // Search filter
  const [search, setSearch] = useState('');

  const quickPresets = ['portion', 'slice', 'pan', 'tray', 'bunch', 'cup', 'tbsp', 'tsp', 'pinch', 'can'];

  const getUsageCount = (unitName: string) => {
    const item = usage.find((u) => u.unit.toLowerCase() === unitName.toLowerCase());
    return item ? item.count : 0;
  };

  const handleCreateUnit = async (unitToAdd?: string) => {
    const target = (unitToAdd || newUnit).trim();
    if (!target) {
      toast.error('Please enter a unit name (e.g. portion, kg, slice).');
      return;
    }

    setLoading(true);
    try {
      const res = await createUnitOfMeasure(slug, target);
      if (res && res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Unit of measure "${target}" added successfully!`);
        if (res.units) setUnits(res.units);
        setNewUnit('');
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create unit of measure');
    } finally {
      setLoading(false);
    }
  };

  const startRename = (unit: string) => {
    setEditingUnit(unit);
    setRenameValue(unit);
  };

  const handleSaveRename = async (oldUnit: string) => {
    const next = renameValue.trim();
    if (!next) {
      toast.error('Unit name cannot be empty.');
      return;
    }
    if (next.toLowerCase() === oldUnit.toLowerCase()) {
      setEditingUnit(null);
      return;
    }

    setRenamingLoading(true);
    try {
      const res = await updateUnitOfMeasure(slug, oldUnit, next);
      if (res && res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          `Renamed "${oldUnit}" to "${next}"! ${
            res.updatedItemsCount ? `Updated ${res.updatedItemsCount} inventory item(s).` : ''
          }`
        );
        if (res.units) setUnits(res.units);
        setEditingUnit(null);
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to rename unit of measure');
    } finally {
      setRenamingLoading(false);
    }
  };

  const handleDelete = async (unit: string) => {
    const count = getUsageCount(unit);
    if (count > 0) {
      toast.error(`Cannot delete unit "${unit}": it is currently assigned to ${count} inventory item(s).`);
      return;
    }

    if (!confirm(`Are you sure you want to delete unit "${unit}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await deleteUnitOfMeasure(slug, unit);
      if (res && res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Unit "${unit}" deleted successfully.`);
        if (res.units) setUnits(res.units);
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete unit of measure');
    } finally {
      setLoading(false);
    }
  };

  const filteredUnits = units.filter((u) => u.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header and Quick Add */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <Scale size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Units of Measurement (UOM)</h3>
              <p className="text-sm text-slate-500">
                Manage the measurement units used across your raw materials, recipes, and inventory batches.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="teal">{units.length} Total Units</Badge>
          </div>
        </div>

        {/* Add Unit Form */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="New Unit name (e.g. portion, slice, ml, bottle, tray)..."
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateUnit();
                  }
                }}
              />
            </div>
            <Button
              onClick={() => handleCreateUnit()}
              isLoading={loading}
              leftIcon={<Plus size={16} />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold whitespace-nowrap"
            >
              Add Unit
            </Button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Presets:</span>
            {quickPresets.map((preset) => {
              const alreadyExists = units.some((u) => u.toLowerCase() === preset.toLowerCase());
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={alreadyExists}
                  onClick={() => handleCreateUnit(preset)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all ${
                    alreadyExists
                      ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-500 hover:text-emerald-700'
                  }`}
                >
                  +{preset}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search & List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Filter units..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <span className="text-xs font-medium text-slate-500">
            Showing {filteredUnits.length} of {units.length} units
          </span>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Unit Name / Symbol</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Active Item Usage</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUnits.map((u) => {
              const count = getUsageCount(u);
              const isDefault = DEFAULT_RESTAURANT_UNITS.map((d) => d.toLowerCase()).includes(u.toLowerCase());
              const isEditing = editingUnit === u;

              return (
                <tr key={u} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <div className="flex items-center gap-2 max-w-xs">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-9 px-3 bg-white border border-emerald-500 rounded-lg text-sm font-bold text-slate-900 focus:outline-none w-36"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(u);
                            if (e.key === 'Escape') setEditingUnit(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveRename(u)}
                          disabled={renamingLoading}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          title="Save Rename"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingUnit(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{u}</span>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {isDefault ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                        Standard
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Custom
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {count > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Used in {count} item{count === 1 ? '' : 's'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Unused</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-1">
                      <button
                        onClick={() => startRename(u)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Rename Unit"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(u)}
                        disabled={count > 0}
                        className={`p-2 rounded-lg transition-colors ${
                          count > 0
                            ? 'text-slate-200 cursor-not-allowed'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title={count > 0 ? `Cannot delete: used in ${count} items` : 'Delete Unit'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
