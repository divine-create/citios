'use client';

import React, { useState, useMemo } from 'react';
import { X, Plus, Minus, Check, MessageSquare, Sparkles } from 'lucide-react';
import { FallbackImg } from '@/components/cityos/CityUI';
import { useMoney } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import { cn } from '@/lib/utils';

export interface ModifierOptionItem {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ModifierGroupItem {
  id: string;
  name: string;
  isRequired?: boolean;
  type: 'radio' | 'checkbox';
  options: ModifierOptionItem[];
}

export interface CustomizableItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category?: string;
  organizationId: string;
  orgName?: string;
  modifierGroups?: ModifierGroupItem[];
}

interface Props {
  item: CustomizableItem | null;
  isOpen: boolean;
  onClose: () => void;
  orgName?: string;
}

// Realistic default Nigerian restaurant customizations when no database modifiers are attached
const DEFAULT_FOOD_GROUPS: ModifierGroupItem[] = [
  {
    id: 'grp_protein',
    name: 'Choice of Protein / Style',
    isRequired: true,
    type: 'radio',
    options: [
      { id: 'opt_std', name: 'Regular Assorted Meat', priceDelta: 0 },
      { id: 'opt_beef', name: 'Tender Beef & Cowleg', priceDelta: 500 },
      { id: 'opt_goat', name: 'Goat Meat (Asun Cut)', priceDelta: 1000 },
      { id: 'opt_fish', name: 'Fresh Catfish Steak', priceDelta: 1500 },
    ],
  },
  {
    id: 'grp_extras',
    name: 'Add Delicious Extras',
    isRequired: false,
    type: 'checkbox',
    options: [
      { id: 'opt_dodo', name: 'Fried Sweet Plantain (Dodo)', priceDelta: 600 },
      { id: 'opt_egg', name: 'Boiled Farm Egg', priceDelta: 300 },
      { id: 'opt_extra_soup', name: 'Extra Soup Bowl', priceDelta: 1200 },
      { id: 'opt_water', name: 'Chilled Bottled Water (75cl)', priceDelta: 350 },
    ],
  },
];

export default function ItemCustomizerModal({ item, isOpen, onClose, orgName }: Props) {
  const { fmt } = useMoney();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [selectedRadio, setSelectedRadio] = useState<Record<string, string>>({
    grp_protein: 'opt_std',
  });
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Record<string, boolean>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Group definitions (from item or defaults for food)
  const groups = useMemo(() => {
    if (!item) return [];
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      return item.modifierGroups;
    }
    return DEFAULT_FOOD_GROUPS;
  }, [item]);

  // Total calculation
  const { unitPrice, totalPrice, summaryTags } = useMemo(() => {
    if (!item) return { unitPrice: 0, totalPrice: 0, summaryTags: [] };

    let extra = 0;
    const tags: string[] = [];

    for (const group of groups) {
      if (group.type === 'radio') {
        const selectedOptId = selectedRadio[group.id];
        const opt = group.options.find((o) => o.id === selectedOptId);
        if (opt) {
          extra += opt.priceDelta;
          if (opt.priceDelta > 0) tags.push(`${opt.name} (+${fmt(opt.priceDelta)})`);
        }
      } else {
        for (const opt of group.options) {
          if (selectedCheckboxes[opt.id]) {
            extra += opt.priceDelta;
            tags.push(`${opt.name} (+${fmt(opt.priceDelta)})`);
          }
        }
      }
    }

    const calculatedUnit = item.price + extra;
    return {
      unitPrice: calculatedUnit,
      totalPrice: calculatedUnit * qty,
      summaryTags: tags,
    };
  }, [item, groups, selectedRadio, selectedCheckboxes, qty, fmt]);

  if (!isOpen || !item) return null;

  const handleAdd = () => {
    setAddedAnimation(true);

    const fullNotes = [
      ...summaryTags,
      specialInstructions.trim() ? `Note: "${specialInstructions.trim()}"` : '',
    ].filter(Boolean).join(' | ');

    add({
      productId: item.id,
      name: fullNotes ? `${item.name} (${summaryTags[0] || 'Customized'})` : item.name,
      price: unitPrice,
      qty,
      orgId: item.organizationId,
      orgName: orgName || item.orgName || 'Local Restaurant',
      kind: 'food',
      image: item.imageUrl,
    });

    setTimeout(() => {
      setAddedAnimation(false);
      onClose();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Dialog */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden z-10 animate-in slide-in-from-bottom duration-300">
        
        {/* Banner Image */}
        <div className="relative h-48 w-full bg-slate-100 shrink-0">
          <FallbackImg
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            icon={<Sparkles className="w-10 h-10 text-orange-400" />}
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur text-slate-700 flex items-center justify-center hover:bg-white transition-all shadow-md active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          {item.category && (
            <span className="absolute bottom-3 left-4 text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur text-white px-2.5 py-1 rounded-lg">
              {item.category}
            </span>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-5">
          {/* Item Meta */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-black text-slate-900 leading-tight">{item.name}</h2>
              <span className="text-lg font-black text-orange-700 shrink-0">{fmt(item.price)}</span>
            </div>
            {item.description && (
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.description}</p>
            )}
          </div>

          {/* Modifier Groups */}
          {groups.map((group) => (
            <div key={group.id} className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{group.name}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {group.isRequired ? 'Choose 1 (Required)' : 'Optional'}
                  </p>
                </div>
                {group.isRequired && (
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                    Required
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {group.options.map((opt) => {
                  const isRadio = group.type === 'radio';
                  const isChecked = isRadio
                    ? selectedRadio[group.id] === opt.id
                    : !!selectedCheckboxes[opt.id];

                  return (
                    <label
                      key={opt.id}
                      onClick={() => {
                        if (isRadio) {
                          setSelectedRadio((prev) => ({ ...prev, [group.id]: opt.id }));
                        } else {
                          setSelectedCheckboxes((prev) => ({ ...prev, [opt.id]: !prev[opt.id] }));
                        }
                      }}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-all select-none',
                        isChecked
                          ? 'border-orange-500 bg-orange-50/50 text-slate-900 shadow-sm'
                          : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                            isChecked
                              ? 'border-orange-500 bg-orange-500 text-white'
                              : 'border-slate-300 bg-white'
                          )}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>{opt.name}</span>
                      </div>
                      <span className={cn('text-xs font-black', opt.priceDelta > 0 ? 'text-orange-700' : 'text-slate-400')}>
                        {opt.priceDelta > 0 ? `+${fmt(opt.priceDelta)}` : 'Free'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special Instructions */}
          <div className="pt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Special Instructions for the Kitchen</span>
            </div>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Please no pepper, put sauce separately, extra cutlery..."
              rows={2}
              className="w-full text-xs font-medium p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Footer with Quantity & Sticky Add CTA */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-4 shrink-0 shadow-lg">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1 shrink-0">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-700 disabled:opacity-40 shadow-sm active:scale-95 transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-xs font-black text-slate-900">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            className={cn(
              'flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black text-sm flex items-center justify-between shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all',
              addedAnimation && 'scale-95 bg-emerald-600 from-emerald-600 to-emerald-500 shadow-emerald-500/25'
            )}
          >
            <span>{addedAnimation ? 'Added!' : 'Add to Basket'}</span>
            <span className="text-white/90 text-xs font-bold">{fmt(totalPrice)}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
