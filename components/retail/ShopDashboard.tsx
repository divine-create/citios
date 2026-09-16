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
  MapPin,
  UserPlus,
  Settings as SettingsIcon,
  AlertTriangle,
  Circle,
  BarChart3,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import POSTerminal from "./POSTerminal";
import InventoryManager from "./InventoryManager";
import Settings from "./Settings";
import ShopOnboardingWidget from "./ShopOnboardingWidget";
import GlobalSearch from "./GlobalSearch";
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
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getStaff,
  addStaffMember,
  updateStaffRole,
  removeStaffMember,
  getShopReports,
  getRetailSettings,
  getShopNotifications,
  markShopNotificationsRead,
  exportShopReport,
} from "@/lib/actions/retail";
import { uploadAsset } from "@/lib/actions/microsite";
import DiscountsTab from "./DiscountsTab";
import OnlineStoreTab from "./OnlineStoreTab";

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const loadNotifications = async () => {
    const rows = await getShopNotifications(organizationId);
    setNotifications(rows);
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
    loadNotifications();
  };

  useEffect(() => {
    loadAll();
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
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const NAV_GROUPS: { label: string; items: { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; roles: string[] }[] }[] = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] },
        { label: "Reports", icon: BarChart3, roles: ["OWNER", "MANAGER"] },
      ],
    },
    {
      label: "Sell",
      items: [
        { label: "POS Terminal", icon: ShoppingCart, roles: ["OWNER", "MANAGER", "CASHIER"] },
        { label: "Sales & Returns", icon: ArrowRightLeft, roles: ["OWNER", "MANAGER", "CASHIER"] },
      ],
    },
    {
      label: "Catalog",
      items: [
        { label: "Products & Inventory", icon: Package, roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] },
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
        { label: "Locations", icon: MapPin, roles: ["OWNER", "MANAGER"] },
      ],
    },
    {
      label: "Grow",
      items: [
        { label: "Online Store", icon: Globe, roles: ["OWNER", "MANAGER"] },
      ],
    },
    {
      label: "Team",
      items: [
        { label: "Staff", icon: UserPlus, roles: ["OWNER", "MANAGER"] },
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
          {visibleGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">{group.label}</p>
              <ul className="space-y-1">
                {group.items.map((item) => (
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
            </div>
          ))}

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
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-500 w-72 ml-4">
              <button onClick={() => setSearchOpen(true)} className="w-full flex items-center gap-2 text-left">
                <Search size={16} />
                <span className="flex-1 text-slate-400">Search products, customers, orders...</span>
                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-white text-slate-400 text-xs font-mono border border-slate-200">⌘K</kbd>
              </button>
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
            
            <button onClick={() => setSearchOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors md:hidden">
              <Search size={20} />
            </button>

            <div className="relative">
              <button
                onClick={() => { setNotifOpen((o) => !o); if (!notifOpen) loadNotifications(); }}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors hidden sm:block"
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
                  <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
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
                            key={n.id}
                            onClick={() => markOneRead(n.id)}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${n.isRead ? "opacity-60" : ""}`}
                          >
                            <div className="flex items-start gap-2">
                              {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{n.title}</p>
                                {n.message && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                                <p className="text-[11px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

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
              {activeMenu === "Dashboard" && <DashboardView dashboard={dashboard} organizationId={organizationId} setActiveMenu={setActiveMenu} />}

              {activeMenu === "POS Terminal" && (
                openShiftData ? (
                  <POSTerminal organizationId={organizationId} products={products} shiftId={openShiftData.id} onOrderComplete={loadAll} />
                ) : (
                  <OpenShiftPrompt organizationId={organizationId} registers={registers} currentUserId={currentUserId} onOpened={loadAll} symbol={currencySymbol} />
                )
              )}

              {activeMenu === "Products & Inventory" && (
                <InventoryManager organizationId={organizationId} products={products} categories={categories} onChanged={loadAll} symbol={currencySymbol} />
              )}

              {activeMenu === "Cash & Shifts" && (
                <ShiftsTab organizationId={organizationId} registers={registers} openShift={openShiftData} currentUserId={currentUserId} onChanged={loadAll} symbol={currencySymbol} />
              )}

              {activeMenu === "Suppliers & POs" && <SuppliersTab organizationId={organizationId} symbol={currencySymbol} />}

              {activeMenu === "Expenses" && <ExpensesTab organizationId={organizationId} currentUserId={currentUserId} symbol={currencySymbol} />}

              {activeMenu === "Settings" && <Settings organizationId={organizationId} />}

              {activeMenu === "Sales & Returns" && <SalesReturnsTab organizationId={organizationId} currentUserId={currentUserId} onChanged={loadAll} symbol={currencySymbol} />}

              {activeMenu === "Customers" && <CustomersTab organizationId={organizationId} symbol={currencySymbol} />}

              {activeMenu === "Discounts" && <DiscountsTab organizationId={organizationId} symbol={currencySymbol} />}

              {activeMenu === "Online Store" && <OnlineStoreTab organizationId={organizationId} onChanged={loadAll} />}

              {activeMenu === "Locations" && <LocationsTab organizationId={organizationId} />}

              {activeMenu === "Staff" && <StaffTab organizationId={organizationId} userRole={userRole} />}

              {activeMenu === "Reports" && <ReportsTab organizationId={organizationId} setActiveMenu={setActiveMenu} />}
            </>
          )}
        </div>
      </main>

      {searchOpen && <GlobalSearch organizationId={organizationId} onClose={() => setSearchOpen(false)} onNavigate={(tab) => setActiveMenu(tab)} />}
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
// Dashboard (today's overview + real, derived activity)
// =====================================================================

function DashboardView({ dashboard, organizationId, setActiveMenu }: { dashboard: any; organizationId: string; setActiveMenu: (tab: string) => void }) {
  const symbol = dashboard?.settings?.currencySymbol ?? "$";
  const money = (v: number) => `${symbol}${(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const orderRef = (id: string) => `#${id.slice(0, 8)}`;

  return (
    <div className="p-8">
      {dashboard?.settings && (
        <ShopOnboardingWidget
          settings={dashboard.settings}
          organizationId={organizationId}
          onNavigate={(tab) => setActiveMenu(tab)}
        />
      )}

      <h2 className="text-2xl font-bold text-slate-800 mb-6">Today&apos;s Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        <StatCard label="Gross Sales" value={money(dashboard.grossSales)} />
        <StatCard label="Transactions" value={String(dashboard.transactions)} />
        <StatCard label="New Customers" value={String(dashboard.newCustomersToday)} />
        <StatCard label="Net Sales" value={money(dashboard.netSales)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Top Products</h3>
            <button onClick={() => setActiveMenu("Products & Inventory")} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              View all
            </button>
          </div>
          {dashboard.topProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No best sellers yet"
              message="Ring up your first sale at the register and your top products will appear here."
              cta="Open POS"
              onCta={() => setActiveMenu("POS Terminal")}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {dashboard.topProducts.map((p: any, i: number) => (
                <li key={p.productId} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.units} {p.units === 1 ? "unit" : "units"}</span>
                  <span className="text-sm font-bold text-slate-800 w-24 text-right">{money(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Recent Orders</h3>
            <button onClick={() => setActiveMenu("Sales & Returns")} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              View all
            </button>
          </div>
          {dashboard.recentOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No orders yet"
              message="Completed orders show up here so you can see activity at a glance."
              cta="Open POS"
              onCta={() => setActiveMenu("POS Terminal")}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {dashboard.recentOrders.map((o: any) => (
                <li key={o.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{orderRef(o.id)}</p>
                    <p className="text-xs text-slate-500 truncate">{o.cashierName} · {o.items.length} item{o.items.length === 1 ? "" : "s"}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${o.status === "REFUNDED" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{o.status}</span>
                  <span className="text-sm font-bold text-slate-800 w-20 text-right">{money(o.totalAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Inventory Watch</h3>
            <button onClick={() => setActiveMenu("Products & Inventory")} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              Manage stock
            </button>
          </div>
          {dashboard.lowStockProducts.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All stocked up" message="No products are at or below their low-stock threshold." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {dashboard.lowStockProducts.map((p: any) => (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                  <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                  <span className="text-xs text-slate-500">
                    {p.stockQuantity} {p.unit} left <span className="text-amber-600 font-semibold">(min {p.lowStockLevel})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4">Store at a Glance</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Products in catalog</dt>
              <dd className="font-bold text-slate-800">{dashboard.totalProducts}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">All-time orders</dt>
              <dd className="font-bold text-slate-800">{dashboard.totalCompletedOrders} completed</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Refunded orders</dt>
              <dd className="font-bold text-slate-800">{dashboard.totalOrders - dashboard.totalCompletedOrders}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Register</dt>
              <dd className="font-bold">
                {dashboard.openShift ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {dashboard.openShift.registerName} OPEN</span>
                ) : (
                  <span className="text-slate-400">No register open</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4">Launch Checklist</h3>
          <ul className="space-y-2.5">
            {[
              { done: dashboard.settings?.hasProducts, label: "Add products to your store", tab: "Products & Inventory" },
              { done: dashboard.settings?.hasSetPayment, label: "Set up how you receive payments", tab: "Settings" },
              { done: dashboard.settings?.hasShippingPrices, label: "Add shipping prices to your website", tab: "Settings" },
              { done: dashboard.settings?.hasStoreInfo, label: "Complete store information", tab: "Settings" },
            ].map((step) => (
              <li key={step.label} className="flex items-center gap-2.5">
                {step.done ? <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" /> : <Circle size={16} className="text-slate-300 flex-shrink-0" />}
                <span className={`text-sm flex-1 ${step.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{step.label}</span>
                {!step.done && <button onClick={() => setActiveMenu(step.tab)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Do it</button>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Empty state (shared — "never faked" rules: only rendered with no data)
// =====================================================================

function EmptyState({ icon: Icon, title, message, cta, onCta }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  message: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <Icon size={22} className="text-slate-400" />
      </div>
      <p className="font-bold text-slate-700">{title}</p>
      <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">{message}</p>
      {cta && onCta && (
        <button onClick={onCta} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition-colors">
          {cta} <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

// =====================================================================
// Open Shift prompt (POS is gated behind an open register shift)
// =====================================================================

function OpenShiftPrompt({ organizationId, registers, currentUserId, onOpened, symbol = "$" }: {
  organizationId: string; registers: any[]; currentUserId: string; onOpened: () => void; symbol?: string;
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
      const res = await openShift({ organizationId, registerId, openingFloat: float });
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
          <label className="text-xs font-bold text-slate-500 uppercase">Opening Cash Float ({symbol})</label>
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

function ShiftsTab({ organizationId, registers, openShift: openShiftData, currentUserId, onChanged, symbol = "$" }: {
  organizationId: string; registers: any[]; openShift: any | null; currentUserId: string; onChanged: () => void; symbol?: string;
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
      const res = await closeShift(openShiftData.id, { actualCash: cash });
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
              <p className="text-sm text-slate-500">Opening float: {symbol}{openShiftData.openingFloat.toFixed(2)}</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">OPEN</span>
          </div>

          {result ? (
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Expected Cash</span><span className="font-semibold">{symbol}{result.expectedCash.toFixed(2)}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">Discrepancy</span>
                <span className={`font-semibold ${result.discrepancy === 0 ? "text-slate-700" : result.discrepancy > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {result.discrepancy > 0 ? "+" : ""}{symbol}{result.discrepancy.toFixed(2)}
                </span>
              </div>
              <p className="text-emerald-600 font-medium pt-1 flex items-center gap-1"><CheckCircle2 size={14} /> Shift closed.</p>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Counted Cash in Drawer ({symbol})</label>
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
                    <td className="px-4 py-3 text-right">{symbol}{s.openingFloat.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{s.discrepancy != null ? `${symbol}${s.discrepancy.toFixed(2)}` : "—"}</td>
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

function SuppliersTab({ organizationId, symbol = "$" }: { organizationId: string; symbol?: string }) {
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
                    <td className="px-4 py-3 text-right">{po.totalAmount != null ? `${symbol}${po.totalAmount.toFixed(2)}` : "—"}</td>
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
              <input type="number" step="0.01" placeholder={`Total amount (${symbol})`} value={poForm.totalAmount} onChange={(e) => setPoForm((f) => ({ ...f, totalAmount: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
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

function ExpensesTab({ organizationId, currentUserId, symbol = "$" }: { organizationId: string; currentUserId: string; symbol?: string }) {
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
        <StatCard label="This Month" value={`${symbol}${summary.totalThisMonth.toFixed(2)}`} />
        <StatCard label="Expenses This Month" value={String(summary.countThisMonth)} />
        <StatCard label="All Time Total" value={`${symbol}${summary.totalAllTime.toFixed(2)}`} />
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
                <span className="w-20 text-right text-sm font-semibold text-slate-700 flex-shrink-0">{symbol}{amount.toFixed(2)}</span>
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
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{symbol}{e.amount.toFixed(2)}</td>
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
                  <label className="text-xs font-bold text-slate-500 uppercase">Amount ({symbol})</label>
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
// Reports (real derived figures: products, cashiers, customers, stock)
// =====================================================================

function ReportsTab({ organizationId, setActiveMenu }: { organizationId: string; setActiveMenu: (tab: string) => void }) {
  const [reports, setReports] = useState<any>(null);
  const [symbol, setSymbol] = useState("$");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const load = async () => {
    const r = await getShopReports(organizationId);
    const s = await getRetailSettings(organizationId);
    setReports(r);
    setSymbol(s?.currencySymbol ?? "$");
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  if (loading || !reports) {
    return <div className="p-10 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> Loading...</div>;
  }

  const money = (v: number) => `${symbol}${(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const { periods, salesByProduct, salesByCashier, topCustomers, lowStock, totals } = reports;
  const net = totals.gross - totals.refunded;

  const downloadCsv = async (kind: "orders" | "products" | "customers", filename: string) => {
    const rows = await exportShopReport(organizationId, kind);
    if (rows.length === 0) { alert("Nothing to export yet."); return; }
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...rows.map((r: Record<string, unknown>) => headers.map((h) => esc(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doExport = async (kind: "orders" | "products" | "customers") => {
    setExporting(kind);
    try {
      await downloadCsv(kind, `shopos-${kind}-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
          <p className="text-sm text-slate-500 mt-1">Real sales figures from your stores — no estimates.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => doExport("orders")} disabled={exporting !== null} className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            {exporting === "orders" ? <Loader2 size={14} className="animate-spin" /> : null} Orders CSV
          </button>
          <button onClick={() => doExport("products")} disabled={exporting !== null} className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            {exporting === "products" ? <Loader2 size={14} className="animate-spin" /> : null} Products CSV
          </button>
          <button onClick={() => doExport("customers")} disabled={exporting !== null} className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            {exporting === "customers" ? <Loader2 size={14} className="animate-spin" /> : null} Customers CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Today", ...periods.today },
          { label: "Last 7 Days", ...periods.sevenDays },
          { label: "Last 30 Days", ...periods.thirtyDays },
        ].map((p) => (
          <div key={p.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{p.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{money(p.sales)}</p>
            <p className="text-xs text-slate-400 mt-1">{p.transactions} transaction{p.transactions === 1 ? "" : "s"} · {money(p.refunds)} refunded</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Gross Sales" value={money(totals.gross)} />
        <StatCard label="Net Sales" value={money(net)} />
        <StatCard label="Orders" value={`${totals.completedCount}`} />
        <StatCard label="Refunds" value={`${totals.refundedCount}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Top Products</h3>
          </div>
          {salesByProduct.length === 0 ? (
            <EmptyState icon={Package} title="No sales yet" message="Products you sell appear here ranked by revenue." cta="Open POS" onCta={() => setActiveMenu("POS Terminal")} />
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr><th className="px-5 py-2">Product</th><th className="px-5 py-2 text-right">Units</th><th className="px-5 py-2 text-right">Revenue</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesByProduct.slice(0, 8).map((p: any, i: number) => (
                  <tr key={p.productId} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                        <span className="font-semibold text-slate-800">{p.name}</span>
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-500">{p.units} {p.unit}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-slate-800">{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Sales by Cashier</h3>
          </div>
          {salesByCashier.length === 0 ? (
            <EmptyState icon={User} title="No sales yet" message="Cashier performance appears once orders are recorded." cta="Open POS" onCta={() => setActiveMenu("POS Terminal")} />
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr><th className="px-5 py-2">Cashier</th><th className="px-5 py-2 text-right">Orders</th><th className="px-5 py-2 text-right">Revenue</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesByCashier.map((c: any) => (
                  <tr key={c.cashierId} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-semibold text-slate-800">{c.cashierName}</td>
                    <td className="px-5 py-2.5 text-right text-slate-500">{c.orders}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-slate-800">{money(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Top Customers</h3>
          </div>
          {topCustomers.length === 0 ? (
            <EmptyState icon={Users} title="No customers yet" message="Your highest-spending customers appear here." cta="Add a customer" onCta={() => setActiveMenu("Customers")} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {topCustomers.map((c: any) => (
                <li key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{c.name.slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.orderCount} order{c.orderCount === 1 ? "" : "s"} · {c.loyaltyPoints} pts</p>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{money(c.totalSpent)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Low Stock</h3>
            <button onClick={() => setActiveMenu("Products & Inventory")} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Manage</button>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All stocked up" message="Nothing is at or below its low-stock threshold." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((p: any) => (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                  <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.stockQuantity} {p.unit} · min {p.lowStockLevel}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Sales & Returns
// =====================================================================

function SalesReturnsTab({ organizationId, currentUserId, onChanged, symbol = "$" }: { organizationId: string; currentUserId: string; onChanged: () => void; symbol?: string }) {
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
      const res = await refundOrder(viewingOrder.id, { reason: refundReason || undefined });
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
        <StatCard label="Completed Sales" value={`${symbol}${totalSales.toFixed(2)}`} />
        <StatCard label="Refunded" value={`${symbol}${totalRefunded.toFixed(2)}`} />
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
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{symbol}{o.totalAmount.toFixed(2)}</td>
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
                    <span className="font-semibold text-slate-800">{symbol}{item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-500"><span>Tax</span><span>{symbol}{viewingOrder.taxAmount.toFixed(2)}</span></div>
                {viewingOrder.discountAmount > 0 && <div className="flex justify-between text-slate-500"><span>Discount</span><span>-{symbol}{viewingOrder.discountAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-1"><span>Total</span><span>{symbol}{viewingOrder.totalAmount.toFixed(2)}</span></div>
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

function CustomersTab({ organizationId, symbol = "$" }: { organizationId: string; symbol?: string }) {
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
        <StatCard label="Revenue from Customers" value={`${symbol}${totalRevenue.toFixed(2)}`} />
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
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{symbol}{c.totalSpent.toFixed(2)}</td>
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
        <CustomerDetailModal organizationId={organizationId} customerDataId={viewingId} onClose={() => setViewingId(null)} onChanged={load} symbol={symbol} />
      )}
    </div>
  );
}

function CustomerDetailModal({ organizationId, customerDataId, onClose, onChanged, symbol = "$" }: {
  organizationId: string; customerDataId: string; onClose: () => void; onChanged: () => void; symbol?: string;
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
              <p className="text-lg font-bold text-slate-800">{symbol}{customer.totalSpent.toFixed(2)}</p>
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
                      <p className="font-bold text-slate-800">{symbol}{o.totalAmount.toFixed(2)}</p>
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

// =====================================================================
// Locations
// =====================================================================

function LocationsTab({ organizationId }: { organizationId: string }) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    const rows = await getLocations(organizationId);
    setLocations(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", address: "" });
    setError(null);
    setIsAddOpen(true);
  };

  const openEdit = (l: any) => {
    setEditId(l.id);
    setForm({ name: l.name, address: l.address ?? "" });
    setError(null);
    setIsAddOpen(true);
  };

  const submit = async () => {
    setError(null);
    if (!form.name.trim()) { setError("Location name is required."); return; }
    setIsSaving(true);
    try {
      if (editId) {
        const res = await updateLocation(editId, { name: form.name, address: form.address || null });
        if ((res as any)?.error) { setError((res as any).error); return; }
      } else {
        const res = await createLocation({ organizationId, name: form.name, address: form.address || undefined });
        if ((res as any)?.error) { setError((res as any).error); return; }
      }
      setForm({ name: "", address: "" });
      setIsAddOpen(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this location?")) return;
    const res = await deleteLocation(id);
    if ((res as any)?.error) { alert((res as any).error); return; }
    load();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Locations</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
          <Plus size={16} /> Add Location
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Address</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Loading...</td></tr>
            ) : locations.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No locations yet — add your first branch.</td></tr>
            ) : (
              locations.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{l.name}</td>
                  <td className="px-4 py-3 text-slate-500">{l.address ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(l)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => remove(l.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
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
              <h3 className="font-bold text-lg text-slate-800">{editId ? "Edit Location" : "Add Location"}</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
              <input placeholder="Location name (e.g. Main Street)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" autoFocus />
              <textarea placeholder="Address (optional)" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} className="w-full p-2.5 border border-slate-200 rounded-lg" />
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submit} disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg">
                {isSaving ? "Saving..." : "Save Location"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Staff
// =====================================================================

const STAFF_ROLE_OPTIONS = ["MANAGER", "CASHIER", "INVENTORY_STAFF"];

function StaffTab({ organizationId, userRole }: { organizationId: string; userRole: string }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "CASHIER" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    const rows = await getStaff(organizationId);
    setStaff(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const canManage = ["OWNER", "ADMIN", "MANAGER"].includes(userRole);

  const submit = async () => {
    setError(null);
    if (!form.email.trim()) { setError("Email is required."); return; }
    setIsSaving(true);
    try {
      const res = await addStaffMember({ organizationId, email: form.email, name: form.name || undefined, role: form.role });
      if ((res as any)?.error) { setError((res as any).error); return; }
      setForm({ email: "", name: "", role: "CASHIER" });
      setIsAddOpen(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const changeRole = async (membershipId: string, role: string) => {
    setSavingId(membershipId);
    setError(null);
    try {
      const res = await updateStaffRole({ organizationId, membershipId, role });
      if ((res as any)?.error) { alert((res as any).error); return; }
      load();
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (membershipId: string, name: string) => {
    if (!confirm(`Remove ${name} from this store?`)) return;
    const res = await removeStaffMember({ organizationId, membershipId });
    if ((res as any)?.error) { alert((res as any).error); return; }
    load();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Staff</h2>
        <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Roles</th>{canManage && <th className="px-4 py-3 text-right">Actions</th>}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-6 text-center text-slate-400">Loading...</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-6 text-center text-slate-400">No staff yet.</td></tr>
            ) : (
              staff.map((s) => {
                const shopRole = STAFF_ROLE_OPTIONS.find((r) => s.roles.includes(r));
                const isOwner = s.roles.includes("OWNER");
                return (
                  <tr key={s.membershipId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold flex-shrink-0">{s.name.slice(0, 2).toUpperCase()}</div>
                        <span className="font-semibold text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.roles.map((r: string) => (
                          <span key={r} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r === "OWNER" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{r === "INVENTORY_STAFF" ? "Inventory Staff" : r}</span>
                        ))}
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!isOwner && shopRole && (
                            <select
                              value={shopRole}
                              disabled={savingId === s.membershipId}
                              onChange={(e) => changeRole(s.membershipId, e.target.value)}
                              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white disabled:opacity-50"
                            >
                              {STAFF_ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r === "INVENTORY_STAFF" ? "Inventory Staff" : r.charAt(0) + r.slice(1).toLowerCase()}</option>
                              ))}
                            </select>
                          )}
                          {isOwner && <span className="text-xs text-amber-600 font-semibold">Owner</span>}
                          {!isOwner && (
                            <button onClick={() => remove(s.membershipId, s.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Remove from store">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 max-w-lg">
        New staff sign in with the email you add here — they can use Google sign-in or the demo password login in development.
        They&apos;ll land on the ShopOS dashboard automatically.
      </p>

      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Add Staff Member</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
              <input placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" autoFocus />
              <input placeholder="Full name (optional)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg" />
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full p-2.5 border border-slate-200 rounded-lg bg-white">
                {STAFF_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r === "INVENTORY_STAFF" ? "Inventory Staff" : r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submit} disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg">
                {isSaving ? "Saving..." : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
