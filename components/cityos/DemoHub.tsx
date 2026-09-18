'use client';

import Link from 'next/link';
import {
  Sparkles,
  Rss,
  Store,
  ShoppingCart,
  Wallet,
  Truck,
  Car,
  Building2,
  LayoutDashboard,
  User as UserIcon,
  Bell,
  PenSquare,
  Compass,
  ChevronRight,
  FlaskConical,
  Stethoscope,
  BedDouble,
  Map as MapIcon,
  Briefcase,
  Users as UsersIcon,
  Repeat,
} from 'lucide-react';
import { SectionHead, Pill } from '@/components/cityos/CityUI';

const JOURNEYS = [
  {
    icon: Sparkles,
    tone: 'from-brand-600 to-brand-800',
    title: 'Ask → Sleep',
    desc: 'Ask CityOS for a place under ₦10,000 tonight, open the room, and pay the hold with CityPay.',
    steps: [
      { label: 'Ask CityOS', href: '/ai' },
      { label: 'Open the studio', href: '/house/h04' },
      { label: 'Pay hold via CityPay', href: '/house/h04/pay' },
    ],
  },
  {
    icon: Store,
    tone: 'from-teal-800 to-teal-500',
    title: 'Shop → Pay → Track',
    desc: 'Order ogbono from the market, check out with your wallet, then follow the rider home live.',
    steps: [
      { label: 'Calabar Fresh Market', href: '/biz/calabar-fresh' },
      { label: 'Ogbono 1kg', href: '/product/p02' },
      { label: 'Cart', href: '/cart' },
      { label: 'CityPay checkout', href: '/checkout' },
      { label: 'Track delivery', href: '/drive/delivery' },
    ],
  },
  {
    icon: PenSquare,
    tone: 'from-orange-500 to-orange-400',
    title: 'Post → Feed',
    desc: 'Publish an offer or ask to the whole city, then watch it land in the feed.',
    steps: [
      { label: 'Compose', href: '/feed/new' },
      { label: 'City Feed', href: '/feed' },
    ],
  },
  {
    icon: LayoutDashboard,
    tone: 'from-slate-800 to-slate-600',
    title: 'Merchant · one view',
    desc: 'The same sale shows up in the storefront and in the merchant dashboard.',
    steps: [
      { label: 'C. Fresh storefront', href: '/biz/calabar-fresh' },
      { label: 'Business dashboard', href: '/business' },
    ],
  },
  {
    icon: BedDouble,
    tone: 'from-teal-800 to-teal-600',
    title: 'Hotels tonight',
    desc: 'Rooms start under ₦10,000 and a hold is paid straight from the CityPay wallet.',
    steps: [
      { label: 'Rooms tonight', href: '/stay' },
      { label: 'One night at ₦9,200', href: '/stay/bogobiri-stadium-lodge' },
      { label: 'Wallet hold', href: '/profile' },
    ],
  },
  {
    icon: Stethoscope,
    tone: 'from-emerald-700 to-teal-600',
    title: 'Care, booked in-app',
    desc: 'Find the clinic, pick a doctor, and confirm the visit — consult fees leave the wallet.',
    steps: [
      { label: 'Clinics & pharmacies', href: '/care' },
      { label: 'Book a doctor', href: '/care/shepherds-care' },
    ],
  },
  {
    icon: MapIcon,
    tone: 'from-emerald-700 to-teal-600',
    title: 'Map → Anywhere',
    desc: 'One map of Calabar with every marketplace, clinic, school, home and circle pinned to its real neighbourhood.',
    steps: [
      { label: 'City Map', href: '/map' },
      { label: 'A pinned business', href: '/biz/freshmart-calabar' },
    ],
  },
  {
    icon: Repeat,
    tone: 'from-indigo-700 to-brand-600',
    title: 'Switch experience',
    desc: 'Jump between Resident, Store owner, Service provider and School roles — the demo dataset stays one city.',
    steps: [
      { label: 'Demo access', href: '/demo/access' },
      { label: 'Business workspace', href: '/workspaces/shopos/freshmart-calabar' },
      { label: 'Service workspace', href: '/workspaces/serviceos/mikes-ac-services' },
      { label: 'School workspace', href: '/workspaces/schoolos/hope-academy' },
    ],
  },
];

const QUICK_LINKS = [
  { icon: Compass, label: 'Explore', href: '/explore' },
  { icon: Rss, label: 'Feed', href: '/feed' },
  { icon: Store, label: 'A marketplace', href: '/biz/calabar-fresh' },
  { icon: ShoppingCart, label: 'A product', href: '/product/p03' },
  { icon: Wallet, label: 'Checkout', href: '/checkout' },
  { icon: Truck, label: 'Track order', href: '/drive/delivery' },
  { icon: Car, label: 'Book a ride', href: '/drive/ride' },
  { icon: Building2, label: 'CityHouse', href: '/house' },
  { icon: Sparkles, label: 'Ask AI', href: '/ai' },
  { icon: BedDouble, label: 'Hotels', href: '/stay' },
  { icon: Stethoscope, label: 'Clinics', href: '/care' },
  { icon: PenSquare, label: 'Schools', href: '/schools' },
  { icon: Wallet, label: 'Services', href: '/tasks' },
  { icon: Compass, label: 'Events', href: '/events' },
  { icon: Rss, label: 'News', href: '/news' },
  { icon: MapIcon, label: 'City Map', href: '/map' },
  { icon: PenSquare, label: 'Create', href: '/create' },
  { icon: Briefcase, label: 'CityJobs', href: '/jobs' },
  { icon: UsersIcon, label: 'Communities', href: '/community' },
  { icon: Repeat, label: 'Demo Access', href: '/demo/access' },
  { icon: Bell, label: 'Activity', href: '/activity' },
  { icon: UserIcon, label: 'Profile', href: '/profile' },
];

export default function DemoHub() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-7 md:p-10 relative overflow-hidden">
        <div className="absolute -right-14 -top-14 w-56 h-56 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="absolute -left-10 -bottom-16 w-64 h-64 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[10px] font-black uppercase tracking-widest">
            <FlaskConical className="w-3 h-3" /> Hackathon demo hub
          </span>
          <h1 className="mt-4 text-2xl md:text-4xl font-black tracking-tight leading-tight">
            CityOS in 90 seconds
          </h1>
          <p className="mt-3 text-teal-50/80 text-sm font-medium max-w-2xl leading-relaxed">
            {`Eight journeys tie the city together — one app, one identity, one wallet.`}
          </p>
          <div className="mt-5 flex gap-2 flex-wrap text-[11px] font-bold">
            <span className="px-3 py-1.5 rounded-full bg-emerald-400/20 text-emerald-200">47 marketplaces</span>
            <span className="px-3 py-1.5 rounded-full bg-brand-400/20 text-brand-200">₦ naira prices</span>
            <span className="px-3 py-1.5 rounded-full bg-orange-400/20 text-orange-200">Calabar places</span>
          </div>
        </div>
      </div>

      <section>
        <SectionHead title="End-to-end demo journeys" sub="Click-through stories for the judges" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {JOURNEYS.map((j) => (
            <div key={j.title} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 bg-gradient-to-b hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-3">
                <span className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${j.tone} text-white flex items-center justify-center shadow-md shrink-0`}>
                  <j.icon className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-[15px] font-black text-ink">{j.title}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{j.desc}</p>
                </div>
              </div>
              <div className="space-y-2">
                {j.steps.map((s, i) => (
                  <Link key={s.href} href={s.href} className="flex items-center gap-2.5 group">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-[12px] font-bold text-slate-600 group-hover:text-teal-800">{s.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-700 ml-auto" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHead title="Every screen" sub="All routes are live and linked from the shell nav" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {QUICK_LINKS.map((q) => (
            <Link key={q.href + q.label} href={q.href} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4 hover:border-teal-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                <q.icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-black text-ink truncate">{q.label}</p>
                <p className="text-[10px] font-bold text-slate-400 truncate">{q.href}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 p-5">
        <p className="flex items-center gap-2 text-xs font-black text-brand-900 uppercase tracking-widest mb-2">
          <Pill tone="blue">Presenter notes</Pill>
        </p>
        <ul className="text-[13px] text-brand-900/80 font-medium leading-relaxed space-y-1.5">
          <li>• Open Home → tap the AI bar → ask “best room under ₦10,000 tonight”.</li>
          <li>• From any product, add to bag → cart → CityPay checkout → payment success → live delivery track.</li>
          <li>• Pan a market → business dashboard shows the same order numbers.</li>
          <li>• Anything that moves money (holds, consults, deposits, tickets) spends the live wallet and shows in Activity.</li>
          <li>• All data is static demo content — nothing is real, billable, or networked.</li>
        </ul>
      </section>
    </div>
  );
}