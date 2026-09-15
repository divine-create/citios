"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Store,
  DollarSign,
  ArrowRightLeft,
  Truck,
  ChevronRight,
  Globe,
  Lock,
  Loader2,
  Plus,
  X,
  CheckCircle2,
  Receipt,
  Trash2,
  Eye,
  RotateCcw,
  Search,
  Phone,
  Mail,
  Minus,
  Star,
  Bell,
  User,
  Menu,
  Settings as SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import POSTerminal from "./POSTerminal";
import InventoryManager from "./InventoryManager";
import Settings from "./Settings";
import ShopOnboardingWidget from "./ShopOnboardingWidget";
import {
  getShopDashboardData,
  getProducts,
  getCategories,
  getRegisters,
  openShift,
  closeShift,
  getShiftHistory,
  getSuppliers,
  createSupplier,
  deleteSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  createRegister,
  getExpenses,
  createExpense,
  deleteExpense,
  getExpenseSummary,
  getOrders,
  refundOrder,
  getCustomers,
  getCustomer,
  createCustomer,
  deleteCustomer,
  adjustLoyaltyPoints,
} from "@/lib/actions/retail";
import { uploadAsset } from "@/lib/actions/microsite";

interface ShopDashboardProps {
  organizationId: string;
  userRole: "OWNER" | "MANAGER" | "CASHIER" | "INVENTORY_STAFF";
  currentUserId: string;
}

export default function ShopDashboard({ organizationId, userRole, currentUserId }: ShopDashboardProps) {
  const [activeMenu, setActiveMenu] = useState(() => {
    if (userRole === "CASHIER") return "POS Terminal";
    if (userRole === "INVENTORY_STAFF") return "Products & Inventory";
    return "Dashboard";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    const [dash, prods, cats, regs] = await Promise.all([
      getShopDashboardData(organizationId),
      getProducts(organizationId),
      getCategories(organizationId),
      getRegisters(organizationId),
    ]);
    setDashboard(dash);
    setProducts(prods);
    setCategories(cats);
    setRegisters(regs);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    if (window.matchMedia("(max-width: 767px)").matches) setIsSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ALL_MENU_ITEMS = [
    { label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] },
    { label: "POS Terminal", icon: ShoppingCart, roles: ["OWNER", "MANAGER", "CASHIER"] },
    { label: "Products & Inventory", icon: Package, roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] },
    { label: "Sales & Returns", icon: ArrowRightLeft, roles: ["OWNER", "MANAGER", "CASHIER"] },
    { label: "Customers", icon: Users, roles: ["OWNER", "MANAGER", "CASHIER"] },
    { label: "Suppliers & POs", icon: Truck, roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] },
    { label: "Cash & Shifts", icon: Store, roles: ["OWNER", "MANAGER", "CASHIER"] },
    { label: "Expenses", icon: DollarSign, roles: ["OWNER", "MANAGER"] },
    { label: "Settings", icon: SettingsIcon, roles: ["OWNER", "MANAGER"] },
  ];

  const MENU_ITEMS = ALL_MENU_ITEMS.filter((item) => item.roles.includes(userRole));
  const openShiftData = dashboard?.openShift ?? null;

  return (
    <div className="flex h-screen bg-[#F4F7FC] text-slate-800 font-sans overflow-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 md:z-20 bg-white text-slate-800 border-r border-slate-200 flex-shrink-0 transition-all duration-300 overflow-y-auto ${
          isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:translate-x-0 md:w-0"
        }`}
      >
        <div className="p-5 flex items-center gap-3 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">ShopOS</span>
        </div>

        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Store Management</p>
          <ul className="space-y-1">
            {MENU_ITEMS.map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => {
                    setActiveMenu(item.label);
                    if (window.matchMedia("(max-width: 767px)").matches) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeMenu === item.label ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <item.icon size={18} className={activeMenu === item.label ? "text-blue-600" : "text-slate-400"} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {["OWNER", "MANAGER"].includes(userRole) && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-2 px-2 pt-4 border-t border-slate-100">Online Store</p>
              <Link
                href={`/business/website?org=${organizationId}`}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Globe size={18} className="text-slate-400" />
                Website Builder
              </Link>
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#F4F7FC]">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-bold text-lg text-slate-800 hidden md:block">{activeMenu}</h1>
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-500 w-64 ml-4">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none w-full placeholder:text-slate-400 text-slate-700" 
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                openShiftData ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${openShiftData ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {openShiftData ? `${openShiftData.registerName}: OPEN` : "No Register Open"}
            </div>
            
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <User size={16} className="text-slate-600" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> Loading...</div>
          ) : (
            <>
              {activeMenu === "Dashboard" && (
                <div className="p-8">
                  {dashboard?.settings && (
                    <ShopOnboardingWidget 
                      settings={dashboard.settings} 
                      organizationId={organizationId} 
                      onNavigate={(tab) => setActiveMenu(tab)} 
                    />
                  )}
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">Today's Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard label="Gross Sales" value={`$${dashboard.grossSales.toFixed(2)}`} />
                    <StatCard label="Transactions" value={String(dashboard.transactions)} />
                    <StatCard label="Refunds" value={`$${dashboard.refunds.toFixed(2)}`} />
                    <StatCard label="Net Sales" value={`$${dashboard.netSales.toFixed(2)}`} />
                  </div>
                  {dashboard.lowStockCount > 0 && (
                    <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
                      {dashboard.lowStockCount} product{dashboard.lowStockCount === 1 ? "" : "s"} at or below their low-stock threshold — check Products & Inventory.
                    </div>
                  )}
                </div>
              )}

              {activeMenu === "POS Terminal" && (
                openShiftData ? (
                  <POSTerminal organizationId={organizationId} products={products} shiftId={openShiftData.id} cashierId={currentUserId} onOrderComplete={loadAll} />
                ) : (
                  <OpenShiftPrompt organizationId={organizationId} registers={registers} currentUserId={currentUserId} onOpened={loadAll} />
                )
              )}

              {activeMenu === "Products & Inventory" && (
                <InventoryManager organizationId={organizationId} products={products} categories={categories} onChanged={loadAll} />
              )}

              {activeMenu === "Cash & Shifts" && (
                <ShiftsTab organizationId={organizationId} registers={registers} openShift={openShiftData} currentUserId={currentUserId} onChanged={loadAll} />
              )}

              {activeMenu === "Suppliers & POs" && <SuppliersTab organizationId={organizationId} />}

              {activeMenu === "Expenses" && <ExpensesTab organizationId={organizationId} currentUserId={currentUserId} />}

              {activeMenu === "Settings" && <Settings organizationId={organizationId} />}

              {activeMenu === "Sales & Returns" && <SalesReturnsTab organizationId={organizationId} currentUserId={currentUserId} onChanged={loadAll} />}

              {activeMenu === "Customers" && <CustomersTab organizationId={organizationId} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
    </div>
  );
}

// =====================================================================
// Open Shift prompt (POS is gated behind an open register shift)
// =====================================================================

function OpenShiftPrompt({ organizationId, registers, currentUserId, onOpened }: {
  organizationId: string; registers: any[]; currentUserId: string; onOpened: () => void;
}) {
  const [registerId, setRegisterId] = useState(registers[0]?.id ?? "");
  const [openingFloat, setOpeningFloat] = useState("100");
  const [newRegisterName, setNewRegisterName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addRegister = async () => {
    if (!newRegisterName.trim()) return;
    const res = await createRegister(organizationId, newRegisterName);
    if ((res as any)?.register) {
      setRegisterId((res as any).register.id);
      setNewRegisterName("");
      onOpened();
    }
  };

  const submit = async () => {
    setError(null);
    if (!registerId) { setError("Select or create a register first."); return; }
    const float = parseFloat(openingFloat);
    if (isNaN(float) || float < 0) { setError("Enter a valid opening cash float."); return; }
    setIsSaving(true);
    try {
      const res = await openShift({ organizationId, registerId, openedById: currentUserId, openingFloat: float });
      if ((res as any)?.error) { setError((res as any).error); return; }
      onOpened();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto"><Lock size={28} /></div>
        <h3 className="font-bold text-slate-800 text-lg">No Register Open</h3>
        <p className="text-sm text-slate-500">Open a register shift to start ringing up sales.</p>
        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 text-left">{error}</div>}

        {registers.length > 0 ? (
          <div className="text-left space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Register</label>
            <select value={registerId} onChange={(e) => setRegisterId(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg bg-white">
              {registers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        ) : (
          <div className="text-left space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">New Register Name</label>
            <div className="flex gap-2">
              <input value={newRegisterName} onChange={(e) => setNewRegisterName(e.target.value)} placeholder="Register 1" className="flex-1 p-2.5 border border-slate-200 rounded-lg" />
              <button onClick={addRegister} className="px-3 bg-slate-800 text-white rounded-lg font-semibold text-sm">Add</button>
            </div>
          </div>
        )}

        <div className="text-left space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Opening Cash Float ($)</label>
          <input type="number" step="0.01" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg" />
        </div>

        <button
          onClick={submit}
          disabled={isSaving || !registerId}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
          Open Shift
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// Cash & Shifts
// =====================================================================

function ShiftsTab({ organizationId, registers, openShift: openShiftData, currentUserId, onChanged }: {
  organizationId: string; registers: any[]; openShift: any; currentUserId: string; onChanged: () => void;
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [actualCash, setActualCash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ expectedCash: number; discrepancy: number } | null>(null);

  const loadHistory = async () => {
    const rows = await getShiftHistory(organizationId);
    setHistory(rows);
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openShiftData?.id]);

  const submitClose = async () => {
    setError(null);
    const cash = parseFloat(actualCash);
    if (isNaN(cash) || cash < 0) { setError("Enter the counted cash amount."); return; }
    setIsSaving(true);
    try {
      const res = await closeShift(openShiftData.id, { closedById: currentUserId, actualCash: cash });
      if ((res as any)?.error) { setError((res as any).error); return; }
      setResult({ expectedCash: (res as any).expectedCash, discrepancy: (res as any).discrepancy });
      setActualCash("");
      onChanged();
      loadHistory();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Cash & Shifts</h2>

      {openShiftData ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">{openShiftData.registerName}</h3>
              <p className="text-sm text-slate-500">Opening float: ${openShiftData.openingFloat.toFixed(2)}</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">OPEN</span>
          </div>

          {result ? (
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Expected Cash</span><span className="font-semibold">${result.expectedCash.toFixed(2)}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">Discrepancy</span>
                <span className={`font-semibold ${result.discrepancy === 0 ? "text-slate-700" : result.discrepancy > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {result.discrepancy > 0 ? "+" : ""}${result.discrepancy.toFixed(2)}
                </span>
              </div>
              <p className="text-emerald-600 font-medium pt-1 flex items-center gap-1"><CheckCircle2 size={14} /> Shift closed.</p>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Counted Cash in Drawer ($)</label>
                <input type="number" step="0.01" value={actualCash} onChange={(e) => setActualCash(e.target.value)} className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg" />
              </div>
              <button onClick={submitClose} disabled={isSaving} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg font-semibold">
                {isSaving ? "Closing..." : "Close Shift"}
              </button>
            </div>
          )}
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400">No register is currently open.</div>
      )}

      <div>
        <h3 className="font-bold text-slate-800 mb-3">Shift History</h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Opening Float</th>
                <th className="px-4 py-3 text-right">Discrepancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No shifts recorded yet.</td></tr>
              ) : (
                history.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">{new Date(s.openedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">${s.openingFloat.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{s.discrepancy != null ? `$${s.discrepancy.toFixed(2)}` : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Suppliers & POs
// =====================================================================

function SuppliersTab({ organizationId }: { organizationId: string }) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [view, setView] = useState<"suppliers" | "pos">("suppliers");
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", contactName: "", email: "", phone: "" });
  const [isAddPoOpen, setIsAddPoOpen] = useState(false);
  const [poForm, setPoForm] = useState({ supplierId: "", poNumber: "", totalAmount: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [s, p] = await Promise.all([getSuppliers(organizationId), getPurchaseOrders(organizationId)]);
    setSuppliers(s);
    setPos(p);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const submitSupplier = async () => {
    if (!supplierForm.name.trim()) return;
    await createSupplier({ organizationId, ...supplierForm });
    setSupplierForm({ name: "", contactName: "", email: "", phone: "" });
    setIsAddSupplierOpen(false);
    load();
  };

  const removeSupplier = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    const res = await deleteSupplier(id);
    if ((res as any)?.error) { alert((res as any).error); return; }
    load();
  };

  const submitPo = async () => {
    if (!poForm.supplierId || !poForm.poNumber.trim()) return;
    await createPurchaseOrder({ organizationId, supplierId: poForm.supplierId, poNumber: poForm.poNumber, totalAmount: poForm.totalAmount ? parseFloat(poForm.totalAmount) : undefined });
    setPoForm({ supplierId: "", poNumber: "", totalAmount: "" });
    setIsAddPoOpen(false);
    load();
  };

  const cyclePoStatus = async (po: any) => {
    const next: Record<string, string> = { DRAFT: "SENT", SENT: "RECEIVED", RECEIVED: "RECEIVED", PARTIAL: "RECEIVED" };
    await updatePurchaseOrderStatus(po.id, next[po.status] as any);
    load();
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Suppliers & Purchase Orders</h2>
        <button
          onClick={() => (view === "suppliers" ? setIsAddSupplierOpen(true) : setIsAddPoOpen(true))}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
        >
          <Plus size={16} /> {view === "suppliers" ? "Add Supplier" : "New Purchase Order"}
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setView("suppliers")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${view === "suppliers" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>Suppliers</button>
        <button onClick={() => setView("pos")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${view === "pos" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>Purchase Orders</button>
      </div>

      {view === "suppliers" ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Terms</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No suppliers yet.</td></tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-500">{s.contactName ?? "—"} {s.email ? `· ${s.email}` : ""}</td>
                    <td className="px-4 py-3 text-slate-500">{s.paymentTerms ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeSupplier(s.id)} className="text-xs font-semibold text-red-500 hover:text-red-700">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr><th className="px-4 py-3">PO Number</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pos.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No purchase orders yet.</td></tr>
              ) : (
                pos.map((po) => (
                  <tr key={po.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{po.poNumber}</td>
                    <td className="px-4 py-3 text-slate-500">{po.supplierName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{po.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{po.totalAmount != null ? `$${po.totalAmount.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {po.status !== "RECEIVED" && (
                        <button onClick={() => cyclePoStatus(po)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Mark {po.status === "DRAFT" ? "Sent" : "Received"}</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isAddSupplierOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Add Supplier</h3>
              <button onClick={() => setIsAddSupplierOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3">
              <input placeholder="Supplier name" value={supplierForm.name} onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
              <input placeholder="Contact name" value={supplierForm.contactName} onChange={(e) => setSupplierForm((f) => ({ ...f, contactName: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
              <input placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
              <input placeholder="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm((f) => ({ ...f, phone: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddSupplierOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submitSupplier} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {isAddPoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">New Purchase Order</h3>
              <button onClick={() => setIsAddPoOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3">
              <select value={poForm.supplierId} onChange={(e) => setPoForm((f) => ({ ...f, supplierId: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg bg-white">
                <option value="">Select supplier...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input placeholder="PO Number (e.g. PO-1001)" value={poForm.poNumber} onChange={(e) => setPoForm((f) => ({ ...f, poNumber: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
              <input type="number" step="0.01" placeholder="Total amount ($)" value={poForm.totalAmount} onChange={(e) => setPoForm((f) => ({ ...f, totalAmount: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddPoOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submitPo} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Expenses
// =====================================================================

const EXPENSE_CATEGORIES = ["Rent", "Utilities", "Supplies", "Payroll", "Maintenance", "Marketing", "Other"];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

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

function ExpensesTab({ organizationId, currentUserId }: { organizationId: string; currentUserId: string }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ totalThisMonth: number; countThisMonth: number; totalAllTime: number; byCategory: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0], description: "", amount: "", expenseDate: todayInputValue(), paymentMethod: "CASH", vendorName: "" });
  const [receiptAssetId, setReceiptAssetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    const [exp, sum] = await Promise.all([getExpenses(organizationId), getExpenseSummary(organizationId)]);
    setExpenses(exp);
    setSummary(sum);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const openAdd = () => {
    setForm({ category: EXPENSE_CATEGORIES[0], description: "", amount: "", expenseDate: todayInputValue(), paymentMethod: "CASH", vendorName: "" });
    setReceiptAssetId(null);
    setError(null);
    setIsAddOpen(true);
  };

  const handleReceiptUpload = async (file: File) => {
    setUploading(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await uploadAsset(organizationId, { fileName: file.name, mimeType, base64Data: base64 });
      if ((res as any)?.assetId) setReceiptAssetId((res as any).assetId);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError(null);
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { setError("Enter a valid amount."); return; }
    setIsSaving(true);
    try {
      const res = await createExpense({
        organizationId,
        category: form.category,
        description: form.description || undefined,
        amount,
        expenseDate: form.expenseDate,
        paymentMethod: form.paymentMethod as any,
        vendorName: form.vendorName || undefined,
        receiptAssetId: receiptAssetId ?? undefined,
        recordedById: currentUserId,
      });
      if ((res as any)?.error) { setError((res as any).error); return; }
      setIsAddOpen(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this expense record?")) return;
    await deleteExpense(id);
    load();
  };

  if (loading || !summary) return <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> Loading...</div>;

  const maxCategoryAmount = Math.max(1, ...Object.values(summary.byCategory));

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Expenses</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
          <Plus size={16} /> Record Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="This Month" value={`$${summary.totalThisMonth.toFixed(2)}`} />
        <StatCard label="Expenses This Month" value={String(summary.countThisMonth)} />
        <StatCard label="All Time Total" value={`$${summary.totalAllTime.toFixed(2)}`} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-bold text-slate-800 mb-4">This Month by Category</h3>
        <div className="space-y-3">
          {EXPENSE_CATEGORIES.map((cat) => {
            const amount = summary.byCategory[cat] ?? 0;
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-24 text-sm text-slate-600 flex-shrink-0">{cat}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${(amount / maxCategoryAmount) * 100}%` }} />
                </div>
                <span className="w-20 text-right text-sm font-semibold text-slate-700 flex-shrink-0">${amount.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-slate-800 mb-3">Recent Expenses</h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Vendor / Description</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No expenses recorded yet.</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600">{new Date(e.expenseDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{e.category}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {e.vendorName && <span className="font-medium">{e.vendorName}</span>}
                      {e.vendorName && e.description && " — "}
                      {e.description && <span className="text-slate-500">{e.description}</span>}
                      {!e.vendorName && !e.description && "—"}
                      {e.receiptAssetId && (
                        <a href={`/api/assets/${e.receiptAssetId}`} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center text-blue-500 hover:text-blue-700">
                          <Receipt size={14} />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{e.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">${e.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(e.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Record Expense</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg bg-white">
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Amount ($)</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                  <input type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg bg-white">
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Vendor</label>
                <input value={form.vendorName} onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" placeholder="e.g. City Power & Light" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" placeholder="Optional note" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Receipt</label>
                <div className="flex items-center gap-3">
                  {receiptAssetId ? (
                    <img src={`/api/assets/${receiptAssetId}`} alt="Receipt" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-300"><Receipt size={18} /></div>
                  )}
                  <label className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                    {uploading ? <Loader2 size={14} className="animate-spin inline" /> : (receiptAssetId ? "Replace" : "Upload")}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleReceiptUpload(e.target.files[0])} />
                  </label>
                  {receiptAssetId && <button onClick={() => setReceiptAssetId(null)} className="text-xs font-semibold text-slate-400 hover:text-red-600">Remove</button>}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submit} disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg">
                {isSaving ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Sales & Returns
// =====================================================================

function SalesReturnsTab({ organizationId, currentUserId, onChanged }: { organizationId: string; currentUserId: string; onChanged: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "REFUNDED">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const rows = await getOrders(organizationId, statusFilter === "ALL" ? undefined : { status: statusFilter });
    setOrders(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, statusFilter]);

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return o.id.toLowerCase().includes(q) || o.cashierName.toLowerCase().includes(q) || o.items.some((i: any) => i.productName.toLowerCase().includes(q));
  });

  const openView = (order: any) => {
    setViewingOrder(order);
    setRefundReason("");
    setError(null);
  };

  const submitRefund = async () => {
    if (!viewingOrder) return;
    setError(null);
    setIsRefunding(true);
    try {
      const res = await refundOrder(viewingOrder.id, { refundedById: currentUserId, reason: refundReason || undefined });
      if ((res as any)?.error) { setError((res as any).error); return; }
      setViewingOrder(null);
      load();
      onChanged();
    } finally {
      setIsRefunding(false);
    }
  };

  const totalSales = orders.filter((o) => o.status === "COMPLETED").reduce((sum, o) => sum + o.totalAmount, 0);
  const totalRefunded = orders.filter((o) => o.status === "REFUNDED").reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Sales & Returns</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Orders" value={String(orders.length)} />
        <StatCard label="Completed Sales" value={`$${totalSales.toFixed(2)}`} />
        <StatCard label="Refunded" value={`$${totalRefunded.toFixed(2)}`} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2">
          {(["ALL", "COMPLETED", "REFUNDED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${statusFilter === s ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {s === "ALL" ? "All Orders" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order, cashier, item..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Cashier</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No orders found.</td></tr>
            ) : (
              filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{o.cashierName}</td>
                  <td className="px-4 py-3 text-slate-500">{o.items.length} item{o.items.length === 1 ? "" : "s"}</td>
                  <td className="px-4 py-3 text-slate-500">{o.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${o.status === "REFUNDED" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">${o.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openView(o)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Order #{viewingOrder.id.slice(0, 8)}</h3>
                <p className="text-xs text-slate-400">{new Date(viewingOrder.createdAt).toLocaleString()} · {viewingOrder.cashierName}</p>
              </div>
              <button onClick={() => setViewingOrder(null)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="space-y-2">
                {viewingOrder.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-700">{item.productName} × {item.quantity}</span>
                    <span className="font-semibold text-slate-800">${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-500"><span>Tax</span><span>${viewingOrder.taxAmount.toFixed(2)}</span></div>
                {viewingOrder.discountAmount > 0 && <div className="flex justify-between text-slate-500"><span>Discount</span><span>-${viewingOrder.discountAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-1"><span>Total</span><span>${viewingOrder.totalAmount.toFixed(2)}</span></div>
              </div>

              {viewingOrder.status === "REFUNDED" ? (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-red-700 flex items-center gap-1.5"><RotateCcw size={14} /> Refunded {viewingOrder.refundedAt ? new Date(viewingOrder.refundedAt).toLocaleString() : ""}</p>
                  {viewingOrder.refundReason && <p className="text-red-600 mt-1">{viewingOrder.refundReason}</p>}
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
                  <label className="text-xs font-bold text-slate-500 uppercase">Refund Reason (optional)</label>
                  <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={2} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Customer changed their mind" />
                  <button
                    onClick={submitRefund}
                    disabled={isRefunding}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                  >
                    <RotateCcw size={16} /> {isRefunding ? "Processing..." : "Refund This Order"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Customers
// =====================================================================

function CustomersTab({ organizationId }: { organizationId: string }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const load = async () => {
    const rows = await getCustomers(organizationId);
    setCustomers(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search) || (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm({ name: "", phone: "", email: "", notes: "" });
    setError(null);
    setIsAddOpen(true);
  };

  const submit = async () => {
    setError(null);
    if (!form.name.trim()) { setError("Name is required."); return; }
    setIsSaving(true);
    try {
      const res = await createCustomer({ organizationId, name: form.name, phone: form.phone || undefined, email: form.email || undefined, notes: form.notes || undefined });
      if ((res as any)?.error) { setError((res as any).error); return; }
      setIsAddOpen(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Customers" value={String(totalCustomers)} />
        <StatCard label="Revenue from Customers" value={`$${totalRevenue.toFixed(2)}`} />
        <StatCard label="Loyalty Points Issued" value={String(totalPoints)} />
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Total Spent</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3 text-right">Last Visit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{customers.length === 0 ? "No customers yet — add your first one." : "No customers found."}</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} onClick={() => setViewingId(c.id)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{c.name.slice(0, 2).toUpperCase()}</div>
                      <span className="font-semibold text-slate-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.phone && <div className="flex items-center gap-1 text-xs"><Phone size={12} /> {c.phone}</div>}
                    {c.email && <div className="flex items-center gap-1 text-xs mt-0.5"><Mail size={12} /> {c.email}</div>}
                    {!c.phone && !c.email && "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{c.orderCount}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">${c.totalSpent.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><Star size={12} fill="currentColor" /> {c.loyaltyPoints}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 text-xs">{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Add Customer</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
              <input placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
              <input placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full p-2.5 border border-slate-200 rounded-lg" />
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submit} disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg">
                {isSaving ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingId && (
        <CustomerDetailModal organizationId={organizationId} customerDataId={viewingId} onClose={() => setViewingId(null)} onChanged={load} />
      )}
    </div>
  );
}

function CustomerDetailModal({ organizationId, customerDataId, onClose, onChanged }: {
  organizationId: string; customerDataId: string; onClose: () => void; onChanged: () => void;
}) {
  const [customer, setCustomer] = useState<any>(null);
  const [pointsDelta, setPointsDelta] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    const data = await getCustomer(organizationId, customerDataId);
    setCustomer(data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerDataId]);

  const applyPoints = async (sign: 1 | -1) => {
    const delta = parseInt(pointsDelta, 10);
    if (isNaN(delta) || delta <= 0) return;
    setIsSaving(true);
    try {
      await adjustLoyaltyPoints(customerDataId, delta * sign);
      setPointsDelta("");
      await load();
      onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete ${customer.name}?`)) return;
    const res = await deleteCustomer(customerDataId);
    if ((res as any)?.error) { alert((res as any).error); return; }
    onChanged();
    onClose();
  };

  if (!customer) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">{customer.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">{customer.name}</h3>
              <p className="text-xs text-slate-400">{customer.phone} {customer.phone && customer.email ? "·" : ""} {customer.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Orders</p>
              <p className="text-lg font-bold text-slate-800">{customer.orderCount}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Total Spent</p>
              <p className="text-lg font-bold text-slate-800">${customer.totalSpent.toFixed(2)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-amber-600">Loyalty Points</p>
              <p className="text-lg font-bold text-amber-700 flex items-center justify-center gap-1"><Star size={14} fill="currentColor" /> {customer.loyaltyPoints}</p>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Adjust Points</label>
              <input type="number" value={pointsDelta} onChange={(e) => setPointsDelta(e.target.value)} placeholder="e.g. 50" className="w-full mt-1 p-2 border border-slate-200 rounded-lg" />
            </div>
            <button onClick={() => applyPoints(1)} disabled={isSaving} className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold hover:bg-emerald-200 disabled:opacity-50"><Plus size={16} /></button>
            <button onClick={() => applyPoints(-1)} disabled={isSaving} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 disabled:opacity-50"><Minus size={16} /></button>
          </div>

          {customer.notes && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Notes</p>
              <p className="text-sm text-slate-700">{customer.notes}</p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Order History</h4>
            {customer.orders.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {customer.orders.map((o: any) => (
                  <div key={o.id} className="flex justify-between items-center text-sm border border-slate-100 rounded-lg px-3 py-2">
                    <div>
                      <p className="font-medium text-slate-700">{new Date(o.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400">{o.items.length} item{o.items.length === 1 ? "" : "s"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">${o.totalAmount.toFixed(2)}</p>
                      <span className={`text-xs font-medium ${o.status === "REFUNDED" ? "text-red-500" : "text-emerald-600"}`}>{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button onClick={remove} className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors">Delete Customer</button>
        </div>
      </div>
    </div>
  );
}
