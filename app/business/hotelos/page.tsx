import React from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calculator, 
  CalendarDays, 
  LayoutDashboard,
  ShieldCheck,
  Globe,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export const metadata = {
  title: 'HOTELOS | CityConnect',
  description: 'The complete operating system for modern educational institutions.',
};

export default function HOTELOSLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white" size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">CityOS <span className="text-blue-600">HOTEL</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#features" className="hover:text-blue-600 transition-colors">Features</Link>
            <Link href="#portals" className="hover:text-blue-600 transition-colors">Portals</Link>
            <Link href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Sign In</Link>
            <Link href="/business/HOTELos/register" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40">
              Register Institution
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-50 -z-10"></div>
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-medium text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Now available for K-12 and Universities
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            The Complete Operating System <br className="hidden lg:block"/> for Modern HOTELs.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Replace dozens of disconnected tools. HOTELOS unifies your admissions, grading, finance, and parent communications into one beautiful, centralized platform on CityConnect.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/business/HOTELos/register" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 flex items-center justify-center gap-2">
              Start Free Setup <ArrowRight size={20} />
            </Link>
            <Link href="#features" className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-8 py-4 rounded-full text-lg font-bold transition-colors flex items-center justify-center">
              Explore Features
            </Link>
          </div>
        </div>

        {/* Hero Dashboard Preview */}
        <div className="max-w-5xl mx-auto mt-20 relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10 rounded-2xl"></div>
          <div className="bg-white p-2 rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden transform perspective-1000 rotate-x-2 scale-95 origin-bottom">
            <div className="bg-slate-100 rounded-xl overflow-hidden flex border border-slate-200">
              {/* Fake Sidebar */}
              <div className="w-64 bg-slate-900 text-slate-300 p-4 hidden md:block border-r border-slate-800">
                <div className="flex items-center gap-2 mb-8 text-white"><GraduationCap/> <span className="font-bold">Admin Portal</span></div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-blue-600 text-white px-3 py-2 rounded-lg font-medium"><LayoutDashboard size={18}/> Dashboard</div>
                  <div className="flex items-center gap-3 px-3 py-2 text-slate-400"><Users size={18}/> Directory</div>
                  <div className="flex items-center gap-3 px-3 py-2 text-slate-400"><BookOpen size={18}/> Academics</div>
                  <div className="flex items-center gap-3 px-3 py-2 text-slate-400"><Calculator size={18}/> Finance</div>
                </div>
              </div>
              {/* Fake Content */}
              <div className="flex-1 bg-slate-50 p-6 h-[400px]">
                <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6"></div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="h-24 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                    <div className="h-4 w-24 bg-slate-100 rounded mb-3"></div>
                    <div className="h-8 w-16 bg-blue-100 rounded"></div>
                  </div>
                  <div className="h-24 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                    <div className="h-4 w-24 bg-slate-100 rounded mb-3"></div>
                    <div className="h-8 w-16 bg-purple-100 rounded"></div>
                  </div>
                  <div className="h-24 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                    <div className="h-4 w-24 bg-slate-100 rounded mb-3"></div>
                    <div className="h-8 w-16 bg-emerald-100 rounded"></div>
                  </div>
                </div>
                <div className="h-64 bg-white border border-slate-200 rounded-xl shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">Everything your HOTEL needs, <br/><span className="text-blue-600">out of the box.</span></h2>
            <p className="text-lg text-slate-500">Stop juggling multiple software subscriptions. HOTELOS provides native, interconnected modules for every department.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50", title: "Academics & Grading", desc: "Digital gradebooks, report card generation, and automated end-of-year promotion panels." },
              { icon: Calculator, color: "text-emerald-600", bg: "bg-emerald-50", title: "Finance & Tuition", desc: "Automate fee collection, generate digital invoices, and track outstanding balances instantly." },
              { icon: Users, color: "text-purple-600", bg: "bg-purple-50", title: "Admissions CRM", desc: "Capture leads from your website, track application statuses, and manage enrollment seamlessly." },
              { icon: ShieldCheck, color: "text-orange-600", bg: "bg-orange-50", title: "Unified Portals", desc: "7 distinct portals for Admins, Teachers, Parents, Students, and more. Total access control." },
              { icon: Globe, color: "text-pink-600", bg: "bg-pink-50", title: "Microsite Builder", desc: "Generate a beautiful, public-facing HOTEL website with drag-and-drop themes in seconds." },
              { icon: CalendarDays, color: "text-indigo-600", bg: "bg-indigo-50", title: "Attendance & Events", desc: "Track daily roll calls, sync HOTEL holidays, and organize PTA meetings on a global calendar." }
            ].map((feature, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-100 hover:shadow-lg transition-all group">
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
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Ready to digitize your campus?</h2>
          <p className="text-xl text-slate-300 mb-10">Join the growing network of educational institutions utilizing CityConnect to streamline their operations.</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <Link href="/business/HOTELos/register" className="w-full sm:w-auto bg-blue-500 hover:bg-blue-400 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2">
              Create Your HOTEL <ArrowRight size={20} />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-slate-400">
            <span className="flex items-center gap-2"><CheckCircle2 className="text-emerald-400" size={18}/> No credit card required</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="text-emerald-400" size={18}/> 14-day free trial</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="text-emerald-400" size={18}/> Instant Setup</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} CityConnect HOTELOS. All rights reserved.</p>
      </footer>
    </div>
  );
}

