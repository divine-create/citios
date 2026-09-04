'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, Settings, LogOut, ShieldAlert, Building } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const adminNavItems = [
        { id: 'dashboard', path: '/admin', label: 'Admin Hub', icon: LayoutDashboard },
        { id: 'hotel-admin', path: '/admin/hotel', label: 'Hotel Admin', icon: Building },
        { id: 'school-admin', path: '/admin/school', label: 'School Admin', icon: ShieldAlert },
        { id: 'users', path: '/admin/users', label: 'User Management', icon: Users },
        { id: 'settings', path: '/admin/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900 selection:bg-teal-200">
            {/* Admin Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white border-r border-slate-800 z-20 h-full overflow-y-auto">
                <div className="p-6 flex flex-col gap-0.5 sticky top-0 bg-slate-900 z-10 border-b border-slate-800">
                    <h1 className="text-2xl font-bold text-white tracking-tight">CityConnect</h1>
                    <p className="text-[10px] text-teal-400 font-bold uppercase tracking-[0.2em]">Admin Portal</p>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {adminNavItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.id}
                                href={item.path}
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
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
                <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white sticky top-0 z-10">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">CityConnect Admin</h1>
                    </div>
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
