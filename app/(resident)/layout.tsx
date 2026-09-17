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
  Store,
  UtensilsCrossed,
  Bookmark,
  Calendar,
  Menu as MenuIcon,
  X,
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
  const [menuOpen, setMenuOpen] = useState(false);

  type NavItem = { id: string; path: string; label: string; icon: any; secondary?: boolean };

const navGroups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Discover',
      items: [
        { id: 'home', path: '/', label: 'Home', icon: LayoutGrid },
        { id: 'explore', path: '/explore', label: 'Explore', icon: Compass },
        { id: 'feed', path: '/feed', label: 'Newsfeed', icon: Rss },
        { id: 'ai', path: '/ai', label: 'Ask CityOS', icon: Sparkles },
        { id: 'news', path: '/news', label: 'News', icon: Newspaper, secondary: true },
      ],
    },
    {
      label: 'Around You',
      items: [
        { id: 'map', path: '/map', label: 'Map', icon: MapIcon },
        { id: 'market', path: '/market', label: 'Market', icon: Store },
        { id: 'food', path: '/food', label: 'Food', icon: UtensilsCrossed },
        { id: 'services', path: '/services', label: 'Services', icon: Wrench },
        { id: 'schools', path: '/schools', label: 'Schools', icon: GraduationCap },
        { id: 'jobs', path: '/jobs', label: 'Jobs', icon: Briefcase },
        { id: 'events', path: '/events', label: 'Events', icon: Calendar },
        { id: 'house', path: '/house', label: 'Homes', icon: Building2 },
        { id: 'care', path: '/care', label: 'Health', icon: Stethoscope },
        { id: 'community', path: '/community', label: 'Communities', icon: UsersIcon },
        { id: 'ride', path: '/drive/ride', label: 'Ride', icon: Car, secondary: true },
        { id: 'delivery', path: '/drive/delivery', label: 'Delivery', icon: Package, secondary: true },
        { id: 'stay', path: '/stay', label: 'Hotels', icon: BedDouble, secondary: true },
        { id: 'bills', path: '/bills', label: 'Bills & Airtime', icon: Receipt, secondary: true },
      ],
    },
    {
      label: 'Your City',
      items: [
        { id: 'create', path: '/create', label: 'Create', icon: PenSquare },
        { id: 'activity', path: '/activity', label: 'Activity', icon: Bell },
        { id: 'saved', path: '/saved', label: 'Saved', icon: Bookmark },
        { id: 'profile', path: '/profile', label: 'Profile', icon: UserIcon },
      ],
    },
    {
      label: 'Organization',
      items: [
        { id: 'business', path: '/business', label: 'Business Dashboard', icon: LayoutDashboard },
        { id: 'demo', path: '/demo/access', label: 'Demo Access', icon: FlaskConical },
      ],
    },
  ];

  const getTitle = () => {
    if (!pathname) return 'CityOS';
    if (pathname.startsWith('/ai')) return 'Ask CityOS';
    if (pathname.startsWith('/feed')) return 'Newsfeed';
    if (pathname.startsWith('/explore')) return 'Explore Calabar';
    if (pathname.startsWith('/market')) return 'Market';
    if (pathname.startsWith('/food')) return 'Food';
    if (pathname.startsWith('/services')) return 'Services';
    if (pathname.startsWith('/org/')) return 'Business Profile';
    if (pathname.startsWith('/saved')) return 'Saved';
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
    if (pathname.startsWith('/jobs')) return 'Jobs';
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
                    const secondary = item.secondary;
                    return (
                      <Link
                        key={item.id}
                        href={item.path}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl transition-all',
                          secondary ? 'px-3 pb-1 pt-1 text-[11px] font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-50' : 'px-3 py-2.5 text-[13px] font-bold',
                          active
                            ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-100'
                            : secondary
                              ? 'mt-0.5'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                        )}
                      >
                        <item.icon
                          className={cn('w-4 h-4', active ? 'text-teal-800' : secondary ? 'text-slate-300' : 'text-slate-400')}
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

          <div className="px-5 pb-5 border-t border-slate-100">
            <Link href="/demo" className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
              <FlaskConical className="w-3.5 h-3.5" />
              Demo Hub
            </Link>
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
              <Link href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
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
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Menu"
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 active:bg-slate-50 transition-colors"
                >
                  {menuOpen ? <X className="w-4 h-4" /> : <MenuIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Menu Drawer */}
          {menuOpen ? (
            <div className="md:hidden fixed inset-0 z-[60]">
              <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-0 bottom-0 w-[84%] max-w-xs bg-white shadow-2xl flex flex-col overflow-y-auto">
                <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white z-10">
                  <div>
                    <p className="text-sm font-black text-ink leading-none">CityOS Menu</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Calabar · Prototype</p>
                  </div>
                  <button
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close menu"
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-6">
                  {navGroups.map((group) => (
                    <div key={group.label}>
                      <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                        {group.label}
                      </h3>
                      <div>
                        {group.items.map((item) => {
                          const active = isActive(item.path);
                          const secondary = item.secondary;
                          return (
                            <Link
                              key={item.id}
                              href={item.path}
                              onClick={() => setMenuOpen(false)}
                              className={cn(
                                'w-full flex items-center gap-3 rounded-xl transition-colors',
                                secondary ? 'px-3 py-1.5 text-[12px] font-bold text-slate-400' : 'px-3 py-2.5 text-[13px] font-bold',
                                active
                                  ? 'bg-teal-50 text-teal-900'
                                  : secondary
                                    ? ''
                                    : 'text-slate-600 hover:bg-slate-50',
                              )}
                            >
                              <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-teal-800' : secondary ? 'text-slate-300' : 'text-slate-400')} />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
                <div className="px-4 pb-6 border-t border-slate-100 pt-4">
                  <Link
                    href="/demo"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-50 text-[11px] font-bold text-slate-500 transition-colors"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    Demo Hub
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

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
              { id: 'profile', path: '/profile', label: 'Profile', icon: UserIcon },
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