'use client';

import Link from 'next/link';
import { PenSquare, PackagePlus, Wrench, Briefcase, CalendarPlus, HousePlus, Users, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';

import { SectionHead, Pill } from '@/components/cityos/CityUI';
import { fetchResidentActivity } from '@/app/actions/activity';
import { useEffect, useState } from 'react';

interface CreateAction {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  href: string;
  tone: string;
  label: string;
  demo?: boolean;
}

const ACTIONS: CreateAction[] = [
  { icon: PenSquare, title: 'Post to the feed', desc: 'An offer, an ask, or a city notice for everyone.', href: '/feed/new', tone: 'from-orange-500 to-amber-500', label: 'Compose', demo: false },
  { icon: PackagePlus, title: 'List a product', desc: 'Manage your retail inventory via ShopOS.', href: '/business', tone: 'from-teal-800 to-emerald-600', label: 'Business', demo: false },
  { icon: Wrench, title: 'Request a service', desc: 'AC, cleaning, installs — quoted before work starts.', href: '/services', tone: 'from-sky-700 to-cyan-500', label: 'Services', demo: false },
  { icon: Briefcase, title: 'Post a job', desc: 'Manage your organization roles and openings.', href: '/business', tone: 'from-indigo-700 to-brand-600', label: 'Business', demo: false },
  { icon: CalendarPlus, title: 'Create an event', desc: 'Host a tasting, a fitting night, a sports day.', href: '/business', tone: 'from-fuchsia-700 to-brand-500', label: 'Business', demo: false },
  { icon: HousePlus, title: 'List a property', desc: 'Manage your properties and rentals.', href: '/business', tone: 'from-amber-700 to-orange-500', label: 'Business', demo: false },
  { icon: Users, title: 'Start a community', desc: 'A neighbourhood circle with its own notice board.', href: '/community', tone: 'from-emerald-700 to-teal-500', label: 'Community', demo: false },
  { icon: GraduationCap, title: 'Register a school', desc: 'Create your digital campus on EduOS.', href: '/school/onboarding', tone: 'from-blue-700 to-indigo-500', label: 'Education', demo: false },
];

export default function CityCreate() {
  const [recent, setRecent] = useState<any[]>([]);
  useEffect(() => {
    fetchResidentActivity().then(a => setRecent(a.slice(0, 5)));
  }, []);
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-7 md:p-8 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Create
          </span>
          <h1 className="mt-3 text-2xl md:text-3xl font-black tracking-tight">Put something in your city.</h1>
          <p className="mt-2 text-teal-50/80 text-[13px] font-medium max-w-xl leading-relaxed">
            Create is the front door for participating in the city ecosystem — resident posts, merchant inventory, service quotes, and more. Select an action to navigate to the relevant management dashboard.
          </p>
        </div>
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

      <section>
        <SectionHead title="Your recent activity" sub="Your recent activity in the city ecosystem" />
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
          {recent.map((a) => (
            <Link key={a.id} href={a.href ?? '#'} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-ink truncate">{a.title}</p>
                <p className="text-[11px] font-bold text-slate-400 truncate">{a.desc}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 shrink-0">{new Date(a.date).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}