"use client";

import React, { useEffect, useState } from "react";
import UsersManager, { USERS_TABS, TabId as UsersTabId } from "./UsersManager";
import AcademicManager, { ACADEMIC_TABS, TabId as AcademicTabId } from "./AcademicManager";
import ExaminationManager, { EXAMINATION_TABS, TabId as ExaminationTabId } from "./ExaminationManager";
import SettingsManager, { SETTINGS_TABS, TabId as SettingsTabId } from "./SettingsManager";
import AccountingManager, { ACCOUNTING_TABS, TabId as AccountingTabId } from "./AccountingManager";
import InquiriesManager from "./InquiriesManager";
import SchoolSetupWizard from "./SchoolSetupWizard";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Award,
  PieChart,
  Briefcase,
  Settings,
  Bell,
  Search,
  Menu,
  ChevronDown,
  ChevronRight,
  Globe,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminDashboardProps {
  organizationId: string | null;
  currentUserId?: string | null;
  initialSettings?: any;
  initialSchool?: any;
  initialInquiries?: any[];
  initialAcademicYears?: any[];
  initialStudents: any[];
  initialCourses: any[];
  initialCourseEnrollments: any[];
  initialStaff: any[];
  initialParents?: any[];
  initialGrades?: any[];
  initialClassSections?: any[];
  initialSubjects?: any[];
  initialTerms?: any[];
  initialRooms?: any[];
  initialEvents?: any[];
  initialAttendanceRecords: any[];
  initialBehaviorLogs: any[];
  initialFeeInvoices?: any[];
  initialFeeTypes?: any[];
}

export default function AdminDashboard({
  organizationId,
  currentUserId = null,
  initialSettings,
  initialSchool,
  initialInquiries = [],
  initialAcademicYears = [],
  initialStudents,
  initialCourses,
  initialStaff,
  initialParents = [],
  initialGrades = [],
  initialClassSections = [],
  initialSubjects = [],
  initialTerms = [],
  initialRooms = [],
  initialEvents = [],
  initialAttendanceRecords,
  initialFeeInvoices = [],
  initialFeeTypes = [],
}: AdminDashboardProps) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [isAcademicExpanded, setIsAcademicExpanded] = useState(false);
  const [activeAcademicTab, setActiveAcademicTab] = useState<AcademicTabId>("attendance");
  const [isExaminationExpanded, setIsExaminationExpanded] = useState(false);
  const [activeExaminationTab, setActiveExaminationTab] = useState<ExaminationTabId>("reportcards");
  const [isUsersExpanded, setIsUsersExpanded] = useState(false);
  const [activeUsersTab, setActiveUsersTab] = useState<UsersTabId>("students");
  const [isAccountingExpanded, setIsAccountingExpanded] = useState(false);
  const [activeAccountingTab, setActiveAccountingTab] = useState<AccountingTabId>("invoices");
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabId>("general");

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setIsSidebarOpen(false);
  }, []);

  const closeSidebarOnMobile = () => {
    if (window.matchMedia("(max-width: 767px)").matches) setIsSidebarOpen(false);
  };

  const selectMenu = (label: string) => {
    setActiveMenu(label);
    closeSidebarOnMobile();
  };

  // Shared open/select logic for every sidebar item that expands into a
  // sub-menu instead of navigating directly — each item still needs its
  // own useState pair (hooks can't be created dynamically), but the
  // toggle/select behavior itself is identical across all of them.
  const toggleSubmenu = (label: string, setExpanded: React.Dispatch<React.SetStateAction<boolean>>) => {
    setActiveMenu(label);
    setExpanded((v) => !v);
  };

  const selectSubmenuTab = <T,>(label: string, setExpanded: React.Dispatch<React.SetStateAction<boolean>>, setActiveTab: (tab: T) => void, tabId: T) => {
    setActiveMenu(label);
    setActiveTab(tabId);
    setExpanded(true);
    closeSidebarOnMobile();
  };

  if (!organizationId) {
    return (
      <div className="p-10 text-center text-gray-400">
        <GraduationCap size={48} className="mx-auto mb-4 opacity-20" />
        <p>No school organization found — run the seed script.</p>
      </div>
    );
  }

  const teachersCount = initialStaff.filter((s) => s.role === "TEACHER").length;
  const staffCount = initialStaff.length;
  const parentsCount = initialParents.length;

  const presentToday = initialAttendanceRecords.filter((r) => r.status === "PRESENT").length;
  const upcomingEvents = initialEvents.filter((e) => new Date(e.endDate) >= new Date()).slice(0, 5);

  // Transport, Alumni, Live class, Examination, Back office, and Online
  // courses were previously listed here as placeholder tabs with zero
  // backing schema or actions — dropped rather than shipping dead UI.
  // See CLASSE365_RESEARCH.md for where Alumni/Online courses/LMS content
  // are tracked as a genuine future phase.
  const MENU_ITEMS = [
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Users", icon: Users },
    { label: "Academic", icon: BookOpen },
    { label: "Examination", icon: Award },
    { label: "Accounting", icon: PieChart },
    { label: "Settings", icon: Settings },
    { label: "Inquiries", icon: MessageSquare },
  ];

  // Sidebar items that expand into a sub-menu instead of navigating
  // directly — each maps to the item's own tab list, expand/collapse
  // state, current tab, and select handler.
  const SUBMENUS: Record<string, { tabs: { id: any; label: string; icon: any }[]; isExpanded: boolean; toggle: () => void; activeTab: any; select: (id: any) => void }> = {
    Academic: { tabs: ACADEMIC_TABS, isExpanded: isAcademicExpanded, toggle: () => toggleSubmenu("Academic", setIsAcademicExpanded), activeTab: activeAcademicTab, select: (id) => selectSubmenuTab("Academic", setIsAcademicExpanded, setActiveAcademicTab, id) },
    Examination: { tabs: EXAMINATION_TABS, isExpanded: isExaminationExpanded, toggle: () => toggleSubmenu("Examination", setIsExaminationExpanded), activeTab: activeExaminationTab, select: (id) => selectSubmenuTab("Examination", setIsExaminationExpanded, setActiveExaminationTab, id) },
    Users: { tabs: USERS_TABS, isExpanded: isUsersExpanded, toggle: () => toggleSubmenu("Users", setIsUsersExpanded), activeTab: activeUsersTab, select: (id) => selectSubmenuTab("Users", setIsUsersExpanded, setActiveUsersTab, id) },
    Accounting: { tabs: ACCOUNTING_TABS, isExpanded: isAccountingExpanded, toggle: () => toggleSubmenu("Accounting", setIsAccountingExpanded), activeTab: activeAccountingTab, select: (id) => selectSubmenuTab("Accounting", setIsAccountingExpanded, setActiveAccountingTab, id) },
    Settings: { tabs: SETTINGS_TABS, isExpanded: isSettingsExpanded, toggle: () => toggleSubmenu("Settings", setIsSettingsExpanded), activeTab: activeSettingsTab, select: (id) => selectSubmenuTab("Settings", setIsSettingsExpanded, setActiveSettingsTab, id) },
  };

  return (
    <>
      <SchoolSetupWizard settings={initialSettings} />
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
        className={`fixed md:static inset-y-0 left-0 z-40 md:z-20 bg-white border-r border-slate-200 flex-shrink-0 transition-all duration-300 overflow-y-auto ${
          isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64 md:translate-x-0 md:w-0"
        }`}
      >
        <div className="p-5 flex items-center gap-3 border-b border-slate-100 sticky top-0 bg-white">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            C
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">CitySchool</span>
        </div>

        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Navigation</p>
          <ul className="space-y-1">
            {MENU_ITEMS.map((item) => {
              const submenu = SUBMENUS[item.label];
              return (
                <li key={item.label}>
                  {submenu ? (
                    <>
                      <button
                        onClick={submenu.toggle}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          activeMenu === item.label
                            ? "bg-blue-50 text-blue-600 font-medium"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <item.icon size={18} className={activeMenu === item.label ? "text-blue-600" : "text-slate-400"} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {submenu.isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                      </button>
                      {submenu.isExpanded && (
                        <ul className="mt-1 ml-4 pl-3 border-l border-slate-100 space-y-0.5">
                          {submenu.tabs.map((tab) => (
                            <li key={tab.id}>
                              <button
                                onClick={() => submenu.select(tab.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                                  activeMenu === item.label && submenu.activeTab === tab.id
                                    ? "bg-blue-50 text-blue-600 font-medium"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <tab.icon size={14} className={activeMenu === item.label && submenu.activeTab === tab.id ? "text-blue-600" : "text-slate-400"} />
                                {tab.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => selectMenu(item.label)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        activeMenu === item.label
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <item.icon size={18} className={activeMenu === item.label ? "text-blue-600" : "text-slate-400"} />
                      {item.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-6 mb-2 px-2 pt-4 border-t border-slate-100">Business</p>
          <Link
            href={`/business/website?org=${organizationId}`}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Globe size={18} className="text-slate-400" />
            Website
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-500 w-64">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none w-full placeholder:text-slate-400 text-slate-700" 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">Jonathan Wick</p>
                <p className="text-xs text-slate-500">Superadmin</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center relative">
                <img
                  src="https://api.dicebear.com/9.x/avataaars/svg?seed=Jonathan"
                  alt="User"
                  className="object-cover w-full h-full"
                />
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeMenu === "Dashboard" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  {/* Students */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col relative overflow-hidden group">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-3xl font-bold text-slate-800">{initialStudents.length}</p>
                        <p className="text-sm text-slate-500 font-medium mt-1">Students</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                        <Users size={24} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-auto pt-4 border-t border-slate-50">Total number of student</p>
                  </div>

                  {/* Teacher */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col relative overflow-hidden group">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-3xl font-bold text-slate-800">{teachersCount}</p>
                        <p className="text-sm text-slate-500 font-medium mt-1">Teacher</p>
                      </div>
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                        <BookOpen size={24} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-auto pt-4 border-t border-slate-50">Total number of teacher</p>
                  </div>

                  {/* Parents */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col relative overflow-hidden group">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-3xl font-bold text-slate-800">{parentsCount}</p>
                        <p className="text-sm text-slate-500 font-medium mt-1">Parents</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center">
                        <Users size={24} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-auto pt-4 border-t border-slate-50">Total number of parent</p>
                  </div>

                  {/* Staff */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col relative overflow-hidden group">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-3xl font-bold text-slate-800">{staffCount}</p>
                        <p className="text-sm text-slate-500 font-medium mt-1">Staff</p>
                      </div>
                      <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
                        <Briefcase size={24} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-auto pt-4 border-t border-slate-50">Total number of staff</p>
                  </div>
                </div>

                {/* Bottom Sections: Attendance & Events */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                  {/* Todays attendance */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-slate-800">Todays attendance</h2>
                    </div>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="relative w-40 h-40 mb-4 flex items-center justify-center">
                        {/* Circular Progress Placeholder */}
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="80" cy="80" r="70" className="stroke-slate-100" strokeWidth="12" fill="none" />
                          <circle cx="80" cy="80" r="70" className="stroke-blue-500" strokeWidth="12" fill="none" strokeDasharray="440" strokeDashoffset="440" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-bold text-slate-800">{presentToday}</span>
                        </div>
                      </div>
                      <p className="text-slate-500">{presentToday} Students are attending today</p>
                    </div>
                  </div>

                  {/* Recent events */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-slate-800">Upcoming events</h2>
                    </div>
                    {upcomingEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 h-full">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                          <Bell size={24} className="text-slate-300" />
                        </div>
                        <p>No upcoming events</p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {upcomingEvents.map((ev) => (
                          <li key={ev.id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                            <div>
                              <p className="font-medium text-slate-800">{ev.title}</p>
                              <p className="text-xs text-slate-400 capitalize">{ev.category}</p>
                            </div>
                            <span className="text-xs text-slate-500">{new Date(ev.startDate).toLocaleDateString()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : activeMenu === "Users" ? (
              <UsersManager organizationId={organizationId} activeTab={activeUsersTab} students={initialStudents} staff={initialStaff} parents={initialParents} refresh={refresh} />
            ) : activeMenu === "Academic" ? (
              <AcademicManager
                organizationId={organizationId}
                activeTab={activeAcademicTab}
                courses={initialCourses}
                teachers={initialStaff.filter((s) => s.role === "TEACHER")}
                grades={initialGrades}
                classSections={initialClassSections}
                subjects={initialSubjects}
                terms={initialTerms}
                academicYears={initialAcademicYears}
                students={initialStudents}
                rooms={initialRooms}
                events={initialEvents}
                currentUserId={currentUserId}
                refresh={refresh}
              />
            ) : activeMenu === "Examination" ? (
              <ExaminationManager
                organizationId={organizationId}
                activeTab={activeExaminationTab}
                schoolName={initialSchool?.name ?? ""}
                classSections={initialClassSections}
                terms={initialTerms}
                students={initialStudents}
                refresh={refresh}
              />
            ) : activeMenu === "Settings" ? (
              <SettingsManager organizationId={organizationId} activeTab={activeSettingsTab} settings={initialSettings} school={initialSchool} academicYears={initialAcademicYears} refresh={refresh} />
            ) : activeMenu === "Accounting" ? (
              <AccountingManager organizationId={organizationId} activeTab={activeAccountingTab} feeInvoices={initialFeeInvoices} feeTypes={initialFeeTypes} students={initialStudents} refresh={refresh} />
            ) : activeMenu === "Inquiries" ? (
              <InquiriesManager inquiries={initialInquiries} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <LayoutDashboard size={48} className="mb-4 opacity-20" />
                <h2 className="text-xl font-semibold text-slate-700 mb-2">{activeMenu}</h2>
                <p>This module is under construction.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
    </>
  );
}
