'use client';

import React, { useState, useMemo } from 'react';
import { X, Plus, Minus, Check, MessageSquare } from 'lucide-react';
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
  minSelections?: number;
  maxSelections?: number | null;
  type: 'radio' | 'checkbox';
  options: ModifierOptionItem[];
}

export interface MenuItemAddonItem {
  id: string;
  name: string;
  price: number;
  isAvailable?: boolean;
}

export interface MenuItemVariantItem {
  id: string;
  name: string;
  price: number;
  isAvailable?: boolean;
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
  addons?: MenuItemAddonItem[];
  variants?: MenuItemVariantItem[];
}

interface Props {
  item: CustomizableItem | null;
  isOpen: boolean;
  onClose: () => void;
  orgName?: string;
}

export default function ItemCustomizerModal({ item, isOpen, onClose, orgName }: Props) {
  const { fmt } = useMoney();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedRadio, setSelectedRadio] = useState<Record<string, string>>({});
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Record<string, boolean>>({});
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Initialize selected radios on open or item change
  React.useEffect(() => {
    if (!item) return;
    setQty(1);
    setSpecialInstructions('');

    // Preselect variant if available
    if (item.variants && item.variants.length > 0) {
      setSelectedVariantId(item.variants[0].id);
    } else {
      setSelectedVariantId('');
    }

    // Preselect first radio option if required
    const initialRadios: Record<string, string> = {};
    for (const g of item.modifierGroups || []) {
      if (g.type === 'radio' && g.options.length > 0) {
        initialRadios[g.id] = g.options[0].id;
      }
    }
    setSelectedRadio(initialRadios);
    setSelectedCheckboxes({});
    setSelectedAddons({});
  }, [item]);

  // Total price calculation from real backend models
  const { basePrice, unitPrice, totalPrice, summaryTags } = useMemo(() => {
    if (!item) return { basePrice: 0, unitPrice: 0, totalPrice: 0, summaryTags: [] };

    let effectiveBase = item.price;
    const tags: string[] = [];

    // 1. Variant adjustment
    if (item.variants && item.variants.length > 0 && selectedVariantId) {
      const v = item.variants.find((v) => v.id === selectedVariantId);
      if (v) {
        effectiveBase = v.price;
        tags.push(`Size: ${v.name}`);
      }
    }

    let extra = 0;

    // 2. Modifier Groups
    for (const group of item.modifierGroups || []) {
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

    // 3. Addons
    for (const addon of item.addons || []) {
      if (selectedAddons[addon.id]) {
        extra += addon.price;
        tags.push(`${addon.name} (+${fmt(addon.price)})`);
      }
    }

    const unit = effectiveBase + extra;
    return {
      basePrice: effectiveBase,
      unitPrice: unit,
      totalPrice: unit * qty,
      summaryTags: tags,
    };
  }, [item, selectedVariantId, selectedRadio, selectedCheckboxes, selectedAddons, qty, fmt]);

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
    }, 200);
  };

  const hasModifiers = Boolean(
    (item.variants && item.variants.length > 0) ||
    (item.modifierGroups && item.modifierGroups.length > 0) ||
    (item.addons && item.addons.length > 0)
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Dialog */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden z-10 animate-in slide-in-from-bottom duration-250">
        
        {/* Banner Image */}
        <div className="relative h-44 sm:h-48 w-full bg-slate-100 shrink-0">
          <FallbackImg
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/95 text-slate-700 flex items-center justify-center hover:bg-white transition-all shadow-xs active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          {item.category && (
            <span className="absolute bottom-3 left-4 text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white px-2 py-0.5 rounded-md">
              {item.category}
            </span>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-4">
          {/* Item Meta */}
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-black text-slate-900 leading-tight">{item.name}</h2>
              <span className="text-base font-black text-slate-950 shrink-0">{fmt(basePrice)}</span>
            </div>
            {item.description && (
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.description}</p>
            )}
          </div>

          {/* 1. Real Variants (Size / Style) if configured */}
          {item.variants && item.variants.length > 0 && (
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Choose Size / Portion</h3>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                  Required
                </span>
              </div>
              <div className="space-y-1.5">
                {item.variants.map((v) => {
                  const isChecked = selectedVariantId === v.id;
                  return (
                    <label
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none',
                        isChecked
                          ? 'border-orange-500 bg-orange-50/40 text-slate-950'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
                            isChecked ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-300 bg-white'
                          )}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span>{v.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">{fmt(v.price)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Real Database Modifier Groups */}
          {item.modifierGroups && item.modifierGroups.length > 0 && item.modifierGroups.map((group) => (
            <div key={group.id} className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">{group.name}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {group.isRequired ? 'Select 1 option' : 'Optional extras'}
                  </p>
                </div>
                {group.isRequired && (
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                    Required
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
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
                        'flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none',
                        isChecked
                          ? 'border-orange-500 bg-orange-50/40 text-slate-950'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
                            isChecked ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-300 bg-white'
                          )}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span>{opt.name}</span>
                      </div>
                      <span className={cn('text-xs font-black', opt.priceDelta > 0 ? 'text-slate-900' : 'text-slate-400')}>
                        {opt.priceDelta > 0 ? `+${fmt(opt.priceDelta)}` : 'Free'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 3. Real Database Addons */}
          {item.addons && item.addons.length > 0 && (
            <div className="pt-4 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Add-ons & Sides</h3>
              <div className="space-y-1.5">
                {item.addons.map((a) => {
                  const isChecked = Boolean(selectedAddons[a.id]);
                  return (
                    <label
                      key={a.id}
                      onClick={() => setSelectedAddons((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none',
                        isChecked
                          ? 'border-orange-500 bg-orange-50/40 text-slate-950'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'w-4 h-4 rounded-md border flex items-center justify-center transition-colors',
                            isChecked ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-300 bg-white'
                          )}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span>{a.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">+{fmt(a.price)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="pt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Special Instructions for the Kitchen</span>
            </div>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Please no pepper, extra sauce, pack separately..."
              rows={2}
              className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 resize-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Footer with Quantity & Direct Add CTA */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0 shadow-lg">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-700 disabled:opacity-40 shadow-2xs active:scale-95 transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-7 text-center text-xs font-black text-slate-900">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-700 shadow-2xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            className={cn(
              'flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-bold text-sm flex items-center justify-between active:scale-[0.99] transition-all',
              addedAnimation && 'bg-emerald-600 hover:bg-emerald-600'
            )}
          >
            <span>{addedAnimation ? 'Added!' : 'Add to Basket'}</span>
            <span className="text-slate-200 text-xs font-black">{fmt(totalPrice)}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
