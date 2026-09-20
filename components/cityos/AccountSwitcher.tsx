'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  User as UserIcon,
  ChevronDown,
  Check,
  Plus,
  Store,
  UtensilsCrossed,
  Wrench,
  GraduationCap,
  Building2,
  Ticket,
  Stethoscope,
  Building,
  Settings,
  LogOut,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import { useAccountSwitcher, type BusinessAccount } from '@/components/cityos/AccountSwitcherContext';
import { cn } from '@/lib/utils';

const VERTICAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  RETAIL: Store,
  RESTAURANT: UtensilsCrossed,
  SERVICES: Wrench,
  SCHOOL: GraduationCap,
  HOTEL: Building2,
  EVENT_ORGANIZER: Ticket,
  HEALTHCARE: Stethoscope,
};

const VERTICAL_NAMES: Record<string, string> = {
  RETAIL: 'ShopOS',
  RESTAURANT: 'RestaurantOS',
  SERVICES: 'ServiceOS',
  SCHOOL: 'SchoolOS',
  HOTEL: 'HotelOS',
  EVENT_ORGANIZER: 'EventsOS',
  HEALTHCARE: 'ClinicOS',
};

const VERTICAL_GRADIENTS: Record<string, string> = {
  RETAIL: 'from-emerald-700 to-teal-600',
  RESTAURANT: 'from-orange-600 to-amber-500',
  SERVICES: 'from-cyan-700 to-sky-600',
  SCHOOL: 'from-blue-700 to-indigo-600',
  HOTEL: 'from-purple-700 to-violet-600',
  EVENT_ORGANIZER: 'from-rose-700 to-pink-600',
  HEALTHCARE: 'from-teal-800 to-emerald-700',
};

export default function AccountSwitcher({ className }: { className?: string }) {
  const { data: session } = useSession();
  const {
    myBusinesses,
    activeBusiness,
    isPersonal,
    openCreateModal,
    switchToBusiness,
    switchToPersonal,
  } = useAccountSwitcher();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!session) return null;

  const userName = session.user?.name || 'Resident';
  const userImage = session.user?.image;
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const ActiveIcon = activeBusiness
    ? VERTICAL_ICONS[activeBusiness.type] || Building
    : null;

  return (
    <div className={cn('relative inline-block text-left', className)} ref={menuRef}>
      {/* Switcher Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition-all duration-200 select-none',
          activeBusiness
            ? 'bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100/60'
            : 'bg-white border-slate-200/80 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
        )}
        title="Switch Account or Page"
      >
        {/* Current Avatar */}
        {activeBusiness ? (
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm bg-gradient-to-br',
              VERTICAL_GRADIENTS[activeBusiness.type] || 'from-slate-700 to-slate-900'
            )}
          >
            {ActiveIcon ? <ActiveIcon className="w-3.5 h-3.5" /> : activeBusiness.name[0]}
          </div>
        ) : userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userImage}
            alt={userName}
            className="w-7 h-7 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-teal-800 text-white flex items-center justify-center text-[11px] font-bold">
            {userInitials}
          </div>
        )}

        {/* Current Name / Context */}
        <div className="hidden sm:flex flex-col text-left leading-none max-w-[130px]">
          <span className="text-[12px] font-black text-ink truncate">
            {activeBusiness ? activeBusiness.name : userName}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            {activeBusiness
              ? `${VERTICAL_NAMES[activeBusiness.type] || activeBusiness.type}`
              : 'Personal Account'}
          </span>
        </div>

        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-slate-700'
          )}
        />
      </button>

      {/* Facebook-style Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-white shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Card: Who you are right now */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              Currently acting as
            </p>
            <div className="flex items-center gap-3">
              {activeBusiness ? (
                <div
                  className={cn(
                    'w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shadow bg-gradient-to-br shrink-0',
                    VERTICAL_GRADIENTS[activeBusiness.type] || 'from-slate-700 to-slate-900'
                  )}
                >
                  {ActiveIcon ? <ActiveIcon className="w-5 h-5" /> : activeBusiness.name[0]}
                </div>
              ) : userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt={userName}
                  className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center text-sm font-black shrink-0">
                  {userInitials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-ink truncate">
                  {activeBusiness ? activeBusiness.name : userName}
                </p>
                <p className="text-[11px] font-bold text-teal-800 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
                  {activeBusiness
                    ? `${VERTICAL_NAMES[activeBusiness.type] || activeBusiness.type} Workspace`
                    : 'Personal Citizen Account'}
                </p>
              </div>
            </div>
          </div>

          {/* Profiles and Pages List */}
          <div className="py-2 max-h-[300px] overflow-y-auto">
            <p className="px-4 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Profiles & Pages
            </p>

            {/* 1. Personal Profile Option */}
            <button
              onClick={() => {
                switchToPersonal();
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors',
                isPersonal ? 'bg-teal-50/70 text-teal-900' : 'hover:bg-slate-50 text-slate-700'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userImage}
                    alt={userName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {userInitials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-black text-ink truncate">{userName}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Personal profile</p>
                </div>
              </div>
              {isPersonal ? <Check className="w-4 h-4 text-teal-700 shrink-0" /> : null}
            </button>

            {/* 2. Business Pages List */}
            {myBusinesses.map((biz) => {
              const BizIcon = VERTICAL_ICONS[biz.type] || Building;
              const isSelected = activeBusiness?.id === biz.id;

              return (
                <button
                  key={biz.id}
                  onClick={() => {
                    switchToBusiness(biz);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors',
                    isSelected ? 'bg-teal-50/70 text-teal-900' : 'hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br shadow-xs',
                        VERTICAL_GRADIENTS[biz.type] || 'from-slate-700 to-slate-900'
                      )}
                    >
                      <BizIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-ink truncate">{biz.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">
                        {VERTICAL_NAMES[biz.type] || biz.type} · {biz.role.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  {isSelected ? <Check className="w-4 h-4 text-teal-700 shrink-0" /> : null}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 my-1" />

          {/* Action: Create a new Business Page */}
          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                openCreateModal();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all shadow-sm group"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <span>Create a Business Page</span>
              <Sparkles className="w-3.5 h-3.5 ml-auto text-teal-200" />
            </button>
          </div>

          <div className="border-t border-slate-100 my-1" />

          {/* Quick Links */}
          <div className="px-2 space-y-0.5 text-xs font-bold text-slate-600">
            <Link
              href="/business"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Store className="w-4 h-4 text-slate-400" />
              <span>Business Hub</span>
            </Link>
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Profile Settings</span>
            </Link>
            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A persistent banner shown when a user is actively managing a business page
 * or inside a workspace, offering a 1-click switch back to their personal citizen profile.
 */
export function ActiveBusinessBanner() {
  const { activeBusiness, isPersonal, switchToPersonal, openCreateModal } = useAccountSwitcher();

  if (isPersonal || !activeBusiness) return null;

  const Icon = VERTICAL_ICONS[activeBusiness.type] || Building;

  return (
    <div className="mb-4 bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-amber-500/10 border border-amber-200/80 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-300">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs bg-gradient-to-br shadow-xs shrink-0',
            VERTICAL_GRADIENTS[activeBusiness.type] || 'from-slate-700 to-slate-900'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="text-xs font-black text-ink leading-tight flex items-center gap-1.5">
            Managing: <span className="text-teal-900">{activeBusiness.name}</span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded-md">
              {VERTICAL_NAMES[activeBusiness.type] || activeBusiness.type}
            </span>
          </p>
          <p className="text-[10px] text-slate-500 font-medium">
            You are operating in business mode. Actions apply to this workspace.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={switchToPersonal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-xs transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
          Switch to Personal Account
        </button>
      </div>
    </div>
  );
}
