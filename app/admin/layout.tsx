'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, Settings, LogOut, ShieldAlert, Building, Menu, X } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [isNavOpen, setIsNavOpen] = useState(false);

    const adminNavItems = [
        { id: 'dashboard', path: '/admin', label: 'Admin Hub', icon: LayoutDashboard },
        { id: 'hotel-admin', path: '/admin/hotel', label: 'Hotel Admin', icon: Building },
        { id: 'school-admin', path: '/admin/school', label: 'School Admin', icon: ShieldAlert },
        { id: 'users', path: '/admin/users', label: 'User Management', icon: Users },
        { id: 'settings', path: '/admin/settings', label: 'Settings', icon: Settings },
    ];

    const navList = (
        <>
            <div className="p-6 flex items-center justify-between gap-0.5 sticky top-0 bg-slate-900 z-10 border-b border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">CityConnect</h1>
                    <p className="text-[10px] text-teal-400 font-bold uppercase tracking-[0.2em]">Admin Portal</p>
                </div>
                <button
                    onClick={() => setIsNavOpen(false)}
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
                {adminNavItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.id}
                            href={item.path}
                            onClick={() => setIsNavOpen(false)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                                isActive
                                    ? 'bg-teal-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-6 border-t border-slate-800">
                <Link href="/" className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-bold">Exit to Resident App</span>
                </Link>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900 selection:bg-teal-200">
            {/* Mobile backdrop */}
            {isNavOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={() => setIsNavOpen(false)}
                />
            )}

            {/* Admin Sidebar */}
            <aside
                className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col w-64 bg-slate-900 text-white border-r border-slate-800 h-full overflow-y-auto transition-transform duration-300 ${
                    isNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
                {navList}
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
                <header className="md:hidden flex items-center justify-between px-4 py-4 bg-slate-900 text-white sticky top-0 z-10">
                    <button
                        onClick={() => setIsNavOpen(true)}
                        className="p-2 -ml-2 rounded-lg text-slate-300 hover:bg-slate-800"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight">CityConnect Admin</h1>
                    <div className="w-9" />
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
                    <div className="mx-auto max-w-7xl h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
