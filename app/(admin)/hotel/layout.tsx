'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { CalendarRange, LayoutDashboard, Sparkles, Hotel, LogOut, ArrowLeft, UtensilsCrossed, Wrench, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/hotel/frontdesk', label: 'Front Desk', icon: CalendarRange },
  { path: '/hotel/manager', label: 'Manager', icon: LayoutDashboard },
  { path: '/hotel/housekeeping', label: 'Housekeeping', icon: Sparkles },
  { path: '/hotel/outlets', label: 'Outlets (POS)', icon: UtensilsCrossed },
  { path: '/hotel/maintenance', label: 'Maintenance', icon: Wrench },
];

export default function HotelAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <Hotel size={20} />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">CityConnect</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Hotel PMS</p>
        </div>
        <button
          onClick={() => setIsNavOpen(false)}
          className="ml-auto p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsNavOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={14} /> Back to CityConnect
        </Link>
        {session && (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
        <button
          onClick={() => setIsNavOpen(true)}
          className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>
        <div className="bg-blue-600 p-1.5 rounded-lg text-white">
          <Hotel size={16} />
        </div>
        <p className="font-bold text-gray-900 text-sm">Hotel PMS</p>
      </div>

      {/* Mobile backdrop */}
      {isNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsNavOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col w-60 flex-shrink-0 bg-white border-r border-gray-200 transition-transform duration-300 ${
          isNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {sidebarContent}
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto pt-14 md:pt-0">
        {children}
      </div>
    </div>
  );
}
