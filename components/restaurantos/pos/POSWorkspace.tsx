'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { createPosOrder, openShift, closeShift } from '@/lib/actions/restaurantos';
import { useMoney } from '@/components/cityos/CityProvider';
import { ChevronLeft, LayoutDashboard, Minus, Plus, Search, MessageSquare, Trash2, Store } from 'lucide-react';
import { PillTabs } from '@/components/restaurant/RestaurantUI';
import { Badge, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import ThermalReceiptModal from '@/components/common/ThermalReceiptModal';
import { playCashRegisterChime } from '@/lib/audio';
import { POSTenderModal, POSItemNotesModal } from './ui';

interface POSWorkspaceProps {
  initialMenu: any[];
  initialTables: any[];
  settings: any;
  activeShift: any;
  org: any;
  customers: any[];
  slug: string;
}


function ModifierSelectionModal({ item, onCancel, onAdd }: { item: any; onCancel: () => void; onAdd: (item: any, qty: number, variant: any, modifiers: any[], notes: string) => void }) {
  const [qty, setQty] = React.useState(1);
  const [selectedVariant, setSelectedVariant] = React.useState<any>(item.variants?.[0] || null);
  const [selectedModifiers, setSelectedModifiers] = React.useState<Set<string>>(new Set());
  const [notes, setNotes] = React.useState('');

  const toggleModifier = (mod: any, group: any) => {
    const next = new Set(selectedModifiers);
    if (next.has(mod.id)) {
      next.delete(mod.id);
    } else {
      if (group.maxSelections === 1) {
        group.options.forEach((o: any) => next.delete(o.id));
      }
      next.add(mod.id);
    }
    setSelectedModifiers(next);
  };

  const handleAdd = () => {
    const mods = [];
    if (item.modifierGroups) {
      for (const g of item.modifierGroups) {
        for (const o of g.options) {
          if (selectedModifiers.has(o.id)) mods.push(o);
        }
      }
    }
    onAdd(item, qty, selectedVariant, mods, notes);
  };

  let total = selectedVariant ? selectedVariant.price : item.price;
  if (item.modifierGroups) {
    for (const g of item.modifierGroups) {
      for (const o of g.options) {
        if (selectedModifiers.has(o.id)) total += o.priceDelta;
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-black text-slate-900">{item.name}</h2>
          <button onClick={onCancel} className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold">X</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {item.variants && item.variants.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-black text-slate-800 uppercase tracking-wide text-sm">Size / Variant</h3>
              <div className="grid grid-cols-2 gap-3">
                {item.variants.map((v: any) => (
                  <button 
                    key={v.id} 
                    onClick={() => setSelectedVariant(v)}
                    className={`p-4 rounded-xl border-2 font-bold flex justify-between items-center transition-all ${selectedVariant?.id === v.id ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
                  >
                    <span>{v.name}</span>
                    <span>+{v.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {item.modifierGroups && item.modifierGroups.map((g: any) => (
            <div key={g.id} className="space-y-3">
              <div className="flex justify-between items-baseline">
                <h3 className="font-black text-slate-800 uppercase tracking-wide text-sm">{g.name}</h3>
                {g.isRequired && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded uppercase">Required</span>}
              </div>
              <div className="space-y-2">
                {g.options.map((o: any) => {
                  const isSelected = selectedModifiers.has(o.id);
                  return (
                    <button 
                      key={o.id}
                      onClick={() => toggleModifier(o, g)}
                      className={`w-full p-4 rounded-xl border-2 font-bold flex justify-between items-center transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
                    >
                      <span>{o.name}</span>
                      {o.priceDelta > 0 && <span className="text-emerald-700">+{o.priceDelta}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="space-y-3">
            <h3 className="font-black text-slate-800 uppercase tracking-wide text-sm">Special Instructions</h3>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Allergy to peanuts, extra napkins..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:outline-none focus:border-slate-400 h-24"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-12 h-12 bg-white rounded-xl font-black text-xl shadow-sm">-</button>
            <span className="font-black text-xl w-6 text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-12 h-12 bg-white rounded-xl font-black text-xl shadow-sm">+</button>
          </div>
          <button onClick={handleAdd} className="flex-1 bg-slate-900 text-white font-black text-lg h-16 rounded-2xl shadow-xl hover:bg-black transition-colors flex justify-between items-center px-6">
            <span>Add to Order</span>
            <span>{total * qty}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POSWorkspace({ initialMenu, initialTables, settings, activeShift: serverActiveShift, org, customers, slug }: POSWorkspaceProps) {
  const { fmt } = useMoney();
  const [activeShift, setActiveShift] = useState(serverActiveShift);
  const [menu] = useState(initialMenu);
  const [tables] = useState(initialTables.filter((t: any) => t.status === 'available' || t.status === 'AVAILABLE'));
  
  // Navigation & Search State
  const categories = useMemo(() => {
    const cats = Array.from(new Set(menu.map(m => m.category))).filter(Boolean);
    return ['All', ...cats];
  }, [menu]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State
  const [posLines, setPosLines] = useState<any[]>([]);
  const [posType, setPosType] = useState<'TAKEOUT' | 'DINE_IN'>(settings?.serviceStyle === 'FULL_SERVICE' ? 'DINE_IN' : 'TAKEOUT');
  const [posTableId, setPosTableId] = useState("");
  const [posBusy, setPosBusy] = useState(false);
  const [posMsg, setPosMsg] = useState("");
  
  // Modals
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<any>(null);
  const [editingNotesForId, setEditingNotesForId] = useState<string | null>(null);
  const [modifierSelectionItem, setModifierSelectionItem] = useState<any>(null);

  // Shift Gate State
  const [openingFloat, setOpeningFloat] = useState("0");
  const [closeMode, setCloseMode] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const [shiftBusy, setShiftBusy] = useState(false);

  // Computed Cart
  const posSubtotal = posLines.reduce((s, l) => s + (l.price * l.qty), 0);
  const posTax = posSubtotal * ((settings?.taxRate || 0) / 100);
  const posService = posSubtotal * ((settings?.serviceCharge || 0) / 100);
  const posTotal = posSubtotal + posTax + posService;

  // Filtered Menu
  const displayedMenu = useMemo(() => {
    return menu.filter(m => {
      if (activeCategory !== 'All' && m.category !== activeCategory) return false;
      if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [menu, activeCategory, searchQuery]);

  // Actions
    const handleModifierSelection = (item: any, qty: number, selectedVariant: any, mods: any[], notes: string) => {
    setPosLines(prev => {
      const cartItemId = item.id + '-' + (selectedVariant?.id || 'base') + '-' + mods.map(m => m.id).join('-');
      const ex = prev.find(p => p.cartItemId === cartItemId);
      if (ex) return prev.map(p => p.cartItemId === cartItemId ? { ... p, qty: p.qty + qty } : p);
      const price = (selectedVariant?.price || item.price) + mods.reduce((sum, m) => sum + m.priceDelta, 0);
      return [...prev, { 
        cartItemId, menuItemId: item.id, name: item.name, variantId: selectedVariant?.id, variantName: selectedVariant?.name, price, qty, notes, modifiers: mods.map(m => ({ optionId: m.id, name: m.name, priceDelta: m.priceDelta }))
      }];
    });
    setModifierSelectionItem(null);
  };

  const posAdd = (item: any) => {
    if (!item.isAvailable) return;
    setPosLines(prev => {
      const ex = prev.find(p => p.menuItemId === item.id);
      if (ex) return prev.map(p => p.menuItemId === item.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, qty: 1, notes: "" }];
    });
  };

  const posQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setPosLines(prev => prev.filter(p => p.menuItemId !== id));
      return;
    }
    setPosLines(prev => prev.map(p => p.menuItemId === id ? { ...p, qty } : p));
  };

  const posRemove = (id: string) => {
    setPosLines(prev => prev.filter(p => p.menuItemId !== id));
  };

  const updateNotes = (id: string, notes: string) => {
    setPosLines(prev => prev.map(p => p.menuItemId === id ? { ...p, notes } : p));
    setEditingNotesForId(null);
  };

  const handleOpenShift = async () => {
    if (!org) return;
    setShiftBusy(true);
    const res: any = await openShift({ organizationId: org.id, ...(org.locations?.[0]?.id ? { locationId: org.locations[0].id } : {}), openingFloat: parseFloat(openingFloat) || 0 });
    if (res.error) alert(res.error);
    else setActiveShift(res.shift);
    setShiftBusy(false);
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    setShiftBusy(true);
    const res: any = await closeShift({ shiftId: activeShift.id, actualCash: parseFloat(actualCash) || 0 });
    if (res.error) {
      alert(res.error);
    } else {
      setActiveShift(null);
      setCloseMode(false);
    }
    setShiftBusy(false);
  };

  const placeOrder = async (method: 'CASH' | 'POS' | 'WALLET', amountTendered?: number) => {
    if (posLines.length === 0 || !org) return;
    setPosBusy(true);
    const res: any = await createPosOrder({
      organizationId: org.id,
      ...(org.locations?.[0]?.id ? { locationId: org.locations[0].id } : {}),
      ...((posType === 'DINE_IN' && posTableId) ? { tableId: posTableId } : {}),
      type: posType,
      paymentMethod: method,
      items: posLines.map(l => ({ menuItemId: l.menuItemId, quantity: l.qty, notes: l.notes }))
    });

    if (res.error) {
      alert(res.error);
      setCheckoutMode(false);
    } else {
      playCashRegisterChime();
      setPosMsg("Order placed!");
      setPosLines([]);
      setPosTableId("");
      setCheckoutMode(false);
      
      if (res.orderId) {
        setReceiptModalData({
          orderId: res.orderId,
          orderNumber: String(res.orderNumber),
          storeName: org?.name,
          items: posLines.map((l: any) => ({ name: l.name, quantity: l.qty, unitPrice: l.price, subtotal: l.qty * l.price })),
            subtotal: posSubtotal,
          totalAmount: res.totalAmount,
          paymentMethod: method,
        });
      }
    }
    setPosBusy(false);
  };

  if (!activeShift) {
    return (
      <div className="fixed inset-0 flex flex-col bg-slate-50 z-50">
        <div className="p-4 bg-white border-b border-slate-200">
           <Link href={`/workspaces/restaurantos/${slug}`} className="text-slate-500 font-bold flex items-center gap-2 w-fit hover:text-slate-900 transition-colors">
             <ChevronLeft size={20}/> Exit POS
           </Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 text-center space-y-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-600 mx-auto">
               <Store size={36} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">No Active Shift</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">You must open a register shift before you can process orders or accept payments.</p>
            </div>
            <div className="space-y-4 text-left">
              <Input label="Opening Float (Cash in drawer)" type="number" step="0.01" value={openingFloat} onChange={(e: any) => setOpeningFloat(e.target.value)} className="h-14 text-lg font-bold" />
              <Button onClick={handleOpenShift} isLoading={shiftBusy} className="w-full h-14 text-lg bg-orange-600 hover:bg-orange-700">Open Register</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (closeMode) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm z-50 p-4">
        <div className="max-w-sm w-full bg-white p-8 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <h3 className="text-2xl font-black text-slate-800 text-center mb-8">Close Shift</h3>
          <div className="space-y-3 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
            <div className="flex justify-between items-center"><span className="text-slate-500 font-bold">Opening Float</span> <span className="font-black text-base">{fmt(activeShift.openingFloat)}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500 font-bold">Current Status</span> <Badge variant="success">OPEN</Badge></div>
          </div>
          <div className="space-y-6 text-left">
            <Input label="Actual Cash Counted" type="number" step="0.01" value={actualCash} onChange={(e: any) => setActualCash(e.target.value)} className="h-14 text-lg font-bold" autoFocus />
            <div className="flex gap-3">
               <Button onClick={() => setCloseMode(false)} variant="secondary" className="flex-1 h-14">Cancel</Button>
               <Button onClick={handleCloseShift} isLoading={shiftBusy} variant="danger" className="flex-1 h-14">Confirm Close</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex bg-slate-50 overflow-hidden font-sans select-none z-50">
      {/* LEFT PANEL - MENU & NAV */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Navigation Bar */}
        <div className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-6">
            <Link href={`/workspaces/restaurantos/${slug}`} className="w-12 h-12 bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-2xl flex items-center justify-center transition-colors">
              <ChevronLeft strokeWidth={2.5} />
            </Link>
            <div>
              <h2 className="text-lg font-black text-slate-800 leading-tight">POS Terminal</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="success" className="h-5">SHIFT OPEN</Badge>
                <span className="text-xs font-bold text-slate-400">{org?.name}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Search menu..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-slate-100 border-none rounded-2xl text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-100" onClick={() => setCloseMode(true)}>
            Close Shift
          </Button>
        </div>

        {/* Categories Bar */}
        {!searchQuery && (
          <div className="bg-white border-b border-slate-100 shrink-0 px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all duration-200",
                  activeCategory === c 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {displayedMenu.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {displayedMenu.map((m: any) => (
                <button 
                  key={m.id} 
                  onClick={() => posAdd(m)} 
                  disabled={!m.isAvailable}
                  className={cn(
                    "bg-white rounded-2xl p-4 text-left transition-all flex flex-col h-40 relative group",
                    m.isAvailable 
                      ? "border border-slate-200 hover:border-orange-500 hover:ring-4 hover:ring-orange-500/10 active:scale-95 shadow-sm hover:shadow-md cursor-pointer" 
                      : "border border-slate-100 opacity-60 cursor-not-allowed bg-slate-50 grayscale"
                  )}
                >
                  <div className="flex justify-between gap-3 w-full items-start">
                    <span className="font-bold text-slate-800 text-sm leading-snug line-clamp-3">{m.name}</span>
                    {m.imageAssetId && (
                      <img src={`/api/assets/${m.imageAssetId}`} alt={m.name} className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm ring-1 ring-black/5 bg-slate-100" />
                    )}
                  </div>
                  <div className="mt-auto pt-4 flex items-end justify-between">
                    <span className="text-base font-black text-orange-600">{fmt(m.price)}</span>
                    {!m.isAvailable && <span className="text-[10px] font-black uppercase text-red-500 bg-red-50 px-2 py-1 rounded-md">86'd</span>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="font-bold text-lg">No menu items found</p>
              <p className="text-sm">Try adjusting your category or search.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - CART */}
      <div className={cn('bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-2xl z-40 transition-transform duration-300', 'fixed inset-0 lg:static lg:w-[420px] lg:flex lg:translate-x-0', mobileCartOpen ? 'translate-x-0' : 'translate-x-full')}>
        
        {/* Cart Header / Order Context */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
           <div className="flex justify-between items-center lg:hidden mb-4">
             <h3 className="font-black text-lg text-slate-900">Current Order</h3>
             <button onClick={() => setMobileCartOpen(false)} className="p-2 bg-slate-200 text-slate-600 rounded-xl font-bold">Close</button>
           </div>
           <PillTabs 
             tabs={[{value:'TAKEOUT', label:'Takeout'}, {value:'DINE_IN', label:'Dine-in'}]} 
             active={posType} 
             onChange={(v:any) => setPosType(v)} 
             className="w-full flex *:flex-1 mb-4" 
           />
           {posType === 'DINE_IN' && (
             <div className="relative">
               <select value={posTableId} onChange={e => setPosTableId(e.target.value)} className="w-full h-12 pl-4 pr-10 border border-slate-200 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 appearance-none cursor-pointer">
                 <option value="" disabled>Select a table...</option>
                 {tables.map((t:any) => <option key={t.id} value={t.id}>{t.name} (Seats {t.seats})</option>)}
               </select>
               <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
             </div>
           )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30">
          {posLines.map(l => (
            <div key={l.menuItemId} className="bg-white border border-slate-200 p-3 rounded-2xl flex flex-col gap-3 group relative shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="flex-1 text-sm font-black text-slate-800 leading-tight">{l.name}</span>
                <span className="text-sm font-bold text-slate-900">{fmt(l.price * l.qty)}</span>
              </div>
              
              {l.notes && (
                <div className="bg-orange-50 text-orange-800 px-3 py-2 rounded-xl text-xs font-bold w-full">
                  Note: {l.notes}
                </div>
              )}

              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingNotesForId(l.menuItemId)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
                    <MessageSquare size={12} /> {l.notes ? 'Edit Note' : 'Add Note'}
                  </button>
                  <button onClick={() => posRemove(l.menuItemId)} className="px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center bg-slate-100 rounded-xl p-1">
                  <button onClick={() => posQty(l.menuItemId, l.qty - 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 active:scale-95 transition-transform"><Minus size={16}/></button>
                  <span className="w-10 text-center text-sm font-black text-slate-800">{l.qty}</span>
                  <button onClick={() => posQty(l.menuItemId, l.qty + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 active:scale-95 transition-transform"><Plus size={16}/></button>
                </div>
              </div>
            </div>
          ))}
          {posLines.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 py-20">
              <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center mb-4">
                <Store size={24} />
              </div>
              <span className="font-bold">Cart is empty</span>
            </div>
          )}
        </div>

        {/* Cart Totals & Pay */}
        <div className="p-5 border-t border-slate-200 bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] shrink-0">
           <div className="space-y-2 mb-6 px-1">
             <div className="flex justify-between text-sm font-bold text-slate-500"><span>Subtotal</span><span>{fmt(posSubtotal)}</span></div>
             {posTax > 0 && <div className="flex justify-between text-sm font-bold text-slate-500"><span>Tax</span><span>{fmt(posTax)}</span></div>}
             {posService > 0 && <div className="flex justify-between text-sm font-bold text-slate-500"><span>Service Charge</span><span>{fmt(posService)}</span></div>}
             <div className="flex justify-between font-black text-2xl text-slate-900 pt-3 mt-3 border-t border-dashed border-slate-200">
               <span>Total</span>
               <span className="text-orange-600">{fmt(posTotal)}</span>
             </div>
           </div>
           
           <Button 
             onClick={() => setCheckoutMode(true)} 
             disabled={posLines.length === 0 || posBusy || (posType === 'DINE_IN' && !posTableId)} 
             className="w-full h-16 text-lg font-black bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-900/20 active:scale-[0.98]"
           >
             {posType === 'DINE_IN' && !posTableId ? 'Select Table to Pay' : 'Pay Now'}
           </Button>
           {posMsg && <p className="text-xs text-center text-emerald-600 font-bold mt-3 bg-emerald-50 py-2 rounded-lg">{posMsg}</p>}
        </div>
      </div>

      {/* Modals */}
      {modifierSelectionItem && (
        <ModifierSelectionModal 
          item={modifierSelectionItem}
          onCancel={() => setModifierSelectionItem(null)}
          onAdd={handleModifierSelection}
        />
      )}
      {checkoutMode && (
        <POSTenderModal 
          totalAmount={posTotal} 
          onCancel={() => setCheckoutMode(false)}
          onConfirm={placeOrder}
          isProcessing={posBusy}
        />
      )}

      {editingNotesForId && (
        <POSItemNotesModal 
          itemName={posLines.find(l => l.menuItemId === editingNotesForId)?.name || 'Item'}
          initialNotes={posLines.find(l => l.menuItemId === editingNotesForId)?.notes || ''}
          onCancel={() => setEditingNotesForId(null)}
          onSave={(n) => updateNotes(editingNotesForId, n)}
        />
      )}

      {receiptModalData && (
        <ThermalReceiptModal 
          initialData={receiptModalData} 
          onClose={() => setReceiptModalData(null)} 
        />
      )}
    </div>
  );
}
