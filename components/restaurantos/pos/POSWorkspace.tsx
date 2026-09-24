'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { createPosOrder, openShift, closeShift } from '@/lib/actions/restaurantos';
import { useMoney } from '@/components/cityos/CityProvider';
import { ChevronLeft, Loader2, LayoutDashboard, Minus, Plus } from 'lucide-react';
import { PillTabs } from '@/components/restaurant/RestaurantUI';
import { Badge } from '@/components/ui';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import ThermalReceiptModal from '@/components/common/ThermalReceiptModal';
import { playCashRegisterChime } from '@/lib/audio';

export default function POSWorkspace({ initialMenu, initialTables, settings, activeShift: serverActiveShift, org, customers, slug }: any) {
  const { fmt } = useMoney();
  const [activeShift, setActiveShift] = useState(serverActiveShift);
  const [menu] = useState(initialMenu.filter((m: any) => m.isAvailable));
  const [tables] = useState(initialTables.filter((t: any) => t.status === 'AVAILABLE'));
  
  // Cart State
  const [posLines, setPosLines] = useState<any[]>([]);
  const [posType, setPosType] = useState<'TAKEOUT' | 'DINE_IN'>('TAKEOUT');
  const [posTableId, setPosTableId] = useState("");
  const [posPayment, setPosPayment] = useState<'CASH'|'POS'|'WALLET'|''>("");
  const [posBusy, setPosBusy] = useState(false);
  const [posMsg, setPosMsg] = useState("");
  const [receiptModalData, setReceiptModalData] = useState<any>(null);

  // Shift Gate State
  const [openingFloat, setOpeningFloat] = useState("0");
  const [actualCash, setActualCash] = useState("");
  const [closeMode, setCloseMode] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);

  const style = settings?.serviceStyle ?? "HYBRID";
  const showTables = style === "FULL_SERVICE" || style === "HYBRID";

  // Shift Handlers
  async function handleOpenShift() {
    setShiftBusy(true);
    const res: any = await openShift({ organizationId: org.id, locationId: org.locations?.[0]?.id || '', openingFloat: Number(openingFloat) });
    setShiftBusy(false);
    if (!res.error) setActiveShift(res.shift);
    else alert(res.error);
  }

  async function handleCloseShift() {
    setShiftBusy(true);
    const res: any = await closeShift({ shiftId: activeShift.id, actualCash: Number(actualCash) });
    setShiftBusy(false);
    if (!res.error) { setCloseMode(false); setActiveShift(null); }
    else alert(res.error);
  }

  // POS Handlers
  function posAdd(item: any) {
    setPosMsg("");
    setPosLines(prev => {
      const ex = prev.find(p => p.menuItemId === item.id);
      if (ex) return prev.map(p => p.menuItemId === item.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  }

  function posQty(id: string, qty: number) {
    if (qty <= 0) {
      setPosLines(prev => prev.filter(p => p.menuItemId !== id));
    } else {
      setPosLines(prev => prev.map(p => p.menuItemId === id ? { ...p, qty } : p));
    }
  }

  const posSubtotal = posLines.reduce((acc, l) => acc + l.price * l.qty, 0);
  const posTax = posSubtotal * (settings?.taxRate || 0);
  const posService = (posType === 'DINE_IN' ? (settings?.serviceChargeRate || 0) : 0) * posSubtotal;
  const posTotal = posSubtotal + posTax + posService;

  async function placeOrder() {
    if (posLines.length === 0) return;
    if (posType === 'DINE_IN' && !posTableId && showTables) return alert("Select a table for dine-in");
    if (!posPayment) return alert("Select payment method");

    setPosBusy(true);
    setPosMsg("");

    const res: any = await createPosOrder({
      organizationId: org.id,
      locationId: org.locations?.[0]?.id || '',
      type: posType,
      tableId: posTableId || undefined,
      paymentMethod: posPayment as any,
      items: posLines
    });

    if (res.error) {
      alert(res.error);
    } else {
      playCashRegisterChime();
      setPosMsg("Order placed!");
      setPosLines([]);
      setPosTableId("");
      setPosPayment("");
      if (res.orderId) {
        setReceiptModalData({
          orderId: res.orderId,
          orderNumber: String(res.orderNumber),
          storeName: org?.name,
          items: posLines.map((l: any) => ({ name: l.name, qty: l.qty, price: l.price })),
          totalAmount: res.totalAmount,
          paymentMethod: posPayment,
        });
      }
    }
    setPosBusy(false);
  }

  if (!activeShift) {
    return (
      <div className="flex-1 h-screen flex flex-col bg-slate-50">
        <div className="p-4 bg-white border-b border-slate-200">
           <Link href={`/workspaces/restaurantos/${slug}`} className="text-slate-500 font-bold flex items-center gap-2"><ChevronLeft size={16}/> Back to Dashboard</Link>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-sm w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center space-y-6">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
               <LayoutDashboard size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">No Active Shift</h3>
              <p className="text-sm text-slate-500 mt-2">Open a register shift to start taking orders.</p>
            </div>
            <div className="space-y-4 text-left">
              <Input label="Opening Float" type="number" step="0.01" value={openingFloat} onChange={(e: any) => setOpeningFloat(e.target.value)} />
              <Button onClick={handleOpenShift} isLoading={shiftBusy} className="w-full">Open Shift</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (closeMode) {
    return (
      <div className="flex-1 h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-sm w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <h3 className="text-xl font-black text-slate-800 text-center">Close Shift</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Opening Float:</span> <span className="font-bold">{fmt(activeShift.openingFloat)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Current Status:</span> <Badge variant="success">OPEN</Badge></div>
          </div>
          <div className="space-y-4 text-left">
            <Input label="Actual Cash Counted" type="number" step="0.01" value={actualCash} onChange={(e: any) => setActualCash(e.target.value)} />
            <div className="flex gap-2">
               <Button onClick={() => setCloseMode(false)} variant="secondary" className="flex-1">Cancel</Button>
               <Button onClick={handleCloseShift} isLoading={shiftBusy} variant="danger" className="flex-1">Confirm Close</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <div className="flex-1 flex flex-col h-full relative">
        <div className="flex justify-between items-center bg-white p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <Link href={`/workspaces/restaurantos/${slug}`} className="text-slate-400 hover:text-slate-900 transition-colors">
              <ChevronLeft />
            </Link>
            <h2 className="font-bold text-slate-800">POS Terminal</h2>
            <Badge variant="success">SHIFT OPEN</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCloseMode(true)}>Close Shift</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 lg:pb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {menu.map((m: any) => (
              <button key={m.id} onClick={() => posAdd(m)} className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-orange-500 hover:ring-2 hover:ring-orange-500/20 transition-all active:scale-95 flex flex-col justify-between h-32">
                <div className="flex justify-between gap-2 w-full">
                  <span className="font-bold text-slate-900 text-sm leading-tight flex-1">{m.name}</span>
                  {m.imageAssetId && (
                    <img src={`/api/assets/${m.imageAssetId}`} alt={m.name} className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-sm ring-1 ring-black/5" />
                  )}
                </div>
                <p className="text-sm font-bold text-orange-600 mt-2">{fmt(m.price)}</p>
              </button>
            ))}
            {menu.length === 0 && <p className="col-span-full text-slate-500">No menu items available.</p>}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 absolute lg:relative inset-y-0 right-0 transform translate-x-full lg:translate-x-0 transition-transform shadow-2xl lg:shadow-none z-10" id="cart-drawer">
        <div className="p-4 border-b border-slate-100">
           <PillTabs tabs={[{value:'TAKEOUT', label:'Takeout'}, {value:'DINE_IN', label:'Dine-in'}]} active={posType} onChange={(v:any) => setPosType(v)} className="w-full justify-center flex" />
           {posType === 'DINE_IN' && showTables && (
             <select value={posTableId} onChange={e => setPosTableId(e.target.value)} className="w-full mt-3 p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50">
               <option value="">Select table...</option>
               {tables.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
             </select>
           )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {posLines.map(l => (
            <div key={l.menuItemId} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
              <span className="flex-1 text-sm font-bold truncate">{l.name}</span>
              <button onClick={() => posQty(l.menuItemId, l.qty - 1)} className="p-1 bg-white rounded shadow-sm text-slate-500"><Minus size={14}/></button>
              <span className="text-sm font-bold w-6 text-center">{l.qty}</span>
              <button onClick={() => posQty(l.menuItemId, l.qty + 1)} className="p-1 bg-white rounded shadow-sm text-slate-500"><Plus size={14}/></button>
              <span className="text-sm font-bold text-orange-600 w-16 text-right">{fmt(l.price * l.qty)}</span>
            </div>
          ))}
          {posLines.length === 0 && <div className="text-center text-slate-400 py-10">Order is empty</div>}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
           <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{fmt(posSubtotal)}</span></div>
           {posTax > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Tax</span><span>{fmt(posTax)}</span></div>}
           {posService > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Service</span><span>{fmt(posService)}</span></div>}
           <div className="flex justify-between font-bold text-lg text-slate-900 border-t border-slate-200 pt-2"><span>Total</span><span className="text-orange-600">{fmt(posTotal)}</span></div>
           <div className="flex gap-2 pt-2">
             {["CASH","POS","WALLET"].map(p => (
               <button key={p} onClick={() => setPosPayment(posPayment === p ? "" : p as any)} className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-colors border", posPayment === p ? "bg-orange-600 text-white border-orange-600" : "bg-white text-slate-600 border-slate-200")}>{p}</button>
             ))}
           </div>
           <Button onClick={placeOrder} disabled={posLines.length === 0 || posBusy} isLoading={posBusy} className="w-full mt-2 h-12 text-base">
             Place Order
           </Button>
           {posMsg && <p className="text-xs text-center text-emerald-600 font-bold">{posMsg}</p>}
        </div>
      </div>
      
      {/* Mobile cart toggle button would go here in a full responsive pass */}

      {receiptModalData && <ThermalReceiptModal initialData={receiptModalData} onClose={() => setReceiptModalData(null)} />}
    </div>
  );
}
