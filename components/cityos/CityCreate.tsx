'use client';

import Link from 'next/link';
import {
  PenSquare,
  PackagePlus,
  Wrench,
  Briefcase,
  CalendarPlus,
  HousePlus,
  Users,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Store,
  UtensilsCrossed,
  Building2,
  Ticket,
  Plus,
} from 'lucide-react';

import { SectionHead } from '@/components/cityos/CityUI';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';

interface CreateAction {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  href: string;
  tone: string;
  label: string;
}

const ACTIONS: CreateAction[] = [
  { icon: PenSquare, title: 'Post to the feed', desc: 'An offer, an ask, or a city notice for everyone.', href: '/feed/new', tone: 'from-orange-500 to-amber-500', label: 'Compose' },
  { icon: PackagePlus, title: 'List a product', desc: 'Manage your retail inventory via ShopOS or post a direct deal.', href: '/feed/new?category=Offer', tone: 'from-teal-800 to-emerald-600', label: 'List Deal' },
  { icon: Wrench, title: 'Request a service', desc: 'AC, cleaning, installs — quoted before work starts.', href: '/services', tone: 'from-sky-700 to-cyan-500', label: 'Services' },
  { icon: Briefcase, title: 'Post a job', desc: 'Publish organization roles and openings to the city job board.', href: '/business?action=post-job', tone: 'from-indigo-700 to-brand-600', label: 'Post Opening' },
  { icon: CalendarPlus, title: 'Create an event', desc: 'Host a concert, meetup, tasting, party, or festival as yourself or a business.', href: '/events/create', tone: 'from-fuchsia-700 to-brand-500', label: 'Host Event' },
  { icon: HousePlus, title: 'List a property', desc: 'List short-lets, apartments, guest houses, hotels, or rental homes on CityStay.', href: '/stay/create', tone: 'from-amber-700 to-orange-500', label: 'List Stay' },
  { icon: Users, title: 'Start a community', desc: 'Post to the neighbourhood circle and city notice board.', href: '/community', tone: 'from-emerald-700 to-teal-500', label: 'Community' },
  { icon: GraduationCap, title: 'Register a school', desc: 'Create your digital campus on EduOS.', href: '/school/onboarding', tone: 'from-blue-700 to-indigo-500', label: 'Education' },
];

export default function CityCreate() {
  const { openCreateModal } = useAccountSwitcher();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-7 md:p-8 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Create
          </span>
          <h1 className="mt-3 text-2xl md:text-3xl font-black tracking-tight">Put something in your city.</h1>
          <p className="mt-2 text-teal-50/80 text-[13px] font-medium max-w-xl leading-relaxed">
            Create is the front door for participating in the city ecosystem — resident posts, events, business pages, service quotes, and more.
          </p>
        </div>
      </div>

      {/* Facebook-style Business Page Creator Callout */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-teal-700/50">
        <div className="space-y-2 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
            ⭐ Instant Setup
          </div>
          <h2 className="text-xl font-black tracking-tight">Create a Business Page</h2>
          <p className="text-xs text-teal-100/80 font-medium leading-relaxed">
            Start selling or providing services across CityConnect. Create a dedicated page for your retail store, restaurant, service trade, school, or hotel with 1-click account switching.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => openCreateModal('RETAIL')}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors flex items-center gap-1"
            >
              <Store className="w-3 h-3 text-emerald-400" /> Retail Store
            </button>
            <button
              onClick={() => openCreateModal('RESTAURANT')}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors flex items-center gap-1"
            >
              <UtensilsCrossed className="w-3 h-3 text-amber-400" /> Restaurant
            </button>
            <button
              onClick={() => openCreateModal('SERVICES')}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors flex items-center gap-1"
            >
              <Wrench className="w-3 h-3 text-cyan-400" /> Services
            </button>
            <button
              onClick={() => openCreateModal('SCHOOL')}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors flex items-center gap-1"
            >
              <GraduationCap className="w-3 h-3 text-indigo-400" /> School
            </button>
            <button
              onClick={() => openCreateModal('HOTEL')}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors flex items-center gap-1"
            >
              <Building2 className="w-3 h-3 text-purple-400" /> Hotel
            </button>
            <Link
              href="/events/create"
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 text-[11px] font-bold transition-colors flex items-center gap-1"
            >
              <Ticket className="w-3 h-3 text-rose-400" /> Host an Event →
            </Link>
          </div>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="px-5 py-3 rounded-2xl bg-white text-teal-950 hover:bg-teal-50 font-black text-xs shadow-lg transition-all flex items-center gap-2 shrink-0 hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create New Page
        </button>
      </div>

      <section>
        <SectionHead title="What would you like to do?" sub="Pick an action to start building in CityOS" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACTIONS.map((a) => (
            <Link
              key={a.title}
              href={a.href}
              className="group bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-start gap-4"
            >
              <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.tone} text-white flex items-center justify-center shadow-md shrink-0`}>
                <a.icon className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-black text-ink">{a.title}</p>
                </div>
                <p className="text-[12px] text-slate-500 font-medium mt-0.5 leading-snug">{a.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-teal-800">
                  {a.label} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}