'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import {
  LayoutGrid,
  Compass,
  Sparkles,
  Rss,
  User as UserIcon,
  Bell,
  Car,
  Package,
  Building2,
  LayoutDashboard,
  FlaskConical,
  ShoppingCart,
  ShieldAlert,
  ChevronRight,
  BedDouble,
  Stethoscope,
  GraduationCap,
  Wrench,
  Receipt,
  Newspaper,
  Map as MapIcon,
  PenSquare,
  Briefcase,
  Users as UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CartProvider, useCart } from '@/components/cityos/CartStore';
import { WalletProvider, useWallet } from '@/components/cityos/WalletStore';
import { ExperienceProvider } from '@/components/cityos/ExperienceStore';
import { NOTIFICATIONS, DEMO_USER, APP_STATE, fmtNaira } from '@/lib/demo/cityos';
import { cn } from '@/lib/utils';

function CartBell() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      title="Cart"
      className="relative p-2.5 text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors flex items-center justify-center"
    >
      <ShoppingCart className="w-5 h-5" />
      {count > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2.5 text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-80 bg-white rounded-2xl border border-slate-100 shadow-2xl p-2 overflow-hidden">
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-100">
              <p className="text-xs font-black text-ink uppercase tracking-wider">Notifications</p>
              <span className="text-[10px] font-bold text-slate-400">3 new</span>
            </div>
            <div className="py-1">
              {NOTIFICATIONS.map((n) => (
                <Link
                  key={n.title}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold text-slate-800 leading-snug">{n.title}</p>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function WalletChip() {
  const { balance } = useWallet();
  return (
    <Link
      href="/profile"
      className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-teal-900 to-teal-700 p-3.5 text-white hover:opacity-95 transition-opacity"
    >
      <div className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-sm font-black">
        {DEMO_USER.initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-tight truncate">{DEMO_USER.name}</p>
        <p className="text-[10px] text-teal-100/80 font-bold tabular-nums">
          {`CityPay · ${fmtNaira(balance)}`}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-teal-100/70" />
    </Link>
  );
}

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const navGroups: { label: string; items: { id: string; path: string; label: string; icon: any }[] }[] = [
    {
      label: 'Discover',
      items: [
        { id: 'home', path: '/', label: 'Home', icon: LayoutGrid },
        { id: 'explore', path: '/explore', label: 'Explore', icon: Compass },
        { id: 'ai', path: '/ai', label: 'Ask CityOS', icon: Sparkles },
        { id: 'feed', path: '/feed', label: 'Feed', icon: Rss },
        { id: 'news', path: '/news', label: 'News', icon: Newspaper },
      ],
    },
    {
      label: 'Move & Live',
      items: [
        { id: 'ride', path: '/drive/ride', label: 'City Ride', icon: Car },
        { id: 'delivery', path: '/drive/delivery', label: 'City Delivery', icon: Package },
        { id: 'house', path: '/house', label: 'CityHouse', icon: Building2 },
        { id: 'stay', path: '/stay', label: 'Hotels Tonight', icon: BedDouble },
      ],
    },
    {
      label: 'Care & Civic',
      items: [
        { id: 'care', path: '/care', label: 'City Care', icon: Stethoscope },
        { id: 'schools', path: '/schools', label: 'Schools', icon: GraduationCap },
        { id: 'tasks', path: '/tasks', label: 'City Tasks', icon: Wrench },
        { id: 'bills', path: '/bills', label: 'Bills & Airtime', icon: Receipt },
      ],
    },
    {
      label: 'ShopOS Marketplaces',
      items: [
        { id: 'biz-fresh', path: '/biz/calabar-fresh', label: 'Calabar Fresh Market', icon: LayoutGrid },
        { id: 'biz-watt', path: '/biz/watt-market-delicacies', label: 'Watt Market Delicacies', icon: LayoutGrid },
        { id: 'biz-eko', path: '/biz/eko-kitchen', label: 'Eko Kitchen', icon: LayoutGrid },
        { id: 'biz-medline', path: '/biz/medline-pharmacy', label: 'Medline Pharmacy', icon: LayoutGrid },
      ],
    },
    {
      label: 'Your City',
      items: [
        { id: 'map', path: '/map', label: 'City Map', icon: MapIcon },
        { id: 'create', path: '/create', label: 'Create', icon: PenSquare },
        { id: 'jobs', path: '/jobs', label: 'CityJobs', icon: Briefcase },
        { id: 'community', path: '/community', label: 'Communities', icon: UsersIcon },
        { id: 'activity', path: '/activity', label: 'Activity', icon: Bell },
        { id: 'profile', path: '/profile', label: 'Profile', icon: UserIcon },
        { id: 'business', path: '/business', label: 'Business Dashboard', icon: LayoutDashboard },
        { id: 'demo', path: '/demo', label: 'Demo Hub', icon: FlaskConical },
      ],
    },
    {
      label: 'Admin Access',
      items: [{ id: 'school-admin', path: '/admin/school', label: 'School Admin', icon: ShieldAlert }],
    },
  ];

  const getTitle = () => {
    if (!pathname) return 'CityOS';
    if (pathname.startsWith('/ai')) return 'Ask CityOS';
    if (pathname.startsWith('/feed')) return 'City Feed';
    if (pathname.startsWith('/explore')) return 'Explore Calabar';
    if (pathname.startsWith('/cart')) return 'Your Cart';
    if (pathname.startsWith('/checkout')) return 'CityPay Checkout';
    if (pathname.startsWith('/pay/')) return 'CityPay';
    if (pathname.startsWith('/biz/')) return 'ShopOS Marketplace';
    if (pathname.startsWith('/product/')) return 'Product';
    if (pathname.startsWith('/drive/ride')) return 'City Ride';
    if (pathname.startsWith('/drive/delivery')) return 'City Delivery';
    if (pathname.startsWith('/drive/')) return 'CityDrive';
    if (pathname.startsWith('/house')) return 'CityHouse';
    if (pathname.startsWith('/stay')) return 'Hotels Tonight';
    if (pathname.startsWith('/care')) return 'City Care';
    if (pathname.startsWith('/schools')) return 'Schools';
    if (pathname.startsWith('/tasks')) return 'City Tasks';
    if (pathname.startsWith('/bills')) return 'Bills & Airtime';
    if (pathname.startsWith('/news')) return 'News';
    if (pathname.startsWith('/events')) return 'Events';
    if (pathname.startsWith('/activity')) return 'Activity';
    if (pathname.startsWith('/business')) return 'Business Dashboard';
    if (pathname.startsWith('/demo/access')) return 'Demo Access';
    if (pathname.startsWith('/demo')) return 'Demo Hub';
    if (pathname.startsWith('/map')) return 'City Map';
    if (pathname.startsWith('/create')) return 'Create';
    if (pathname.startsWith('/jobs')) return 'CityJobs';
    if (pathname.startsWith('/community')) return 'Communities';
    if (pathname.startsWith('/workspaces')) return 'Workspaces';
    if (pathname.startsWith('/profile')) return 'Profile';
    if (pathname === '/explore') return 'Explore Calabar';
    return 'CityOS';
  };

  const isActive = (path: string) => (path === '/' ? pathname === '/' : pathname?.startsWith(path));

  return (
    <ExperienceProvider>
      <CartProvider>
      <WalletProvider>
        <div className="flex h-screen bg-[#F6F7F8] overflow-hidden font-sans text-slate-900 selection:bg-teal-200">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-[268px] bg-white border-r border-slate-100 z-20 h-full overflow-y-auto">
          <div className="p-6 pb-4 flex flex-col gap-1 sticky top-0 bg-white z-10 border-b border-slate-100/60">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-800/20">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-ink leading-none">CityOS</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">
                  {`Calabar · ${APP_STATE}`}
                </p>
              </div>
            </Link>
            <div className="mt-3 inline-flex items-center gap-1.5 self-start px-2 py-1 rounded-full bg-orange-50 ring-1 ring-orange-100">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Prototype</span>
            </div>
          </div>

          <nav className="flex-1 px-4 py-5 space-y-7">
            {navGroups.map((group) => (
              <div key={group.label}>
                <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {group.label}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.id}
                        href={item.path}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all',
                          active
                            ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-100'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                        )}
                      >
                        <item.icon
                          className={cn('w-4 h-4', active ? 'text-teal-800' : 'text-slate-400')}
                        />
                        {item.label}
                        {active ? <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-600" /> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-5 border-t border-slate-100">
            <WalletChip />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F6F7F8] md:bg-[#F6F7F8] relative">
          {/* Desktop Top Nav */}
          <header className="hidden md:flex h-16 items-center justify-between px-6 lg:px-8 bg-white border-b border-slate-100 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-black text-ink uppercase tracking-[0.18em]">{getTitle()}</h2>
              <span className="text-[10px] text-slate-300 font-bold">/</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                System Online
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CartBell />
              <NotificationsDropdown />
              <div className="h-6 w-px bg-slate-100 mx-1" />
              {session ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/profile"
                    className="flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 bg-white overflow-hidden shadow-sm"
                  >
                    {session.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.user.image}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4 text-slate-700" />
                    )}
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-teal-800 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </header>

          {/* Mobile Header */}
          <header className="md:hidden flex flex-col px-5 pt-4 pb-3 bg-[#F6F7F8] sticky top-0 z-20">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-700 to-teal-500 flex items-center justify-center text-white">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-ink leading-none">CityOS</h1>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em]">Calabar</p>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <CartBell />
                <NotificationsDropdown />
              </div>
            </div>
          </header>

          {/* Scrollable View Area */}
          <main className="flex-1 overflow-y-auto px-4 md:px-8 py-5 md:py-8 relative scroll-smooth pb-28 md:pb-8">
            <div className="mx-auto max-w-6xl h-full">{children}</div>
          </main>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-between px-2 h-16 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
            {[
              { id: 'home', path: '/', label: 'Home', icon: LayoutGrid },
              { id: 'map', path: '/map', label: 'Map', icon: MapIcon },
              { id: 'create', path: '/create', label: 'Create', icon: PenSquare },
              { id: 'activity', path: '/activity', label: 'Activity', icon: Bell },
              { id: 'profile', path: '/profile', label: 'You', icon: UserIcon },
            ].map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={cn(
                    'flex flex-col items-center justify-center w-14 py-1.5 rounded-xl transition-colors',
                    active ? 'text-teal-800' : 'text-slate-400 hover:text-slate-600',
                  )}
                >
                  <item.icon className={cn('w-5 h-5 mb-0.5', active && 'fill-teal-50')} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      </WalletProvider>
      </CartProvider>
      </ExperienceProvider>
  );
}