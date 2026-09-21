"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ConciergeBell,
  CalendarDays,
  KeyRound,
  Users,
  Sparkles,
  Wrench,
  Coffee,
  Globe,
  LogOut,
  MoonStar,
  Bell,
  User,
  Search,
  Menu,
} from "lucide-react";
import Link from "next/link";
import FrontDesk from "./FrontDesk";
import HousekeepingDashboard from "./HousekeepingDashboard";
import MaintenanceDashboard from "./MaintenanceDashboard";
import FolioBilling from "./FolioBilling";
import TapeChart from "./TapeChart";

interface HotelDashboardProps {
  organizationId: string | null;
  userRole: "ADMIN" | "MANAGER" | "RECEPTIONIST" | "HOUSEKEEPING" | "MAINTENANCE" | "ACCOUNTANT";
  initialRooms?: any[];
  initialReservations?: any[];
  initialFolioCharges?: any[];
  initialMaintenanceTickets?: any[];
}

export default function HotelDashboard({ organizationId, userRole, initialRooms = [], initialReservations = [], initialFolioCharges = [], initialMaintenanceTickets = [] }: HotelDashboardProps) {
  const [activeMenu, setActiveMenu] = useState(() => {
    if (userRole === "RECEPTIONIST") return "Front Desk";
    if (userRole === "HOUSEKEEPING") return "Housekeeping";
    if (userRole === "MAINTENANCE") return "Maintenance";
    return "Dashboard";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setIsSidebarOpen(false);
  }, []);

  const ALL_MENU_ITEMS = [
    { label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "ACCOUNTANT"] },
    { label: "Front Desk", icon: ConciergeBell, roles: ["ADMIN", "MANAGER", "RECEPTIONIST"] },
    { label: "Reservations", icon: CalendarDays, roles: ["ADMIN", "MANAGER", "RECEPTIONIST"] },
    { label: "Rooms & Status", icon: KeyRound, roles: ["ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING", "MAINTENANCE"] },
    { label: "Guests & Folios", icon: Users, roles: ["ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT"] },
    { label: "Housekeeping", icon: Sparkles, roles: ["ADMIN", "MANAGER", "HOUSEKEEPING"] },
    { label: "Maintenance", icon: Wrench, roles: ["ADMIN", "MANAGER", "MAINTENANCE"] },
    { label: "Services & Outlets", icon: Coffee, roles: ["ADMIN", "MANAGER", "RECEPTIONIST"] },
    { label: "Night Audit", icon: MoonStar, roles: ["ADMIN", "MANAGER", "ACCOUNTANT"] },
  ];

  const MENU_ITEMS = ALL_MENU_ITEMS.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-screen bg-[#F4F7FC] text-slate-800 font-sans overflow-hidden">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 md:z-20 bg-white text-slate-800 border-r border-slate-200 flex-shrink-0 transition-all duration-300 overflow-y-auto ${
          isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:translate-x-0 md:w-0"
        }`}
      >
        <div className="p-5 flex items-center gap-3 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            H
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">Hotel OS</span>
        </div>

        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Property Management</p>
          <ul className="space-y-1">
            {MENU_ITEMS.map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => {
                    setActiveMenu(item.label);
                    if (window.matchMedia("(max-width: 767px)").matches) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeMenu === item.label
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <item.icon size={18} className={activeMenu === item.label ? "text-blue-600" : "text-slate-400"} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {["ADMIN", "MANAGER"].includes(userRole) && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-2 px-2 pt-4 border-t border-slate-100">Direct Booking Engine</p>
              <Link
                href={organizationId ? `/business/website?org=${organizationId}` : `/business/website`}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Globe size={18} className="text-slate-400" />
                Website Builder
              </Link>
            </>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F4F7FC]">
        {/* Header */}
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
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Night Audit Due
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

        {/* Dynamic View Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {activeMenu === "Dashboard" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Today's Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                  { label: 'Arrivals', value: '14', alert: false },
                  { label: 'Departures', value: '8', alert: false },
                  { label: 'Rooms Dirty', value: '12', alert: true },
                  { label: 'Occupancy', value: '85%', alert: false }
                ].map(stat => (
                  <div key={stat.label} className={`bg-white p-5 md:p-6 rounded-2xl border ${stat.alert ? 'border-amber-200 shadow-amber-100/50' : 'border-slate-200'} shadow-sm`}>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className={`text-3xl font-black mt-2 tracking-tight ${stat.alert ? 'text-amber-600' : 'text-slate-800'}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMenu === "Front Desk" && <FrontDesk reservations={initialReservations} rooms={initialRooms} folioCharges={initialFolioCharges} />}
          {activeMenu === "Reservations" && <TapeChart initialRooms={initialRooms} initialReservations={initialReservations} />}
          {activeMenu === "Housekeeping" && <HousekeepingDashboard rooms={initialRooms} />}
          {activeMenu === "Maintenance" && <MaintenanceDashboard maintenanceTickets={initialMaintenanceTickets} rooms={initialRooms} />}
          {activeMenu === "Guests & Folios" && <FolioBilling reservations={initialReservations} rooms={initialRooms} folioCharges={initialFolioCharges} />}

          {activeMenu !== "Dashboard" && activeMenu !== "Front Desk" && activeMenu !== "Reservations" && activeMenu !== "Housekeeping" && activeMenu !== "Maintenance" && activeMenu !== "Guests & Folios" && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white rounded-3xl border border-slate-200 border-dashed p-12">
              <ConciergeBell size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-bold text-slate-600 mb-1">{activeMenu}</h3>
              <p className="text-sm">This module is under construction for the MVP.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
