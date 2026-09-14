"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Wrench,
  FileText,
  Users,
  Briefcase,
  Settings,
  Bell,
  Search,
  User,
  Plus,
  ChevronRight,
  Menu,
  CheckCircle2,
  X,
  CreditCard
} from "lucide-react";
import { getServiceSettings, getOrgCustomers, getServiceCatalogItems, getServiceAppointments, getServiceJobs, getServiceStaff } from "@/lib/actions/service";
import CustomersTab from "./CustomersTab";
import CalendarTab from "./CalendarTab";
import SettingsTab from "./SettingsTab";
import ServicesTab from "./ServicesTab";
import JobsTab from "./JobsTab";
import FinanceTab from "./FinanceTab";
import DashboardTab from "./DashboardTab";

const MENU_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { label: "Calendar", icon: CalendarDays, id: "calendar" },
  { label: "Jobs", icon: Wrench, id: "jobs" },
  { label: "Quotes & Invoices", icon: FileText, id: "finance" },
  { label: "Customers", icon: Users, id: "customers" },
  { label: "Services & Staff", icon: Briefcase, id: "services" },
];

export default function ServiceDashboard({
  organizationId,
  userRole,
  currentUserId,
}: {
  organizationId: string;
  userRole: string;
  currentUserId: string;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [settings, setSettings] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [organizationId]);

  const loadAll = async () => {
    setLoading(true);
    const [s, custs, apts, jbs, srvs, stf] = await Promise.all([
      getServiceSettings(organizationId),
      getOrgCustomers(organizationId),
      getServiceAppointments(organizationId),
      getServiceJobs(organizationId),
      getServiceCatalogItems(organizationId),
      getServiceStaff(organizationId),
    ]);
    setSettings(s);
    setCustomers(custs);
    setAppointments(apts);
    setJobs(jbs);
    setServices(srvs);
    setStaff(stf);
    setLoading(false);
  };

  const visibleMenuItems = MENU_ITEMS.filter((item) => {
    if (item.id === "jobs" && settings && !settings.jobsEnabled) return false;
    if (item.id === "finance" && settings && (!settings.quotesEnabled && !settings.jobsEnabled)) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F7FC]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F4F7FC] text-slate-800 font-sans overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 md:z-20 bg-white text-slate-800 border-r border-slate-200 flex-shrink-0 transition-all duration-300 overflow-y-auto ${
          isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:translate-x-0 md:w-0"
        }`}
      >
        <div className="p-5 flex items-center gap-3 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">ServiceOS</span>
        </div>

        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Management</p>
          <ul className="space-y-1">
            {visibleMenuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveMenu(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
                    activeMenu === item.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <item.icon size={18} className={activeMenu === item.id ? "text-blue-600" : "text-slate-400"} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">System</p>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setActiveMenu("settings")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
                    activeMenu === "settings"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Settings size={18} className={activeMenu === "settings" ? "text-blue-600" : "text-slate-400"} />
                  Settings
                </button>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:flex items-center bg-slate-100 px-3 py-2 rounded-lg w-64 border border-transparent focus-within:border-blue-300 focus-within:bg-white transition-colors">
              <Search size={16} className="text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 relative text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="h-8 w-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold border border-blue-200">
              <User size={16} />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeMenu === "dashboard" && <DashboardTab organizationId={organizationId} customers={customers} appointments={appointments} jobs={jobs} />}
            {activeMenu === "calendar" && <CalendarTab organizationId={organizationId} appointments={appointments} staff={staff} services={services} customers={customers} onRefresh={loadAll} />}
            {activeMenu === "jobs" && <JobsTab organizationId={organizationId} jobs={jobs} services={services} staff={staff} customers={customers} onRefresh={loadAll} />}
            {activeMenu === "finance" && <FinanceTab organizationId={organizationId} customers={customers} onRefresh={loadAll} />}
            {activeMenu === "customers" && <CustomersTab organizationId={organizationId} customers={customers} onRefresh={loadAll} />}
            {activeMenu === "services" && <ServicesTab organizationId={organizationId} services={services} staff={staff} onRefresh={loadAll} />}
            {activeMenu === "settings" && <SettingsTab organizationId={organizationId} settings={settings} onRefresh={loadAll} />}
          </div>
        </div>
      </main>
    </div>
  );
}
