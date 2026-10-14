"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Store,
  DollarSign,
  ArrowRightLeft,
  Truck,
  ChevronDown,
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
  MapPin,
  UserPlus,
  Settings as SettingsIcon,
  AlertTriangle,
  Circle,
  BarChart3,
  Pencil, ClipboardList,
  TrendingUp,
  Printer,
} from "lucide-react";
import ThermalReceiptModal from "@/components/common/ThermalReceiptModal";
import { playOrderChime } from "@/lib/audio";
import AudioAlertToggle from "@/components/common/AudioAlertToggle";
import Link from "next/link";
import { useAccountSwitcher } from "@/components/cityos/AccountSwitcherContext";
import { cn } from "@/lib/utils";
import {
  StatusPill,
  Avatar,
  ProgressBar,
  SectionCard,
  EmptyState,
  Modal,
  Kbd,
  btnPrimary,
  btnOutline,
  inputCls,
  selectCls,
TableSkeleton,
} from "./ShopUI";
import { getProfileAndWallet } from "@/lib/actions/profile";
import POSTerminal from "./POSTerminal";
import InventoryManager from "./InventoryManager";
import InventoryTab from "./InventoryTab";
import Settings from "./Settings";
import ShopOnboardingWidget from "./ShopOnboardingWidget";
import GlobalSearch from "./GlobalSearch";
import AnalyticsTab from './AnalyticsTab';
import { getShopDashboardData, getProducts, getCategories, getRegisters, openShift, closeShift, getShiftHistory, createRegister, getExpenses, createExpense, deleteExpense, getExpenseSummary, getOrders, refundOrder, cancelOrder, getCustomers, getCustomer, createCustomer, deleteCustomer, adjustLoyaltyPoints, getLocations, createLocation, updateLocation, deleteLocation, getStaff, addStaffMember, updateStaffRole, removeStaffMember, getShopReports, getRetailSettings, getShopNotifications, markShopNotificationsRead, exportShopReport } from '@/lib/actions/retail'
import { getSuppliers, createSupplier, deleteSupplier, getPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus } from '@/lib/actions/procurement';
import { getCityRegistry } from "@/app/actions/city";
import { uploadAsset } from "@/lib/actions/microsite";
import DiscountsTab from "./DiscountsTab";
import OnlineStoreTab from "./OnlineStoreTab";
import OnlineOrdersTab from "./OnlineOrdersTab";
import { DashboardView } from "./DashboardView";
import { OpenShiftPrompt } from "./OpenShiftPrompt";
import { ShiftsTab } from "./ShiftsTab";
import { SuppliersTab } from "./SuppliersTab";
import { ExpensesTab } from "./ExpensesTab";
import { SalesReturnsTab } from "./SalesReturnsTab";
import { CustomersTab } from "./CustomersTab";

interface ShopDashboardProps {
  organizationId: string;
  userRole: "OWNER" | "MANAGER" | "CASHIER" | "INVENTORY_STAFF";
  currentUserId: string;
}

export default function ShopDashboard({ organizationId, userRole, currentUserId }: ShopDashboardProps) {
  const { switchToPersonal } = useAccountSwitcher();
  const [activeMenu, setActiveMenu] = useState(() => {
    if (userRole === "CASHIER") return "POS Terminal";
    if (userRole === "INVENTORY_STAFF") return "Products & Inventory";
    return "Dashboard";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const isGroupCollapsed = (label: string) => collapsedGroups.has(label);
  const toggleGroup = (label: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  const [salesShiftFilter, setSalesShiftFilter] = useState<string | null>(null);
  const [orderActionLoading, setOrderActionLoading] = useState<string | null>(null);
  
  const handleCancelOrder = async (id: string) => {
    setOrderActionLoading(id);
    await cancelOrder(id, { reason: 'Merchant requested' });
    setOrderActionLoading(null);
    setDashboard({ ...dashboard, orders: dashboard.orders.map((o: any) => o.id === id ? { ...o, status: 'CANCELLED' } : o) });
  };
  
  const handleRefundOrder = async (id: string) => {
    setOrderActionLoading(id);
    await refundOrder(id, { reason: 'Merchant requested' });
    setOrderActionLoading(null);
    setDashboard({ ...dashboard, orders: dashboard.orders.map((o: any) => o.id === id ? { ...o, refundedAt: new Date().toISOString() } : o) });
  };
  const [dashboard, setDashboard] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sessionName, setSessionName] = useState("Store User");
  const [sessionEmail, setSessionEmail] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const profile = await getProfileAndWallet();
      if (profile?.user?.name) {
        setSessionName(profile.user.name);
        setSessionEmail(profile.user.email ?? "");
      }
    })();
  }, []);

  const previousUnreadRef = useRef<number | null>(null);

  const loadNotifications = async () => {
    try {
      const rows = await getShopNotifications(organizationId);
      const unread = (rows as {isRead?: boolean}[]).filter(n => !n.isRead).length;
      if (previousUnreadRef.current !== null && unread > previousUnreadRef.current) {
        playOrderChime();
      }
      previousUnreadRef.current = unread;
      setNotifications(rows);
    } catch {
      // Non-fatal
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    await markShopNotificationsRead(organizationId);
    loadNotifications();
  };

  const markOneRead = async (id: string) => {
    await markShopNotificationsRead(organizationId, id);
    loadNotifications();
  };

  const loadAll = async () => {
    const locs = await getLocations(organizationId);
    setLocations(locs);
    const locToUse = activeLocationId || (locs.length > 0 ? locs[0].id : null);
    if (!activeLocationId && locToUse) setActiveLocationId(locToUse);

    const [dash, prods, cats, regs] = await Promise.all([
      getShopDashboardData(organizationId, locToUse),
      getProducts(organizationId, locToUse),
      getCategories(organizationId),
      getRegisters(organizationId, locToUse),
    ]);
    setDashboard(dash);
    setProducts(prods);
    setCategories(cats);
    setRegisters(regs);
    setLoading(false);
    loadNotifications();
  };

  useEffect(() => {
    loadAll();
    const notifTimer = setInterval(loadNotifications, 15_000);
    if (window.matchMedia("(max-width: 767px)").matches) setIsSidebarOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      } else if (e.key === "/" && !searchOpen && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(notifTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const NAV_GROUPS: { label: string; items: { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; roles: string[] }[] }[] = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] },
        { label: "Analytics", icon: BarChart3, roles: ["OWNER", "MANAGER"] },
      ],
    },
    {
      label: "Sell",
      items: [
        { label: "POS Terminal", icon: ShoppingCart, roles: ["OWNER", "MANAGER", "CASHIER"] },
        { label: "Sales & Returns", icon: ArrowRightLeft, roles: ["OWNER", "MANAGER", "CASHIER"] },
          { label: "Online Orders", icon: Package, roles: ["OWNER", "MANAGER", "CASHIER"] },
      ],
    },
    {
      label: "Catalog",
      items: [
        { label: "Products", icon: Package, roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] },
          { label: "Inventory", icon: ClipboardList, roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] },
      ],
    },
    {
      label: "Customers",
      items: [
        { label: "Customers", icon: Users, roles: ["OWNER", "MANAGER", "CASHIER"] },
        { label: "Discounts", icon: Star, roles: ["OWNER", "MANAGER"] },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Cash & Shifts", icon: Store, roles: ["OWNER", "MANAGER", "CASHIER"] },
        { label: "Suppliers & POs", icon: Truck, roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] },
        { label: "Expenses", icon: DollarSign, roles: ["OWNER", "MANAGER"] },
        ],
    },
    {
      label: "Grow",
      items: [
        { label: "Online Store", icon: Globe, roles: ["OWNER", "MANAGER"] },
      ],
    },
    {
      label: "Admin",
      items: [
        { label: "Settings", icon: SettingsIcon, roles: ["OWNER", "MANAGER"] },
      ],
    },
  ];

  const visibleGroups = NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(userRole)) }))
    .filter((group) => group.items.length > 0);
  const openShiftData = dashboard?.openShift ?? null;
  const currencySymbol = dashboard?.settings?.currencySymbol ?? "$";
  const roleLabel = userRole === "OWNER" ? "Store Owner" : userRole === "MANAGER" ? "Store Manager" : userRole === "CASHIER" ? "Cashier" : "Inventory";

  return (
    <div className="flex h-full flex-1 bg-[#FAFAFA] text-slate-800 font-sans overflow-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 md:z-20 bg-white text-slate-800 border-r border-slate-200 flex-shrink-0 transition-all duration-300 overflow-y-auto flex flex-col ${
          isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:translate-x-0 md:w-0"
        }`}
      >
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm shadow-brand-600/30 flex-shrink-0">S</div>
              <div className="leading-tight">
                <span className="font-black text-lg text-ink tracking-tight block">CityMart</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retail Suite</span>
              </div>
            </div>
            {locations.length > 0 && (
              <div className="mt-2 w-full">
                <select
                  value={activeLocationId || ""}
                  onChange={(e) => {
                    setActiveLocationId(e.target.value);
                    setLoading(true);
                  }}
                  className={selectCls}
                >
                  <option value="" disabled>Select Location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors md:hidden"
            title="Close Menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-4">
          {visibleGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between group/edit text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-2 hover:text-slate-600"
              >
                {group.label}
                <ChevronDown
                  size={14}
                  className={`text-slate-300 transition-transform duration-200 ${isGroupCollapsed(group.label) ? "-rotate-90" : ""}`}
                />
              </button>
              {!isGroupCollapsed(group.label) && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <button
                        onClick={() => {
                          setActiveMenu(item.label);
                          if (window.matchMedia("(max-width: 767px)").matches) setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeMenu === item.label
                            ? "bg-brand-50 text-brand-800"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <item.icon size={18} className={activeMenu === item.label ? "text-brand-700" : "text-slate-400"} />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {["OWNER", "MANAGER"].includes(userRole) && (
            <>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-6 mb-1.5 px-2 pt-4 border-t border-slate-100">Online Store</p>
              <Link
                href={`/business/website?org=${organizationId}`}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <Globe size={18} className="text-slate-400" />
                Website Builder
              </Link>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white space-y-3">
          <Link
            href={`/org/${organizationId}`}
            className="w-full sm:hidden flex flex-row items-center justify-center gap-2 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors"
          >
            <Store size={13} className="text-teal-600" />
            <span>View Public Store</span>
          </Link>
          <div
            className={`w-full md:hidden flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              openShiftData ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${openShiftData ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            {openShiftData ? `${openShiftData.registerName}: OPEN` : "No Register Open"}
          </div>
          <button
            type="button"
            onClick={switchToPersonal}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors"
          >
            <ArrowRightLeft size={13} className="text-slate-500" />
            <span>Personal Profile</span>
          </button>
          <div className="flex items-center gap-3">
            <Avatar name={sessionName} tone="brand" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink truncate">{sessionName}</p>
              <p className="text-[11px] text-slate-400 truncate">{roleLabel}</p>
            </div>
            <StatusPill tone={userRole === "OWNER" ? "brand" : userRole === "MANAGER" ? "amber" : "slate"}>
              {userRole === "OWNER" ? "Owner" : userRole === "MANAGER" ? "Manager" : "Staff"}
            </StatusPill>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA]">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-3 sm:px-4 lg:px-8 flex-shrink-0 z-10">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
              title="Toggle Menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-bold text-base sm:text-lg text-slate-800 truncate max-w-[140px] sm:max-w-none">{activeMenu}</h1>
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 w-72 ml-4 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20 transition-all">
              <button onClick={() => setSearchOpen(true)} className="w-full flex items-center gap-2 text-left">
                <Search size={16} />
                <span className="flex-1 text-slate-400">Search products, customers, orders...</span>
                <Kbd>⌘K</Kbd>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={switchToPersonal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              title="Exit to personal citizen profile"
            >
              <ArrowRightLeft size={13} className="text-slate-500" />
              <span>Personal Account</span>
            </button>
            <Link
              href={`/org/${organizationId}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-colors"
              title="View customer-facing store page"
            >
              <Store size={13} className="text-teal-600" />
              <span>Public Store</span>
            </Link>

            <div
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                openShiftData ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${openShiftData ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {openShiftData ? `${openShiftData.registerName}: OPEN` : "No Register Open"}
            </div>
            
            <button onClick={() => setSearchOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors md:hidden">
              <Search size={20} />
            </button>

            <AudioAlertToggle showTestButton={false} />

            <div className="relative">
              <button
                onClick={() => { setNotifOpen((o) => !o); if (!notifOpen) loadNotifications(); }}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors block"
                title="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs font-bold text-brand-700 hover:text-brand-800 transition-colors">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet.</p>
                      ) : (
                        notifications.slice(0, 30).map((n) => (
                          <button
                            key={n.slug}
                            onClick={() => markOneRead(n.slug)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors block"
                          >
                            <p className="text-xs font-bold text-slate-800">{n.title}</p>
                            {n.message && <p className="text-[11px] text-slate-500 mt-0.5">{n.message}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleTimeString()}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="hidden sm:block">
              <Avatar name={sessionName} tone="brand" />
            </div>
          </div>
        </header>

        <div className={cn("flex-1", activeMenu === "POS Terminal" ? "overflow-hidden flex flex-col min-h-0" : "overflow-auto")}>
          {loading ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3 animate-in fade-in duration-500"><Loader2 className="animate-spin text-brand-500" size={32} /><p className="font-medium text-sm">Loading workspace...</p></div>
          ) : (
            <>
              {activeMenu === "Dashboard" && <DashboardView dashboard={dashboard} organizationId={organizationId} setActiveMenu={setActiveMenu} />}

              {activeMenu === "POS Terminal" && (
                openShiftData ? (
                  <POSTerminal organizationId={organizationId} locationId={activeLocationId} products={products} shiftId={openShiftData.id} onOrderComplete={loadAll} />
                ) : (
                  <OpenShiftPrompt organizationId={organizationId} locationId={activeLocationId} registers={registers} currentUserId={currentUserId} onOpened={loadAll} symbol={currencySymbol} />
                )
              )}

              {activeMenu === "Products & Inventory" && (
                <InventoryManager organizationId={organizationId} locationId={activeLocationId} products={products} categories={categories} onChanged={loadAll} symbol={currencySymbol} />
              )}

              {activeMenu === "Cash & Shifts" && (
                <ShiftsTab organizationId={organizationId} locationId={activeLocationId} registers={registers} openShift={openShiftData} currentUserId={currentUserId} onChanged={loadAll} symbol={currencySymbol} setActiveMenu={setActiveMenu} setSalesShiftFilter={setSalesShiftFilter} />
              )}

              {activeMenu === "Suppliers & POs" && <SuppliersTab organizationId={organizationId} symbol={currencySymbol} />}

              {activeMenu === "Expenses" && <ExpensesTab organizationId={organizationId} currentUserId={currentUserId} symbol={currencySymbol} />}

              {activeMenu === "Settings" && <Settings organizationId={organizationId} userRole={userRole} />}

              {activeMenu === "Online Orders" && <OnlineOrdersTab organizationId={organizationId} locationId={activeLocationId} />}

              {activeMenu === "Sales & Returns" && (
                <SalesReturnsTab organizationId={organizationId} locationId={activeLocationId} currentUserId={currentUserId} onChanged={loadAll} symbol={currencySymbol} salesShiftFilter={salesShiftFilter} setSalesShiftFilter={setSalesShiftFilter} />
              )}

              {activeMenu === "Customers" && <CustomersTab organizationId={organizationId} symbol={currencySymbol} />}

              {activeMenu === "Discounts" && <DiscountsTab organizationId={organizationId} symbol={currencySymbol} />}

              {activeMenu === "Online Store" && <OnlineStoreTab organizationId={organizationId} onChanged={loadAll} />}

              {activeMenu === "Analytics" && <AnalyticsTab locationId={activeLocationId} organizationId={organizationId} />}
            </>
          )}
        </div>
      </main>

      {searchOpen && <GlobalSearch organizationId={organizationId} onClose={() => setSearchOpen(false)} onNavigate={(tab) => setActiveMenu(tab)} />}
    </div>
  );
}
