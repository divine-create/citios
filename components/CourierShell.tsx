'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Map, Package, History, LogOut, Car, CheckCircle } from 'lucide-react';

export default function CourierShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const courierNavItems = [
        { id: 'dispatch', path: '/courier', label: 'Dispatch Map', icon: Map },
        { id: 'deliveries', path: '/courier/deliveries', label: 'My Routes', icon: Package },
        { id: 'rides', path: '/courier/rides', label: 'Ride Requests', icon: Car },
        { id: 'earnings', path: '/courier/earnings', label: 'Earnings', icon: History },
    ];

    return (
        <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans selection:bg-teal-500">
            {/* Courier Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800 z-20 h-full overflow-y-auto">
                <div className="p-6 flex flex-col gap-0.5 sticky top-0 bg-slate-950 z-10 border-b border-slate-800">
                    <h1 className="text-2xl font-bold text-teal-400 tracking-tight">CityRide</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Driver / Courier Hub</p>
                </div>

                <div className="px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm">JD</div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-teal-500 rounded-full border-2 border-slate-950"></div>
                        </div>
                        <div>
                            <p className="text-sm font-bold">John Doe</p>
                            <p className="text-[10px] text-teal-500 uppercase font-bold tracking-wider">Online & Accepting</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {courierNavItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.id}
                                href={item.path}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                                    isActive
                                        ? 'bg-teal-900/50 text-teal-400 shadow-sm border border-teal-800/50'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                <item.icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-slate-800">
                    <Link href="/" className="flex items-center gap-3 text-slate-500 hover:text-slate-300 transition-colors">
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-bold">Go Offline (Exit)</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-900 relative">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
                    <div>
                        <h1 className="text-xl font-bold text-teal-400 tracking-tight">CityRide</h1>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Driver Hub</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center relative">
                        <span className="text-xs font-bold">JD</span>
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 border-slate-950"></div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth pb-24 md:pb-8">
                    <div className="mx-auto max-w-7xl h-full">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 flex overflow-x-auto items-center justify-between px-4 h-16 z-50">
                    {courierNavItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.id}
                                href={item.path}
                                className={`flex flex-col items-center justify-center w-16 transition-colors ${
                                    isActive ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                <item.icon className="w-5 h-5 mb-1" />
                                <span className="text-[8px] font-bold uppercase tracking-wider">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
