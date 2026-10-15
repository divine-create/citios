import React from 'react';
import Link from 'next/link';
import { 
  Building2, 
  BedDouble, 
  CalendarCheck, 
  Receipt, 
  UtensilsCrossed, 
  Sparkles,
  ShieldCheck,
  Globe,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';

export const metadata = {
  title: 'HotelOS | CityConnect',
  description: 'The complete hospitality operating system for modern hotels, resorts, and lodges.',
};

export default function HotelOSLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-amber-200">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center shadow-sm">
              <Building2 className="text-white" size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">CityOS <span className="text-amber-600">HotelOS</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#features" className="hover:text-amber-600 transition-colors">Features</Link>
            <Link href="#modules" className="hover:text-amber-600 transition-colors">Modules</Link>
            <Link href="#pricing" className="hover:text-amber-600 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Sign In</Link>
            <Link href="/business/hotelos/register" className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-amber-600/20 hover:shadow-amber-600/40">
              Register Hotel
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/70 via-slate-50 to-slate-50 -z-10"></div>
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-medium text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="flex h-2 w-2 rounded-full bg-amber-600 animate-pulse"></span>
            Purpose-built for boutique hotels, lodges, and luxury resorts
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            The Complete Operating System <br className="hidden lg:block"/> for Modern Hospitality.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Replace fragmented property software. HotelOS unifies room reservations, visual tape charts, front desk check-in, guest folios, housekeeping, and outlet POS into one connected platform on CityConnect.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/business/hotelos/register" className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl shadow-amber-600/20 hover:shadow-amber-600/40 flex items-center justify-center gap-2">
              Launch Your Property <ArrowRight size={20} />
            </Link>
            <Link href="#features" className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-8 py-4 rounded-full text-lg font-bold transition-colors flex items-center justify-center">
              Explore Suite
            </Link>
          </div>
        </div>

        {/* Hero Dashboard Preview */}
        <div className="max-w-5xl mx-auto mt-20 relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10 rounded-2xl"></div>
          <div className="bg-white p-2.5 rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
            <div className="bg-slate-900 rounded-xl overflow-hidden flex border border-slate-800">
              {/* Hotel Manager Sidebar Preview */}
              <div className="w-64 bg-slate-950 text-slate-300 p-4 hidden md:block border-r border-slate-800">
                <div className="flex items-center gap-2.5 mb-8 text-white">
                  <div className="w-7 h-7 bg-amber-600 rounded-lg flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  <span className="font-bold text-sm">General Manager</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-3 bg-amber-600/20 text-amber-400 border border-amber-600/30 px-3 py-2 rounded-lg font-medium"><Layers size={16}/> Manager Console</div>
                  <div className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white"><CalendarCheck size={16}/> Tape Chart</div>
                  <div className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white"><BedDouble size={16}/> Room Inventory</div>
                  <div className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white"><Receipt size={16}/> Folio Billing</div>
                  <div className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white"><Sparkles size={16}/> Housekeeping</div>
                  <div className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white"><UtensilsCrossed size={16}/> Outlet POS</div>
                </div>
              </div>
              {/* Hotel Content Preview */}
              <div className="flex-1 bg-slate-50 p-6 h-[380px]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Property Overview · Grand Royal Hotel</h3>
                    <p className="text-xs text-slate-500">Live Occupancy: 84% · 42 Rooms Checked In</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">Night Audit Ready</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                    <p className="text-xs text-slate-400 font-bold uppercase">Today&apos;s Revenue</p>
                    <p className="text-xl font-black text-slate-900 mt-1">₦1,840,000</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                    <p className="text-xs text-slate-400 font-bold uppercase">Arrivals / Departures</p>
                    <p className="text-xl font-black text-amber-700 mt-1">14 / 9</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                    <p className="text-xs text-slate-400 font-bold uppercase">Housekeeping Clean</p>
                    <p className="text-xl font-black text-emerald-700 mt-1">38 of 45</p>
                  </div>
                </div>
                <div className="h-44 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-center text-xs text-slate-400">
                  Interactive Tape Chart & Room Timeline Grid
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">Everything your hotel needs, <br/><span className="text-amber-600">under one unified roof.</span></h2>
            <p className="text-lg text-slate-500">From guest booking to night audit, HotelOS provides interconnected, zero-latency workflows for your entire team.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: CalendarCheck, color: "text-amber-600", bg: "bg-amber-50", title: "Visual Tape Chart", desc: "Drag-and-drop reservations across room types, dates, and blocks with real-time occupancy heatmaps." },
              { icon: Receipt, color: "text-emerald-600", bg: "bg-emerald-50", title: "Guest Folios & Invoicing", desc: "Split guest bills, bill corporate masters, route restaurant charges, and accept instant settlements." },
              { icon: Sparkles, color: "text-blue-600", bg: "bg-blue-50", title: "Live Housekeeping", desc: "Real-time room status tracking (Clean, Dirty, Inspected, Out-of-Order) with maid assign and turnover alerts." },
              { icon: UtensilsCrossed, color: "text-purple-600", bg: "bg-purple-50", title: "Restaurant & Bar POS", desc: "Built-in outlet point-of-sale for poolside bars, room service, and restaurants directly charged to room folios." },
              { icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50", title: "Automated Night Audit", desc: "Post room & tax, reconcile cash drawers, balance ledgers, and archive daily managerial reports in one click." },
              { icon: Globe, color: "text-pink-600", bg: "bg-pink-50", title: "Microsite & Direct Bookings", desc: "Commission-free direct booking engine and branded hotel website built directly on the CityConnect platform." }
            ].map((feature, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:shadow-lg transition-all group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${feature.bg} ${feature.color}`}>
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & CTA */}
      <section className="py-24 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-600/15 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Ready to upgrade your property?</h2>
          <p className="text-xl text-slate-300 mb-10">Join hospitality leaders using CityConnect HotelOS to deliver world-class guest experiences and maximize RevPAR.</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <Link href="/business/hotelos/register" className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2">
              Register Your Hotel <ArrowRight size={20} />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-slate-400">
            <span className="flex items-center gap-2"><CheckCircle2 className="text-emerald-400" size={18}/> Zero setup fees</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="text-emerald-400" size={18}/> Dedicated account support</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="text-emerald-400" size={18}/> Instant Front Desk activation</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} CityConnect HotelOS. All rights reserved.</p>
      </footer>
    </div>
  );
}
