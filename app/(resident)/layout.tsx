'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Home, Stethoscope, Search, Wallet, User as UserIcon, Bell, GraduationCap, ShoppingCart, Calendar, Building, Wrench, ShieldAlert, Car } from 'lucide-react';
import Link from 'next/link';

export default function ResidentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();

    const mainNavItems = [
        { id: 'home', path: '/', label: 'Home', icon: Home },
        { id: 'search', path: '/explore', label: 'Explore', icon: Search },
        { id: 'booking', path: '/activity', label: 'Activity', icon: Wallet },
        { id: 'profile', path: '/profile', label: 'Profile', icon: UserIcon },
    ];

    const serviceNavItems = [
        { id: 'ride', path: '/services/ride', label: 'CityRide', icon: Car },
        { id: 'healthcare', path: '/services/healthcare', label: 'Care', icon: Stethoscope },
        { id: 'education', path: '/services/education', label: 'Schools', icon: GraduationCap },
        { id: 'grocery', path: '/services/grocery', label: 'Groceries', icon: ShoppingCart },
        { id: 'events', path: '/services/events', label: 'Events', icon: Calendar },
        { id: 'rentals', path: '/services/rentals', label: 'Properties', icon: Building },
        { id: 'services', path: '/services/local', label: 'Services', icon: Wrench },
    ];

    const adminNavItems = [
        { id: 'school-admin', path: '/admin/school', label: 'School Admin', icon: ShieldAlert },
    ];
    
    const getTitle = () => {
        if (!pathname) return 'Home';
        if (pathname.includes('/ride')) return 'CityRide & Delivery';
        if (pathname.includes('/healthcare')) return 'Find Care';
        if (pathname.includes('/education')) return 'Find Schools';
        if (pathname.includes('/grocery')) return 'Groceries';
        if (pathname.includes('/events')) return 'Local Events';
        if (pathname.includes('/rentals')) return 'Properties';
        if (pathname.includes('/local')) return 'Services';
        if (pathname.includes('/admin/school')) return 'School Management';
        if (pathname === '/explore') return 'Explore';
        if (pathname === '/activity') return 'Activity';
        if (pathname === '/profile') return 'Profile';
        return 'Home';
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 selection:bg-teal-200">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 z-20 h-full overflow-y-auto">
                <div className="p-6 flex flex-col gap-0.5 sticky top-0 bg-white z-10 border-b border-slate-100/50">
                    <h1 className="text-2xl font-bold text-teal-800 tracking-tight">CityConnect</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Urban Integration</p>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-8">
                    <div className="space-y-2">
                        {mainNavItems.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                                <Link
                                    key={item.id}
                                    href={item.path}
                                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                                        isActive
                                            ? 'bg-slate-50 text-teal-800'
                                            : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                                >
                                    <item.icon className={`w-4 h-4 ${isActive ? 'text-teal-800' : 'text-slate-400'}`} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    <div>
                        <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Local Services</h3>
                        <div className="space-y-1">
                            {serviceNavItems.map((item) => {
                                const isActive = pathname === item.path;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.path}
                                        className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                                            isActive
                                                ? 'bg-slate-50 text-teal-800'
                                                : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50'
                                        }`}
                                    >
                                        <item.icon className={`w-4 h-4 ${isActive ? 'text-teal-800' : 'text-slate-400'}`} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Admin Access</h3>
                        <div className="space-y-1">
                            {adminNavItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.path}
                                    className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                                        pathname === item.path
                                            ? 'bg-slate-50 text-teal-800'
                                            : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                                >
                                    <item.icon className={`w-4 h-4 ${pathname === item.path ? 'text-teal-800' : 'text-slate-400'}`} />
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </nav>

                <div className="p-6">
                    <div className="bg-teal-50 rounded-xl p-4">
                        <div className="flex flex-col gap-1 mb-1">
                            <p className="font-bold text-[10px] text-teal-800 uppercase tracking-wider">Family Plan</p>
                            <p className="text-[9px] text-teal-700 opacity-70 uppercase tracking-wider">4 Active Members</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 md:bg-[#FAFAFA] relative">
                {/* Desktop Top Nav */}
                <header className="hidden md:flex h-20 items-center justify-between px-8 bg-[#FAFAFA] border-b border-slate-200/60 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            {getTitle()}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm mr-4">
                            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">System Online</span>
                        </div>
                        <button className="relative p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-slate-50" />
                        </button>
                        <div className="h-6 w-px bg-slate-200 mx-1" />
                        
                        {session ? (
                            <div className="flex items-center gap-3">
                                <Link href="/profile" className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-white overflow-hidden shadow-sm">
                                    {session.user?.image ? (
                                        <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon className="w-4 h-4 text-slate-700" />
                                    )}
                                </Link>
                                <button onClick={() => signOut()} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider">Sign Out</button>
                            </div>
                        ) : (
                            <button onClick={() => signIn('google')} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold shadow hover:bg-teal-700 transition-colors">
                                Sign In
                            </button>
                        )}
                    </div>
                </header>

                {/* Mobile Header */}
                <header className="md:hidden flex flex-col px-6 py-4 bg-slate-50 sticky top-0 z-10">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-xl font-bold text-teal-800 tracking-tight">CityConnect</h1>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Urban Integration</p>
                        </div>
                        <button className="relative p-2 text-slate-500 bg-white rounded-lg border border-slate-200 shadow-sm">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full border-2 border-white" />
                        </button>
                    </div>
                </header>

                {/* Scrollable View Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth pb-24 md:pb-8">
                    <div className="mx-auto max-w-7xl h-full">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex overflow-x-auto items-center px-2 h-16 z-50 [&::-webkit-scrollbar]:hidden">
                    {[...mainNavItems, ...serviceNavItems, ...adminNavItems].map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.id}
                                href={item.path}
                                className={`flex flex-col items-center justify-center shrink-0 w-16 transition-colors ${
                                    isActive ? 'text-teal-800' : 'text-slate-300 hover:text-slate-400'
                                }`}
                            >
                                <item.icon className="w-5 h-5 mb-1" />
                                <span className="text-[8px] font-bold uppercase tracking-wider max-w-[60px] truncate">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
