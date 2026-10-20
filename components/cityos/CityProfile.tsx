'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Wallet, Plus, ChevronRight, Package, Car, Banknote, Truck, Bookmark, Settings, ArrowUp, Camera, Loader2, Bell, Shield, Share2, Copy, Check, LogOut, User, MapPin, CreditCard } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';

// Client wallet display top-up (fictional until the server ledger is wired).
const TOP_UP_AMOUNT = 50000;
import { Pill, Money, ChipButton, getTwoLetterInitials } from '@/components/cityos/CityUI';
import { useWallet } from '@/components/cityos/WalletStore';
import { useExperience } from '@/components/cityos/ExperienceStore';

import { cn } from '@/lib/utils';
import { fetchMyOrders } from '@/app/actions/commerce';
import { getProfileAndWallet, updateProfileAvatar } from '@/lib/actions/profile';
import { signOut } from 'next-auth/react';

const ALL_TABS = ['Orders', 'Payments', 'CityHouse', 'Saved', 'Settings'] as const;
type Tab = (typeof ALL_TABS)[number];

export default function CityProfile({ citypayEnabled = false }: { citypayEnabled?: boolean }) {
  const { fmt } = useMoney();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const defaultTab = ALL_TABS.find((t) => t.toLowerCase() === tabParam?.toLowerCase()) || 'Orders';
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (tabParam) {
      const matched = ALL_TABS.find((t) => t.toLowerCase() === tabParam.toLowerCase());
      if (matched) setTab(matched);
    }
  }, [tabParam]);
  const { balance, topUp, transactions } = useWallet();
  const { experience } = useExperience();
  const [toppedUp, setToppedUp] = useState(false);
  const visibleTabs = ALL_TABS.filter((t) => (t === 'Payments' ? citypayEnabled : true));

  const [realOrders, setRealOrders] = useState<any[] | null>(null);
  const [ordersError, setOrdersError] = useState(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfileAndWallet()
      .then(data => { if (data && data.user) setUserProfile(data.user); })
      .catch(console.error);

    fetchMyOrders()
      .then((orders: any) => {
        if (Array.isArray(orders)) {
          setRealOrders(orders);
        } else {
          setRealOrders([]);
        }
        setOrdersError(false);
      })
      .catch((err: any) => {
        console.error(err);
        setRealOrders([]);
        setOrdersError(true);
      });
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Photo must be less than 5MB');
      return;
    }
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Failed to upload image');
      }
      await updateProfileAvatar(data.url);
      setUserProfile((prev: any) => ({ ...prev, avatarUrl: data.url, image: data.url }));
    } catch (err) {
      console.error(err);
      setAvatarError('Failed to upload profile photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const walletPct = Math.min(100, Math.round((balance / 200000) * 100));

  const addToWallet = () => {
    topUp(TOP_UP_AMOUNT);
    setToppedUp(true);
  };

  const tabs = (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      {visibleTabs.map((t) => (
        <ChipButton key={t} active={tab === t} onClick={() => setTab(t)}>
          {t}
        </ChipButton>
      ))}
    </div>
  );

  const displayAvatar = userProfile?.avatarUrl || userProfile?.image;
  const initials = getTwoLetterInitials(
    userProfile?.name ||
    (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'ME')
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        <div className="relative group">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt="Profile"
              className="w-20 h-20 rounded-3xl object-cover shadow-lg border border-slate-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-teal-800/20">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            title="Upload profile picture"
            className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full bg-teal-800 hover:bg-teal-900 text-white flex items-center justify-center ring-2 ring-white shadow transition-transform group-hover:scale-110 disabled:opacity-50"
          >
            {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-ink">{userProfile?.name || 'Resident'}</h1>
          <p className="text-[13px] text-slate-500 font-medium mt-0.5">
            Resident • Calabar
          </p>
          <p className="text-[12px] text-slate-400 font-medium mt-1">Verified 9jaLive User</p>
        </div>
        <div className="flex gap-2">
          <Link href="/profile/edit" className="px-4 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Edit profile</Link>
        </div>
      </div>

      {/* Wallet (shown only when CityPay is enabled in Admin HQ) */}
      {citypayEnabled && (
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row gap-5 sm:items-end justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[10px] font-black text-teal-200 uppercase tracking-widest">
                <Wallet className="w-3.5 h-3.5" /> CityPay wallet
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight">{fmt(balance)}</p>
              <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-teal-200/80">
                <span>{userProfile?.id ? `ID-${userProfile.id.slice(0, 6).toUpperCase()}` : 'WALLET'}</span>
                <span>·</span>
                <span>{toppedUp ? 'just topped up' : 'all good'}</span>
              </div>
              <div className="mt-3 h-1.5 w-40 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${walletPct}%` }} />
              </div>
            </div>
            <button
              onClick={addToWallet}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-teal-950 text-xs font-black hover:bg-teal-50 transition-colors shadow-lg shrink-0"
            >
              <ArrowUp className="w-4 h-4" /> {`Top up ${fmt(TOP_UP_AMOUNT)}`}
            </button>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className={cn('grid gap-3', citypayEnabled ? 'grid-cols-4' : 'grid-cols-3')}>
        {[
          { label: 'Orders', value: realOrders?.length || 0, icon: Package },
          { label: 'Rides', value: 0, icon: Car },
          ...(citypayEnabled ? [{ label: 'Payments', value: 0, icon: Banknote }] : []),
          { label: 'Deliveries', value: 0, icon: Truck },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <s.icon className="w-4 h-4 mx-auto text-teal-700" />
            <p className="text-lg font-black text-ink mt-1.5">{s.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Experience switcher */}
      <Link href="/business" className="flex items-center gap-4 rounded-2xl bg-white border border-slate-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
        <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-teal-100 text-indigo-800 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-black text-ink">Experience: {experience}</p>
          </div>
          <p className="text-[11px] font-bold text-slate-400">Store owner, service provider, hotel, or school — manage your business profiles via Workspaces.</p>
        </div>
        <ChevronRight className="w-4 h-4 text-teal-800 shrink-0" />
      </Link>

      {tabs}

      {/* Tab content */}
      {tab === 'Orders' ? (
        <div className="space-y-3">
          {ordersError ? (
            <div className="rounded-2xl border border-dashed border-red-200 bg-white p-6 text-center">
              <p className="text-[13px] font-black text-red-600">Failed to load orders</p>
              <p className="text-[11px] text-red-400 font-medium mt-1">There was a problem communicating with the database.</p>
            </div>
          ) : !realOrders ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
              <p className="text-[13px] font-black text-slate-500 animate-pulse">Loading orders...</p>
            </div>
          ) : !Array.isArray(realOrders) || realOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
              <p className="text-[13px] font-black text-ink">No orders yet</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1 mb-3">
                {citypayEnabled ? 'Fresh from the market, paid with CityPay.' : 'Explore verified local shops and kitchens across Calabar.'}
              </p>
              <Link href="/market" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-teal-800 text-white text-[11px] font-black">
                Explore Market <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <>
              {realOrders.map((o: any) => {
                const merchantName = o.merchant || o.organization?.name || o.org?.name || 'Local Store';
                const ref = o.ref || (o.id ? `#${o.id.slice(0, 8).toUpperCase()}` : '#ORDER');
                const itemCount = Array.isArray(o.items) ? o.items.length : (typeof o.items === 'number' || typeof o.items === 'string' ? o.items : 1);
                const orderTime = o.time || (o.createdAt ? new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recently');
                const totalVal = typeof o.total === 'number' ? o.total : typeof o.totalAmount === 'number' ? o.totalAmount : 0;
                const statusLabel = o.status === 'enroute' ? 'En route' : o.status === 'packing' ? 'Packing' : o.status === 'paid' || o.status === 'completed' || o.status === 'COMPLETED' ? 'Paid' : 'Delivered';

                return (
                  <div key={o.id ?? o.ref} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-black text-ink truncate">{merchantName}</p>
                        <Pill tone={o.status === 'enroute' ? 'orange' : 'green'} className="shrink-0">
                          {statusLabel}
                        </Pill>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">{`${ref} · ${itemCount} ${itemCount === 1 ? 'item' : 'items'} · ${orderTime}`}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[15px] font-black text-ink">{fmt(totalVal)}</p>
                      {o.status === 'enroute' ? (
                        <Link href="/drive/delivery" className="text-[10px] font-bold text-teal-800 hover:underline">Track ▲</Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                <p className="text-[13px] font-black text-ink">Start another order</p>
                <p className="text-[11px] text-slate-400 font-medium mt-1 mb-3">
                  {citypayEnabled ? 'Fresh from the market, paid with CityPay.' : 'Explore verified local shops and kitchens across Calabar.'}
                </p>
                <Link href="/market" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-teal-800 text-white text-[11px] font-black">
                  Explore Market <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      ) : tab === 'Payments' && citypayEnabled ? (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
            {transactions.map((t) => (
              <div key={t.ref} className="px-5 py-3.5 flex items-center gap-3">
                <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', t.amount < 0 ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-600')}>
                  {t.amount < 0 ? '−' : '+'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{t.note}</p>
                  <p className="text-[11px] font-bold text-slate-400">{`${t.ref} · ${t.at}`}</p>
                </div>
                <Money amount={t.amount} className={cn('text-[15px]', t.amount < 0 && 'text-red-600')} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-teal-50/70 ring-1 ring-teal-100">
            <span className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-ink">Every spend moves the same wallet</p>
              <p className="text-[11px] font-bold text-slate-400">Holds, consults, deposits and orders land here in real time.</p>
            </div>
          </div>
        </div>
      ) : tab === 'CityHouse' ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
            <p className="text-[13px] font-black text-ink">No home on file</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Rental listings and tenant accounts aren&apos;t part of the live system yet.
            </p>
          </div>
        </div>
      ) : tab === 'Saved' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
            <span className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </span>
            <p className="text-[12px] font-bold text-slate-500">
              Saved businesses, products, jobs, events and places appear here.{' '}
              <Link href="/saved" className="text-teal-800">View all</Link>
            </p>
            <Link href="/saved" className="ml-auto text-[11px] font-bold text-teal-800 hover:underline shrink-0">Open Saved</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden shadow-xs">
            <Link href="/profile/edit" className="px-5 py-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors block">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-black text-ink">Personal Information</p>
                <p className="text-[11px] font-bold text-slate-400 truncate">Name, phone number, DOB, and interests</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </Link>

            <Link href="/profile/edit" className="px-5 py-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors block">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-black text-ink">Delivery Address</p>
                <p className="text-[11px] font-bold text-slate-400 truncate">
                  {userProfile?.residentProfile?.defaultDeliveryAddress || 'Set your default doorstep delivery address'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </Link>

            <Link href="/notifications" className="px-5 py-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors block">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-black text-ink">Notifications & Alerts</p>
                <p className="text-[11px] font-bold text-slate-400 truncate">Orders, service requests, and community alerts</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </Link>

            {citypayEnabled && (
              <Link href="/wallet" className="px-5 py-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors block">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[13px] font-black text-ink">Payment Methods & Wallet</p>
                  <p className="text-[11px] font-bold text-slate-400 truncate">Manage CityPay balance, cards, and bank settlements</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </Link>
            )}

            <Link href="/profile/edit" className="px-5 py-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors block">
              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-800 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-black text-ink">Account Security & Password</p>
                <p className="text-[11px] font-bold text-slate-400 truncate">Set or change your email login password</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </Link>

            <div className="px-5 py-4 flex items-center gap-3.5 bg-slate-50/50">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-black text-ink">Citizen Referral Code</p>
                <p className="text-[11px] font-mono font-bold text-slate-500">
                  {userProfile?.id ? `REF-${userProfile.id.slice(0, 8).toUpperCase()}` : 'REF-9JALIVE'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (userProfile?.id) {
                    navigator.clipboard.writeText(`REF-${userProfile.id.slice(0, 8).toUpperCase()}`);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-black text-slate-700 transition-colors inline-flex items-center gap-1 shrink-0"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>

            <button
              onClick={() => signOut()}
              className="w-full px-5 py-4 flex items-center gap-3.5 hover:bg-red-50/40 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-black text-red-600">Sign Out</p>
                <p className="text-[11px] font-bold text-slate-400">Log out of your 9jaLive resident account</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100/80 flex items-start gap-3">
            <Shield className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />
            <div className="text-[11px] text-teal-900 leading-relaxed">
              <span className="font-black">Privacy First:</span> Your profile is private by default. Only verified orders sent to stores and published community posts are visible to neighbors.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}