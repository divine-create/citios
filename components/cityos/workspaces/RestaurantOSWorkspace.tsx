"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  UtensilsCrossed, LayoutDashboard, BarChart3, ShoppingCart, Receipt, Flame,
  Package, Truck, ClipboardList, Trash2, Grid3x3, CalendarDays, DollarSign,
  SettingsIcon, Menu, Bell, Search, X, Plus, Minus, ArrowRightLeft, Loader2, Printer, CheckCircle2, Circle, TrendingUp, Upload, UploadCloud, ImageIcon
} from "lucide-react";
import ThermalReceiptModal from "@/components/common/ThermalReceiptModal";
import { playOrderChime, playCashRegisterChime } from "@/lib/audio";
import AudioAlertToggle from "@/components/common/AudioAlertToggle";
import { useAccountSwitcher } from "@/components/cityos/AccountSwitcherContext";
import { useMoney } from "@/components/cityos/CityProvider";
import { getCanonicalOrganization } from "@/app/actions/org";
import {
  getRestaurantOSData, getRestaurantOSSettings, updateRestaurantOSSettings,
  getMenuItems, createMenuItem, updateMenuItem, toggleMenuItemAvailability, deleteMenuItem,
  createMenuItemAddon, createMenuItemVariant,
  getTables, createTable, updateTableStatus,
  getReservations, createReservation, updateReservationStatus,
  getKitchenTickets, getOrders, createPosOrder, updateOrderStatus,
  getInventoryItems, createInventoryItem, adjustStock, deleteInventoryItem, updateInventoryItem,
  getStockMovements,
  getFinancialSummary, addExpense, getExpenses,
  
} from "@/lib/actions/restaurantos";
import { uploadAsset } from "@/lib/actions/microsite";
import { getSuppliers, createSupplier, deleteSupplier, getPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus } from "@/lib/actions/procurement";

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(",");
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
import { cn } from "@/lib/utils";
import {
  inputCls, selectCls, btnPrimary, btnOutline, btnDanger, btnDark,
  Card, StatCard, PageHeader, PillTabs, StatusPill, Avatar, ProgressBar,
  Modal, SectionCard, EmptyState, Kbd
} from "@/components/restaurant/RestaurantUI";
import { type PrintableReceiptData } from "@/lib/receiptUtils";

export default function RestaurantOSWorkspace({ slug }: { slug: string }) {
  const { fmt } = useMoney();
  const { switchToPersonal } = useAccountSwitcher();
  const [org, setOrg] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Data state
  const [settings, setSettings] = useState<any | null>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [tickets, setKitchenTickets] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [finance, setFinance] = useState<any | null>(null);

  const style = settings?.serviceStyle ?? "HYBRID";
  const showTables = style === "FULL_SERVICE" || style === "HYBRID";
  const showKitchen = style !== "COUNTER";

  // Sidebar Logic
  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const NAV_GROUPS = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", icon: LayoutDashboard },
        { label: "Reports", icon: BarChart3 },
      ],
    },
    {
      label: "Service",
      items: [
        { label: "POS Terminal", icon: ShoppingCart },
        { label: "Orders", icon: Receipt },
        { label: "Kitchen Board", icon: Flame, hidden: !showKitchen },
      ],
    },
    {
      label: "Menu",
      items: [
        { label: "Menu Items", icon: UtensilsCrossed },
      ],
    },
    {
      label: "Inventory",
      items: [
        { label: "Stock & Ingredients", icon: Package },
        { label: "Suppliers", icon: Truck },
        { label: "Purchase Orders", icon: ClipboardList },
        { label: "Waste Log", icon: Trash2 },
      ],
    },
    {
      label: "Floor",
      hidden: !showTables,
      items: [
        { label: "Tables", icon: Grid3x3 },
        { label: "Reservations", icon: CalendarDays },
      ],
    },
    {
      label: "Finance",
      items: [
        { label: "Finance", icon: DollarSign },
      ],
    },
    {
      label: "Settings",
      items: [
        { label: "Settings", icon: SettingsIcon },
      ],
    },
  ].filter(g => !g.hidden);

  const loadData = async () => {
    const [d, f] = await Promise.all([
      getRestaurantOSData(slug),
      getFinancialSummary(slug),
    ]);
    if (d) {
      setSettings(d.settings ?? null);
      setMenu(d.menu ?? []);
      setTables(d.tables ?? []);
      setReservations(d.reservations ?? []);
      setKitchenTickets(d.tickets ?? []);
      setOrders(d.orders ?? []);
      setInventory(d.inventory ?? []);
      setExpenses(d.expenses ?? []);
    }
    setFinance(f);
  };

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const found = await getCanonicalOrganization(slug);
        if (!live) return;
        if (!found) { setNotFound(true); setLoaded(true); return; }
        setOrg(found);
        await loadData();
      } catch (err: any) {
        if (live) setDenied(err?.message || "Access denied");
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => { live = false; };
  }, [slug]);

  const previousTicketCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!loaded || !org) return;
    const interval = setInterval(async () => {
      try {
        const d = await getRestaurantOSData(slug);
        if (d?.tickets) {
          const pending = d.tickets.filter((t: any) => t.status === "PENDING").length;
          if (previousTicketCountRef.current !== null && pending > previousTicketCountRef.current) {
            playOrderChime();
          }
          previousTicketCountRef.current = pending;
          setKitchenTickets(d.tickets);
        }
      } catch {}
    }, 12000);
    if (window.matchMedia("(max-width: 767px)").matches) setIsSidebarOpen(false);
    return () => clearInterval(interval);
  }, [loaded, org, slug]);


  if (!loaded) return <div className="p-10 text-center flex items-center justify-center gap-2 text-slate-500"><Loader2 className="animate-spin" size={20} /> Loading workspace...</div>;
  if (notFound || !org) return <div className="p-20 text-center"><h1 className="text-xl font-bold text-slate-900">Workspace not found</h1><Link href="/business" className={btnPrimary + " mt-4"}>Back to business</Link></div>;
  if (denied) return <div className="p-20 text-center"><h1 className="text-xl font-bold text-slate-900">Access Denied</h1><p className="text-slate-500 mt-2">{denied}</p><Link href="/business" className={btnPrimary + " mt-4"}>Back</Link></div>;

  return (
    <div className="flex h-full flex-1 bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      <aside className={`fixed md:static inset-y-0 left-0 z-40 md:z-20 bg-white text-slate-800 border-r border-slate-200 flex-shrink-0 transition-all duration-300 overflow-y-auto flex flex-col ${isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:translate-x-0 md:w-0"}`}>
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm shadow-orange-600/30 flex-shrink-0">
              <UtensilsCrossed size={20} />
            </div>
            <div className="leading-tight">
              <span className="font-black text-lg text-slate-900 tracking-tight block truncate max-w-[120px]">{org.name}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RestaurantOS</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors md:hidden">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <button onClick={() => toggleGroup(group.label)} className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-2 hover:text-slate-600">
                {group.label}
                <X size={14} className={`text-slate-300 transition-transform duration-200 ${collapsedGroups.has(group.label) ? "rotate-45" : "rotate-0 opacity-0"}`} />
              </button>
              {!collapsedGroups.has(group.label) && (
                <ul className="space-y-0.5">
                  {group.items.filter((item: any) => !item.hidden).map((item: any) => (
                    <li key={item.label}>
                      <button onClick={() => { setActiveMenu(item.label); if (window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeMenu === item.label ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                        <item.icon size={18} className={activeMenu === item.label ? "text-white" : "text-slate-400"} />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white space-y-3">
          <button type="button" onClick={switchToPersonal} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors">
            <ArrowRightLeft size={13} className="text-slate-500" />
            <span>Personal Profile</span>
          </button>
          <Link href={`/org/${org.id}`} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200 transition-colors">
            <UtensilsCrossed size={13} />
            <span>Public Page</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-3 sm:px-4 lg:px-8 flex-shrink-0 z-10">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0 md:hidden">
              <Menu size={20} />
            </button>
            <h1 className="font-bold text-base sm:text-lg text-slate-800 truncate max-w-[140px] sm:max-w-none">{activeMenu}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <AudioAlertToggle showTestButton={false} />
            <div className="relative">
              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors block">
                <Bell size={20} />
                {tickets.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {tickets.length}
                  </span>
                )}
              </button>
            </div>
            <button onClick={loadData} className="hidden sm:block px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">Refresh</button>
          </div>
        </header>

        <div className={cn("flex-1 overflow-auto", activeMenu === "POS Terminal" ? "flex flex-col min-h-0" : "")}>
          <div className={activeMenu === "POS Terminal" ? "h-full" : "p-4 sm:p-6 lg:p-8"}>
            {activeMenu === "Dashboard" && <TabDashboard finance={finance} orders={orders} tickets={tickets} setActiveMenu={setActiveMenu} showTables={showTables} tables={tables} org={org} />}
            {activeMenu === "Reports" && <TabReports finance={finance} />}
            {activeMenu === "POS Terminal" && <TabPOS menu={menu} tables={tables} showTables={showTables} slug={slug} onDone={loadData} org={org} settings={settings} />}
            {activeMenu === "Orders" && <TabOrders orders={orders} />}
            {activeMenu === "Kitchen Board" && <TabKitchen tickets={tickets} slug={slug} onDone={loadData} org={org} />}
            {activeMenu === "Menu Items" && <TabMenu menu={menu} slug={slug} onDone={loadData} />}
            {activeMenu === "Stock & Ingredients" && <TabInventory inventory={inventory} slug={slug} onDone={loadData} subTab="Stock" />}
            {activeMenu === "Suppliers" && <TabInventory inventory={inventory} slug={slug} onDone={loadData} subTab="Suppliers" />}
            {activeMenu === "Purchase Orders" && <TabInventory inventory={inventory} slug={slug} onDone={loadData} subTab="POs" />}
            {activeMenu === "Waste Log" && <TabInventory inventory={inventory} slug={slug} onDone={loadData} subTab="Waste" />}
            {activeMenu === "Tables" && showTables && <TabTables tables={tables} slug={slug} onDone={loadData} />}
            {activeMenu === "Reservations" && showTables && <TabReservations reservations={reservations} tables={tables} slug={slug} onDone={loadData} />}
            {activeMenu === "Finance" && <TabFinance finance={finance} expenses={expenses} slug={slug} onDone={loadData} />}
            {activeMenu === "Settings" && <TabSettings settings={settings} slug={slug} onDone={loadData} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------
// TABS
// ---------------------------------------------------------------------

function TabDashboard({ finance, orders, tickets, setActiveMenu, showTables, tables, org }: any) {
  const { fmt } = useMoney();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Revenue" value={fmt(finance?.today?.revenue ?? 0)} icon={DollarSign} tone="brand" />
        <StatCard label="Orders Today" value={finance?.today?.orders ?? 0} icon={ShoppingCart} tone="amber" />
        <StatCard label="Open Tickets" value={tickets.length} icon={Flame} tone="red" />
        {showTables && <StatCard label="Tables Available" value={tables.filter((t:any) => t.status === 'available').length} icon={Grid3x3} tone="emerald" />}
        {!showTables && <StatCard label="Avg Order Value" value={fmt(finance?.today?.averageTicket ?? 0)} icon={TrendingUp} tone="purple" />}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Recent Orders" action={<button onClick={() => setActiveMenu('Orders')} className="text-xs font-bold text-orange-600">View all</button>}>
          {orders.slice(0,5).map((o:any) => (
            <div key={o.id} className="flex justify-between items-center p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <div>
                <p className="text-sm font-bold text-slate-900">#{o.orderNumber || o.id.slice(0,8)}</p>
                <p className="text-xs text-slate-500">{o.type} • {o.items.length} items</p>
              </div>
              <div className="text-right">
                <StatusPill tone={o.status === "COMPLETED" ? "emerald" : "orange"}>{o.status}</StatusPill>
                <p className="text-sm font-bold text-slate-900 mt-1">{fmt(o.totalAmount)}</p>
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="p-4 text-sm text-slate-500 text-center">No orders yet.</p>}
        </SectionCard>
        <SectionCard title="Revenue by Payment Method">
          <div className="p-6 space-y-4">
             {["WALLET", "CASH", "POS"].map(m => (
               <div key={m} className="flex justify-between items-center">
                 <span className="text-sm font-medium text-slate-700">{m === 'WALLET' ? 'CityPay Wallet' : m === 'CASH' ? 'Cash' : 'POS Terminal'}</span>
                 <span className="text-sm font-bold text-slate-900">{fmt(finance?.today?.revenueByMethod?.[m] ?? 0)}</span>
               </div>
             ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function TabReports({ finance }: any) {
  const { fmt } = useMoney();
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Store performance overview" />
      <EmptyState icon={BarChart3} title="Detailed reports coming soon" message="View Dashboard for daily metrics." />
    </div>
  );
}

function TabPOS({ menu, tables, showTables, slug, onDone, org, settings }: any) {
  const { fmt } = useMoney();
  const [posLines, setPosLines] = useState<any[]>([]);
  const [posType, setPosType] = useState<"DINE_IN" | "TAKEOUT">("TAKEOUT");
  const [posTableId, setPosTableId] = useState("");
  const [posPayment, setPosPayment] = useState<"WALLET" | "CASH" | "POS" | "">("CASH");
  const [posBusy, setPosBusy] = useState(false);
  const [posMsg, setPosMsg] = useState<string | null>(null);
  const [receiptModalData, setReceiptModalData] = useState<PrintableReceiptData | null>(null);

  const posTotal = posLines.reduce((s, l) => s + l.price * l.qty, 0);
  const posTax = Math.round(posTotal * ((settings?.taxRate ?? 0) / 100));
  const posService = Math.round(posTotal * ((settings?.serviceCharge ?? 0) / 100));
  const totalAmount = posTotal + posTax + posService;

  function posAdd(item: any) {
    if (item.isAvailable === false) return;
    setPosLines(prev => {
      const ex = prev.find(l => l.menuItemId === item.id);
      if (ex) return prev.map(l => l.menuItemId === item.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  }

  function posQty(id: string, qty: number) {
    setPosLines(prev => qty <= 0 ? prev.filter(l => l.menuItemId !== id) : prev.map(l => l.menuItemId === id ? { ...l, qty } : l));
  }

  async function placeOrder() {
    if (posLines.length === 0 || posBusy) return;
    setPosBusy(true); setPosMsg(null);
    const res = await createPosOrder({
      organizationId: slug,
      items: posLines.map(l => ({ menuItemId: l.menuItemId, quantity: l.qty })),
      type: posType,
      tableId: posType === "DINE_IN" && posTableId ? posTableId : undefined,
      paymentMethod: posPayment ? (posPayment as any) : undefined,
    });
    setPosBusy(false);
    if ("error" in res && res.error) { setPosMsg(res.error); return; }
    playCashRegisterChime();
    setReceiptModalData({
      orderId: (res as any).orderId,
      orderNumber: String((res as any).orderNumber),
      storeName: org?.name,
      date: new Date(),
      cashierName: "POS",
      orderType: posType as any,
      tableName: tables.find((t:any) => t.id === posTableId)?.name,
      items: posLines.map(l => ({ name: l.name, quantity: l.qty, unitPrice: l.price, subtotal: l.price * l.qty })),
      subtotal: posTotal,
      taxAmount: posTax,
      serviceCharge: posService,
      totalAmount: (res as any).totalAmount ?? totalAmount,
      paymentMethod: posPayment || "UNPAID",
      currencySymbol: "₦"
    });
    setPosLines([]);
    setPosMsg(`Order #${(res as any).orderNumber} placed`);
    await onDone();
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
        <PageHeader title="POS Terminal" subtitle="Tap items to add" />
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {menu.map((m: any) => (
            <button key={m.id} onClick={() => posAdd(m)} disabled={m.isAvailable === false} className={cn("p-4 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[100px]", m.isAvailable === false ? "bg-slate-50 border-slate-200 opacity-50" : "bg-white border-slate-200 hover:border-orange-400 hover:shadow-md active:scale-95")}>
              <div className="flex justify-between items-start w-full gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900 line-clamp-2">{m.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{m.category}</p>
                </div>
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
      <div className="w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 relative">
        <div className="p-4 border-b border-slate-100">
           <PillTabs tabs={[{value:'TAKEOUT', label:'Takeout'}, {value:'DINE_IN', label:'Dine-in'}]} active={posType} onChange={(v:any) => setPosType(v)} className="w-full justify-center flex" />
           {posType === 'DINE_IN' && showTables && (
             <select value={posTableId} onChange={e => setPosTableId(e.target.value)} className={selectCls + " mt-3"}>
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
           <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{fmt(posTotal)}</span></div>
           {posTax > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Tax</span><span>{fmt(posTax)}</span></div>}
           {posService > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Service</span><span>{fmt(posService)}</span></div>}
           <div className="flex justify-between font-bold text-lg text-slate-900 border-t border-slate-200 pt-2"><span>Total</span><span className="text-orange-600">{fmt(totalAmount)}</span></div>
           <div className="flex gap-2 pt-2">
             {["CASH","POS","WALLET"].map(p => (
               <button key={p} onClick={() => setPosPayment(posPayment === p ? "" : p as any)} className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-colors border", posPayment === p ? "bg-orange-600 text-white border-orange-600" : "bg-white text-slate-600 border-slate-200")}>{p}</button>
             ))}
           </div>
           <button onClick={placeOrder} disabled={posLines.length === 0 || posBusy} className={btnPrimary + " w-full mt-2 h-12 text-base"}>
             {posBusy ? <Loader2 className="animate-spin" size={18}/> : "Place Order"}
           </button>
           {posMsg && <p className="text-xs text-center text-emerald-600 font-bold">{posMsg}</p>}
        </div>
      </div>
      {receiptModalData && <ThermalReceiptModal initialData={receiptModalData} onClose={() => setReceiptModalData(null)} />}
    </div>
  );
}

function TabOrders({ orders }: any) {
  const { fmt } = useMoney();
  return (
    <div className="space-y-6">
      <PageHeader title="Order History" />
      <SectionCard>
         <table className="w-full text-sm text-left">
           <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase">
             <tr><th className="px-4 py-3">Order #</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th></tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
             {orders.map((o:any) => (
               <tr key={o.id} className="hover:bg-slate-50">
                 <td className="px-4 py-3 font-bold text-slate-900">#{o.orderNumber || o.id.slice(0,8)}</td>
                 <td className="px-4 py-3 text-slate-500">{new Date(o.createdAt).toLocaleString()}</td>
                 <td className="px-4 py-3"><StatusPill tone={o.status==="COMPLETED"?"emerald":"orange"}>{o.status}</StatusPill></td>
                 <td className="px-4 py-3 font-bold text-slate-900">{fmt(o.totalAmount)}</td>
               </tr>
             ))}
           </tbody>
         </table>
      </SectionCard>
    </div>
  );
}

function TabKitchen({ tickets, slug, onDone, org }: any) {
  const { fmt } = useMoney();
  const [receiptData, setReceiptData] = useState<any>(null);
  const STATUS_COLORS: any = { PENDING: 'orange', PREPARING: 'orange', READY: 'blue', COMPLETED: 'green' };

  return (
    <div className="space-y-6">
      <PageHeader title="Kitchen Display System" subtitle="Live active tickets" />
      {tickets.length === 0 ? (
         <EmptyState icon={CheckCircle2} title="All caught up" message="No pending orders." />
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {tickets.map((t:any) => {
             const minutesOld = Math.floor((new Date().getTime() - new Date(t.createdAt).getTime()) / 60000);
             const timeColor = minutesOld > 15 ? "text-red-600" : minutesOld > 5 ? "text-amber-600" : "text-emerald-600";
             return (
               <Card key={t.id} className="p-4 flex flex-col border-t-4 border-t-orange-500">
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <h3 className="font-black text-xl text-slate-900">#{t.orderNumber}</h3>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.type} {t.tableName && `• ${t.tableName}`}</p>
                   </div>
                   <div className="text-right">
                     <StatusPill tone={STATUS_COLORS[t.status]}>{t.status}</StatusPill>
                     <p className={`text-xs font-bold mt-1 ${timeColor}`}>{minutesOld}m ago</p>
                   </div>
                 </div>
                 <div className="flex-1 py-3 border-y border-slate-100 my-2 space-y-1">
                   {t.items.map((i:any) => (
                     <div key={i.id} className="flex justify-between text-sm">
                       <span className="font-bold text-slate-800">{i.quantity}x {i.itemName}</span>
                       {i.notes && <span className="text-xs text-amber-600">{i.notes}</span>}
                     </div>
                   ))}
                 </div>
                 <div className="flex flex-wrap gap-2 mt-2">
                    {t.status === 'PENDING' && <button onClick={async () => { await updateOrderStatus(t.id, 'PREPARING'); onDone(); }} className={btnPrimary + " flex-1 py-1.5 text-xs"}>Start</button>}
                    {t.status === 'PREPARING' && <button onClick={async () => { await updateOrderStatus(t.id, 'READY'); onDone(); }} className="flex-1 py-1.5 text-xs bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Ready</button>}
                    {t.status === 'READY' && <button onClick={async () => { await updateOrderStatus(t.id, 'COMPLETED'); onDone(); }} className="flex-1 py-1.5 text-xs bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Serve</button>}
                    <button onClick={() => setReceiptData({
                          orderId: t.id, orderNumber: String(t.orderNumber), storeName: org?.name, date: new Date(),
                          orderType: t.type as any, tableName: t.tableName, items: t.items.map((i:any) => ({ name: i.itemName, quantity: i.quantity, unitPrice: i.unitPrice, subtotal: i.unitPrice*i.quantity })),
                          subtotal: t.totalAmount, totalAmount: t.totalAmount, paymentMethod: t.paymentMethod || 'UNPAID', currencySymbol: '₦', footerMessage: 'Kitchen Ticket'
                    })} className={btnOutline + " py-1.5 px-2"}><Printer size={14}/></button>
                 </div>
               </Card>
             );
           })}
         </div>
      )}
      {receiptData && <ThermalReceiptModal initialData={receiptData} onClose={() => setReceiptData(null)} />}
    </div>
  );
}

const MENU_CATEGORIES = [
  "Rice Dishes",
  "Soups & Stews",
  "Snacks & Sides",
  "Swallow & Fufu",
  "Breakfast",
  "Drinks & Beverages",
  "Desserts",
  "Beans & Legumes",
  "Yam Dishes",
  "Chicken",
  "Beef & Meat",
  "Fish & Seafood",
  "Plantain"
];

const FOOD_LIBRARY = [
  { name: 'Jollof Rice & Chicken', category: 'Rice Dishes', image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&q=80&w=600' },
  { name: 'Fried Rice', category: 'Rice Dishes', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&q=80&w=600' },
  { name: 'Ofada Rice & Stew', category: 'Rice Dishes', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=600' },
  { name: 'Egusi Soup & Pounded Yam', category: 'Soups & Stews', image: 'https://images.unsplash.com/photo-1548502632-6b93092aad0b?auto=format&fit=crop&q=80&w=600' },
  { name: 'Edikaikong Soup', category: 'Soups & Stews', image: 'https://images.unsplash.com/photo-1633504581786-316c8002b1b9?auto=format&fit=crop&q=80&w=600' },
  { name: 'Afang Soup', category: 'Soups & Stews', image: 'https://images.unsplash.com/photo-1574653853027-5382a3d23a15?auto=format&fit=crop&q=80&w=600' },
  { name: 'Ogbono Soup', category: 'Soups & Stews', image: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&q=80&w=600' },
  { name: 'Banga Soup', category: 'Soups & Stews', image: 'https://images.unsplash.com/photo-1542528180-0c79567c66de?auto=format&fit=crop&q=80&w=600' },
  { name: 'Amala & Ewedu', category: 'Swallow & Fufu', image: 'https://images.unsplash.com/photo-1588691516089-9b4e54817a03?auto=format&fit=crop&q=80&w=600' },
  { name: 'Eba & Okro Soup', category: 'Swallow & Fufu', image: 'https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?auto=format&fit=crop&q=80&w=600' },
  { name: 'Asun (Spicy Goat Meat)', category: 'Beef & Meat', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600' },
  { name: 'Beef Suya', category: 'Snacks & Sides', image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&q=80&w=600' },
  { name: 'Chicken Suya', category: 'Snacks & Sides', image: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&q=80&w=600' },
  { name: 'Nkwobi', category: 'Beef & Meat', image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?auto=format&fit=crop&q=80&w=600' },
  { name: 'Isi Ewu', category: 'Beef & Meat', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600' },
  { name: 'Catfish Pepper Soup', category: 'Soups & Stews', image: 'https://images.unsplash.com/photo-1512489816562-b91c01e6ef84?auto=format&fit=crop&q=80&w=600' },
  { name: 'Goat Meat Pepper Soup', category: 'Soups & Stews', image: 'https://images.unsplash.com/photo-1563379926898-05f452098679?auto=format&fit=crop&q=80&w=600' },
  { name: 'Moi Moi', category: 'Beans & Legumes', image: 'https://images.unsplash.com/photo-1598515322588-46741b6bfd41?auto=format&fit=crop&q=80&w=600' },
  { name: 'Akara (Bean Cakes)', category: 'Breakfast', image: 'https://images.unsplash.com/photo-1605333396914-2c67cf761a20?auto=format&fit=crop&q=80&w=600' },
  { name: 'Ewa Agoyin', category: 'Beans & Legumes', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600' },
  { name: 'Fried Plantain (Dodo)', category: 'Plantain', image: 'https://images.unsplash.com/photo-1541525997-6a75f284d7be?auto=format&fit=crop&q=80&w=600' },
  { name: 'Roasted Plantain (Boli)', category: 'Plantain', image: 'https://images.unsplash.com/photo-1559181567-c1648b125320?auto=format&fit=crop&q=80&w=600' },
  { name: 'Yam Porridge (Asaro)', category: 'Yam Dishes', image: 'https://images.unsplash.com/photo-1580879207865-c3f2d25032b4?auto=format&fit=crop&q=80&w=600' },
  { name: 'Shawarma', category: 'Snacks & Sides', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=600' },
  { name: 'Burger & Fries', category: 'Snacks & Sides', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600' },
  { name: 'Chapman Drink', category: 'Drinks & Beverages', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600' },
  { name: 'Zobo Drink', category: 'Drinks & Beverages', image: 'https://images.unsplash.com/photo-1589146141384-ad4b97148ff6?auto=format&fit=crop&q=80&w=600' },
  { name: 'Malt Drink', category: 'Drinks & Beverages', image: 'https://images.unsplash.com/photo-1596700858169-d7c71f3074f0?auto=format&fit=crop&q=80&w=600' },
  { name: 'Palm Wine', category: 'Drinks & Beverages', image: 'https://images.unsplash.com/photo-1575037614876-c3852d2427df?auto=format&fit=crop&q=80&w=600' },
];

function TabMenu({ menu, slug, onDone }: any) {
  const { fmt } = useMoney();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState(MENU_CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  async function save() {
    setBusy(true);
    await createMenuItem({ organizationId: slug, name, price: Number(price) || 0, category, imageUrl: imageUrl.trim() || undefined });
    setBusy(false);
    setModalOpen(false);
    onDone();
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const res = await uploadAsset(slug, {
          fileName: file.name,
          mimeType: file.type,
          base64Data
        });
        if (res.success && res.publicUrl) {
          setImageUrl(res.publicUrl);
        } else if (res.error) {
          alert(res.error);
        }
        setBusy(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setBusy(false);
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Menu Items" actions={<button onClick={() => setModalOpen(true)} className={btnPrimary}><Plus size={16}/> Add Item</button>} />
      <SectionCard>
        <div className="overflow-x-auto">
         <table className="w-full text-sm text-left">
           <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase">
             <tr><th className="px-4 py-3 w-12"></th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
             {menu.map((m:any) => (
               <tr key={m.id} className="hover:bg-slate-50">
                 <td className="px-4 py-3">
                   {m.imageUrl ? <img src={m.imageUrl} alt={m.name} className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300"><ImageIcon size={14}/></div>}
                 </td>
                 <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                 <td className="px-4 py-3 text-slate-500">{m.category}</td>
                 <td className="px-4 py-3 font-bold text-orange-600">{fmt(m.price)}</td>
                 <td className="px-4 py-3"><button onClick={async () => { await toggleMenuItemAvailability(m.id); onDone(); }}><StatusPill tone={m.isAvailable ? "emerald" : "red"}>{m.isAvailable ? "Available" : "86'd"}</StatusPill></button></td>
                 <td className="px-4 py-3 text-right"><button onClick={async () => { if(confirm("Delete?")) { await deleteMenuItem(m.id); onDone(); } }} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button></td>
               </tr>
             ))}
           </tbody>
         </table>
        </div>
      </SectionCard>
      {modalOpen && (
        <Modal title="Add Menu Item" onClose={() => setModalOpen(false)} footer={<button onClick={save} disabled={busy || !name} className={btnPrimary}>{busy ? 'Saving...' : 'Save Item'}</button>}>
          <div className="p-6 space-y-4">
             {showLibrary ? (
               <div>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-sm text-slate-900">Food Library</h3>
                   <button onClick={() => setShowLibrary(false)} className="text-xs font-bold text-orange-600">Back to custom form</button>
                 </div>
                 <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                   {FOOD_LIBRARY.map((item, idx) => (
                     <button key={idx} onClick={() => { setName(item.name); setCategory(item.category); setImageUrl(item.image); setShowLibrary(false); }} className="text-left border border-slate-200 rounded-xl overflow-hidden hover:border-orange-400 transition-colors">
                       <img src={item.image} alt={item.name} className="w-full h-24 object-cover" />
                       <div className="p-2">
                         <p className="text-xs font-bold truncate">{item.name}</p>
                         <p className="text-[10px] text-slate-500 truncate">{item.category}</p>
                       </div>
                     </button>
                   ))}
                 </div>
               </div>
             ) : (
               <>
                 <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <div>
                     <p className="text-xs font-bold text-slate-900">Need inspiration?</p>
                     <p className="text-[10px] text-slate-500">Pick from our pre-filled library with high quality images.</p>
                   </div>
                   <button onClick={() => setShowLibrary(true)} className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-50">Browse Library</button>
                 </div>
                 
                 <div><label className="block text-xs font-bold text-slate-500 mb-1">Name</label><input className={inputCls} value={name} onChange={e=>setName(e.target.value)}/></div>
                 <div><label className="block text-xs font-bold text-slate-500 mb-1">Price</label><input type="number" className={inputCls} value={price} onChange={e=>setPrice(e.target.value)}/></div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Image</label>
                   <div className="flex items-end gap-3">
                     <div className="flex-1">
                       <input type="url" className={inputCls} value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://..."/>
                     </div>
                     <span className="text-xs font-bold text-slate-400 pb-2">OR</span>
                     <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl whitespace-nowrap transition-colors flex items-center gap-2">
                       <UploadCloud size={14} /> {busy ? 'Uploading...' : 'Upload'}
                     </button>
                     <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                   </div>
                   {imageUrl && (
                     <div className="mt-3 relative inline-block">
                       <img src={imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-slate-200" />
                       <button onClick={() => setImageUrl("")} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm"><X size={12} /></button>
                     </div>
                   )}
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                   <select className={selectCls} value={category} onChange={e=>setCategory(e.target.value)}>
                     {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
               </>
             )}
          </div>
        </Modal>
      )}
    </div>
  );
}
function TabInventory({ inventory, slug, onDone, subTab }: any) {
  // Local state for missing server actions
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(subTab);

  useEffect(() => { setActiveTab(subTab); }, [subTab]);

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Management" />
      <PillTabs tabs={[
        {value:'Stock', label:'Stock & Ingredients'},
        {value:'Suppliers', label:'Suppliers'},
        {value:'POs', label:'Purchase Orders'},
        {value:'Waste', label:'Waste Log'}
      ]} active={activeTab} onChange={(v:any) => setActiveTab(v)} />

      {activeTab === 'Stock' && <StockView inventory={inventory} slug={slug} onDone={onDone} />}
      {activeTab === 'Suppliers' && <SuppliersView suppliers={suppliers} setSuppliers={setSuppliers} />}
      {activeTab === 'POs' && <POsView purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} suppliers={suppliers} inventory={inventory} />}
      {activeTab === 'Waste' && <WasteView inventory={inventory} />}
    </div>
  );
}

function StockView({ inventory, slug, onDone }: any) {
  const [modalType, setModalType] = useState<"" | "ADD" | "RESTOCK" | "WASTE">("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // Add form
  const [name, setName] = useState(""); const [unit, setUnit] = useState("kg");
  const [qty, setQty] = useState(""); const [min, setMin] = useState("5");

  // Adjust form
  const [adjQty, setAdjQty] = useState(""); const [adjNote, setAdjNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    setBusy(true);
    await createInventoryItem({ organizationId: slug, name, unit, quantity: Number(qty)||0, lowStockLevel: Number(min)||5 });
    setBusy(false); setModalType(""); onDone();
  }

  async function handleAdjust(isAdd: boolean) {
    setBusy(true);
    const amount = (Number(adjQty) || 0) * (isAdd ? 1 : -1);
    await adjustStock(selectedItem.id, amount, adjNote || (isAdd ? 'Restock' : 'Spoiled'));
    setBusy(false); setModalType(""); onDone();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={() => setModalType("ADD")} className={btnPrimary}><Plus size={16}/> Add Ingredient</button></div>
      <SectionCard>
        <table className="w-full text-sm text-left">
           <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase">
             <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">In Stock</th><th className="px-4 py-3">Min Level</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
             {inventory.map((i:any) => {
               const st = i.quantity === 0 ? 'OUT' : i.quantity <= i.lowStockLevel ? 'LOW' : 'OK';
               return (
                 <tr key={i.id} className={st === 'LOW' ? 'border-l-4 border-amber-500 bg-amber-50/10' : ''}>
                   <td className="px-4 py-3 font-bold text-slate-900">{i.name}</td>
                   <td className="px-4 py-3 text-slate-600">{i.quantity} {i.unit}</td>
                   <td className="px-4 py-3 text-slate-500">{i.lowStockLevel} {i.unit}</td>
                   <td className="px-4 py-3"><StatusPill tone={st==='OUT'?'red':st==='LOW'?'amber':'emerald'}>{st}</StatusPill></td>
                   <td className="px-4 py-3 text-right space-x-2">
                     <button onClick={() => { setSelectedItem(i); setModalType("RESTOCK"); }} className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded text-xs font-bold">[+] Restock</button>
                     <button onClick={() => { setSelectedItem(i); setModalType("WASTE"); }} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold">[-] Waste</button>
                     <button onClick={async () => { if(confirm("Delete?")){ await deleteInventoryItem(i.id); onDone(); } }} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                   </td>
                 </tr>
               );
             })}
           </tbody>
        </table>
      </SectionCard>
      
      {modalType === "ADD" && (
        <Modal title="Add Ingredient" onClose={() => setModalType("")} footer={<><button onClick={() => setModalType("")} className={btnOutline}>Cancel</button><button onClick={handleAdd} disabled={busy} className={btnPrimary}>{busy?<Loader2 className="animate-spin" size={16}/>:"Save"}</button></>}>
           <div className="p-6 space-y-4">
             <div><label className="block text-xs font-bold text-slate-500 mb-1">Name</label><input className={inputCls} value={name} onChange={e=>setName(e.target.value)}/></div>
             <div><label className="block text-xs font-bold text-slate-500 mb-1">Unit</label><input className={inputCls} value={unit} onChange={e=>setUnit(e.target.value)}/></div>
             <div className="flex gap-4">
               <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Initial Qty</label><input type="number" className={inputCls} value={qty} onChange={e=>setQty(e.target.value)}/></div>
               <div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Low Alert Level</label><input type="number" className={inputCls} value={min} onChange={e=>setMin(e.target.value)}/></div>
             </div>
           </div>
        </Modal>
      )}

      {(modalType === "RESTOCK" || modalType === "WASTE") && (
        <Modal title={`${modalType === 'RESTOCK' ? 'Restock' : 'Record Waste'}: ${selectedItem?.name}`} onClose={() => setModalType("")} footer={<><button onClick={() => setModalType("")} className={btnOutline}>Cancel</button><button onClick={() => handleAdjust(modalType==='RESTOCK')} disabled={busy} className={btnPrimary}>{busy?<Loader2 className="animate-spin" size={16}/>:"Save"}</button></>}>
           <div className="p-6 space-y-4">
             <div><label className="block text-xs font-bold text-slate-500 mb-1">Quantity</label><input type="number" className={inputCls} value={adjQty} onChange={e=>setAdjQty(e.target.value)}/></div>
             <div><label className="block text-xs font-bold text-slate-500 mb-1">{modalType === 'RESTOCK' ? 'Supplier / Note' : 'Reason (Spoiled/Damaged)'}</label><input className={inputCls} value={adjNote} onChange={e=>setAdjNote(e.target.value)}/></div>
           </div>
        </Modal>
      )}
    </div>
  );
}

function SuppliersView({ suppliers, setSuppliers }: any) {
  // TODO: Missing server actions for Suppliers. Managed locally.
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={() => setModalOpen(true)} className={btnPrimary}><Plus size={16}/> Add Supplier</button></div>
      <SectionCard>
         {suppliers.length === 0 ? <p className="p-8 text-center text-slate-500">No suppliers defined. (Note: using local state)</p> : 
         <ul className="divide-y divide-slate-100">
            {suppliers.map((s:any, i:number) => (
              <li key={i} className="p-4 flex justify-between items-center">
                <div><p className="font-bold">{s.name}</p><p className="text-sm text-slate-500">{s.contact}</p></div>
                <button onClick={() => setSuppliers((prev:any) => prev.filter((_:any,idx:number)=>idx!==i))} className="text-red-500"><Trash2 size={16}/></button>
              </li>
            ))}
         </ul>}
      </SectionCard>
      {modalOpen && (
        <Modal title="Add Supplier" onClose={() => setModalOpen(false)} footer={<><button onClick={() => setModalOpen(false)} className={btnOutline}>Cancel</button><button onClick={() => { setSuppliers([...suppliers, {name, contact}]); setModalOpen(false); }} className={btnPrimary}>Save</button></>}>
          <div className="p-6 space-y-4">
             <div><label className="block text-xs font-bold text-slate-500 mb-1">Name</label><input className={inputCls} value={name} onChange={e=>setName(e.target.value)}/></div>
             <div><label className="block text-xs font-bold text-slate-500 mb-1">Contact</label><input className={inputCls} value={contact} onChange={e=>setContact(e.target.value)}/></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function POsView({ purchaseOrders, setPurchaseOrders, suppliers, inventory }: any) {
  // TODO: Missing server actions for POs. Managed locally.
  return (
    <div className="space-y-4">
      <SectionCard>
        <EmptyState icon={ClipboardList} title="Purchase Orders" message="PO management requires server actions. Coming soon." />
      </SectionCard>
    </div>
  );
}

function WasteView({ inventory }: any) {
  return (
    <div className="space-y-4">
      <SectionCard>
        <EmptyState icon={Trash2} title="Waste Log" message="Waste is recorded via the Stock tab's [-] Waste action. Detailed historical logs coming soon." />
      </SectionCard>
    </div>
  );
}

function TabTables({ tables, slug, onDone }: any) {
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("");
  async function handleAdd() {
    await createTable({ organizationId: slug, name, seats: Number(seats)||4 });
    setName(""); setSeats(""); onDone();
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Tables" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
         {tables.map((t:any) => (
           <button key={t.id} onClick={async () => { const n = t.status==='available'?'occupied':t.status==='occupied'?'reserved':'available'; await updateTableStatus(t.id, n); onDone(); }} className={cn("p-4 rounded-xl border text-left transition-colors h-24", t.status==='available'?'bg-emerald-50 border-emerald-200':t.status==='occupied'?'bg-orange-50 border-orange-200':'bg-blue-50 border-blue-200')}>
             <p className="font-bold text-slate-900">{t.name}</p>
             <p className="text-xs uppercase mt-1">{t.status} • {t.seats} pax</p>
           </button>
         ))}
      </div>
      <SectionCard title="Add Table" className="max-w-md">
         <div className="p-4 flex gap-2">
           <input className={inputCls} placeholder="Name" value={name} onChange={e=>setName(e.target.value)}/>
           <input type="number" className={inputCls} placeholder="Seats" value={seats} onChange={e=>setSeats(e.target.value)} style={{width: '100px'}}/>
           <button onClick={handleAdd} className={btnPrimary}>Add</button>
         </div>
      </SectionCard>
    </div>
  );
}

function TabReservations({ reservations, tables, slug, onDone }: any) {
  return (
    <div className="space-y-6">
      <PageHeader title="Reservations" />
      <SectionCard>
         <table className="w-full text-sm text-left">
           <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase">
             <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Table</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
             {reservations.map((r:any) => (
               <tr key={r.id}>
                 <td className="px-4 py-3 font-bold">{r.customerName || 'Guest'} ({r.partySize} pax)</td>
                 <td className="px-4 py-3 text-slate-500">{new Date(r.scheduledAt).toLocaleString()}</td>
                 <td className="px-4 py-3 text-slate-500">{tables.find((t:any)=>t.id===r.tableId)?.name || 'Any'}</td>
                 <td className="px-4 py-3"><StatusPill tone={r.status==='seated'?'green':r.status==='cancelled'?'red':'orange'}>{r.status}</StatusPill></td>
                 <td className="px-4 py-3 text-right space-x-2">
                   {r.status === 'pending' && <button onClick={async () => { await updateReservationStatus(r.id, 'confirmed'); onDone(); }} className="text-xs font-bold text-blue-600">Confirm</button>}
                   {r.status === 'confirmed' && <button onClick={async () => { await updateReservationStatus(r.id, 'seated'); onDone(); }} className="text-xs font-bold text-emerald-600">Seat</button>}
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
         {reservations.length === 0 && <p className="p-8 text-center text-slate-500">No reservations.</p>}
      </SectionCard>
    </div>
  );
}

function TabFinance({ finance, expenses, slug, onDone }: any) {
  const { fmt } = useMoney();
  const [amt, setAmt] = useState("");
  const [cat, setCat] = useState("");
  const [busy, setBusy] = useState(false);
  async function addExp() {
    setBusy(true);
    await addExpense({ organizationId: slug, amount: Number(amt), category: cat });
    setBusy(false); setAmt(""); setCat(""); onDone();
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Finance" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Revenue Today" value={fmt(finance?.today?.revenue??0)} tone="brand" />
        <StatCard label="Revenue Week" value={fmt(finance?.week?.revenue??0)} tone="blue" />
        <StatCard label="Total Expenses" value={fmt(finance?.week?.expenses??0)} tone="red" />
        <StatCard label="Net Profit" value={fmt(finance?.week?.net??0)} tone="emerald" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Record Expense" className="lg:col-span-1 h-fit">
          <div className="p-4 space-y-3">
             <input type="number" className={inputCls} placeholder="Amount" value={amt} onChange={e=>setAmt(e.target.value)}/>
             <input className={inputCls} placeholder="Category / Note" value={cat} onChange={e=>setCat(e.target.value)}/>
             <button onClick={addExp} disabled={busy} className={btnPrimary + " w-full"}>Save Expense</button>
          </div>
        </SectionCard>
        <SectionCard title="Recent Expenses" className="lg:col-span-2">
           <ul className="divide-y divide-slate-100">
             {expenses.slice(0,10).map((e:any) => (
               <li key={e.id} className="p-4 flex justify-between">
                 <span className="font-medium text-slate-900 capitalize">{e.category} {e.note && `— ${e.note}`}</span>
                 <span className="font-bold text-red-600">-{fmt(e.amount)}</span>
               </li>
             ))}
             {expenses.length === 0 && <p className="p-4 text-slate-500">No expenses recorded.</p>}
           </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function TabSettings({ settings, slug, onDone }: any) {
  const [style, setStyle] = useState(settings?.serviceStyle || 'HYBRID');
  const [busy, setBusy] = useState(false);
  const [logoAssetId, setLogoAssetId] = useState<string | null>(settings?.logoAssetId || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await uploadAsset(slug, { fileName: file.name, mimeType, base64Data: base64 });
      if ((res as any)?.assetId) {
        setLogoAssetId((res as any).assetId);
      }
    } finally {
      setUploadingLogo(false);
    }
  }

  async function save() {
    setBusy(true);
    await updateRestaurantOSSettings(slug, { serviceStyle: style, logoAssetId });
    setBusy(false); onDone();
  }
  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader title="Settings" />
      
      <SectionCard title="Store Profile">
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Logo</label>
            <div className="flex items-center gap-3">
              {logoAssetId ? (
                <img src={`/api/assets/${logoAssetId}`} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
              ) : (
                <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-300"><Upload size={18} /></div>
              )}
              <label className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                {uploadingLogo ? <Loader2 size={14} className="animate-spin inline" /> : (logoAssetId ? "Replace" : "Upload")}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
              </label>
              {logoAssetId && <button onClick={() => setLogoAssetId(null)} className="text-xs font-semibold text-slate-400 hover:text-red-600">Remove</button>}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Operating Mode">
        <div className="p-6 space-y-4">
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">Service Style</label>
             <select className={selectCls} value={style} onChange={e=>setStyle(e.target.value)}>
               <option value="HYBRID">Hybrid (Tables + Counter)</option>
               <option value="FULL_SERVICE">Full Service (Tables only)</option>
               <option value="COUNTER">Counter Service (Fast Food / Takeout only)</option>
             </select>
             <p className="text-xs text-slate-500 mt-2">Determines if Tables and Reservations tabs are visible, and if Dine-in prompts for a table.</p>
           </div>
           <button onClick={save} disabled={busy} className={btnPrimary}>{busy?<Loader2 className="animate-spin" size={16}/>:"Save Settings"}</button>
        </div>
      </SectionCard>
    </div>
  );
}








