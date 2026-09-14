import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { 
  ArrowRight, 
  Store, 
  Barcode, 
  PackageSearch, 
  CreditCard, 
  TrendingUp,
  Globe,
  Users,
  CheckCircle2,
  LayoutDashboard
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'ShopOS | CityConnect Retail System',
  description: 'The ultimate point-of-sale and retail management system.',
};

export default function ShopOSLandingPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <Store size={18} />
            </div>
            CityConnect <span className="text-emerald-600">ShopOS</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 font-medium text-slate-600 text-sm">
            <Link href="#features" className="hover:text-emerald-600 transition-colors">Features</Link>
            <Link href="#hardware" className="hover:text-emerald-600 transition-colors">Hardware</Link>
            <Link href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</Link>
          </div>
          <Link href="/business/register?type=RETAIL" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-md shadow-emerald-600/20">
            Open Your Store
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-50 rounded-full blur-[100px] -z-10 opacity-70"></div>
        <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] -z-10 opacity-50"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            ShopOS 2.0 is now live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            The intelligent OS for <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">modern retail.</span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            From high-volume grocery checkouts to omnichannel boutique sales. Manage inventory, suppliers, and customer loyalty all in one lightning-fast platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/business/register?type=RETAIL" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 flex items-center justify-center gap-2">
              Start Free Setup <ArrowRight size={20} />
            </Link>
            <Link href="#features" className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-8 py-4 rounded-full text-lg font-bold transition-colors flex items-center justify-center">
              Explore Features
            </Link>
          </div>
        </div>

        {/* Hero Dashboard Preview */}
        <div className="max-w-5xl mx-auto mt-20 relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 rounded-2xl"></div>
          <div className="bg-white p-2 rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden transform perspective-1000 rotate-x-2 scale-95 origin-bottom">
            <div className="bg-slate-100 rounded-xl overflow-hidden flex border border-slate-200">
              {/* Fake Sidebar */}
              <div className="w-64 bg-slate-900 text-slate-300 p-4 hidden md:block border-r border-slate-800">
                <div className="flex items-center gap-2 mb-8 text-white"><Store/> <span className="font-bold">Store Admin</span></div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-emerald-600 text-white px-3 py-2 rounded-lg font-medium"><LayoutDashboard size={18}/> Dashboard</div>
                  <div className="flex items-center gap-3 px-3 py-2 text-slate-400"><Barcode size={18}/> POS Terminal</div>
                  <div className="flex items-center gap-3 px-3 py-2 text-slate-400"><PackageSearch size={18}/> Inventory</div>
                  <div className="flex items-center gap-3 px-3 py-2 text-slate-400"><CreditCard size={18}/> Sales & Returns</div>
                </div>
              </div>
              {/* Fake Content */}
              <div className="flex-1 bg-slate-50 p-6 h-[400px]">
                <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6"></div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="h-24 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                    <div className="h-4 w-24 bg-slate-100 rounded mb-3"></div>
                    <div className="h-8 w-16 bg-emerald-100 rounded"></div>
                  </div>
                  <div className="h-24 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                    <div className="h-4 w-24 bg-slate-100 rounded mb-3"></div>
                    <div className="h-8 w-16 bg-teal-100 rounded"></div>
                  </div>
                  <div className="h-24 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                    <div className="h-4 w-24 bg-slate-100 rounded mb-3"></div>
                    <div className="h-8 w-16 bg-blue-100 rounded"></div>
                  </div>
                </div>
                <div className="h-64 bg-white border border-slate-200 rounded-xl shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">Enterprise retail power, <br/><span className="text-emerald-600">built for local business.</span></h2>
            <p className="text-lg text-slate-500">Stop fighting with outdated cash registers. ShopOS connects your checkout, inventory, and online store instantly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Barcode, color: "text-emerald-600", bg: "bg-emerald-50", title: "Lightning POS", desc: "Hardware scanner ready. Process massive grocery carts instantly with robust multi-tender support." },
              { icon: PackageSearch, color: "text-blue-600", bg: "bg-blue-50", title: "Deep Inventory", desc: "Track batch numbers, par levels, and custom units (kg, lb). Get alerted before you run out of stock." },
              { icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50", title: "Supplier Sync", desc: "Draft automated Purchase Orders (POs) and update stock seamlessly via Goods Receiving workflows." },
              { icon: CreditCard, color: "text-orange-600", bg: "bg-orange-50", title: "Shift Management", desc: "Secure cash drawer reconciliation. Start floats, track cash drops, and print Z-Reports effortlessly." },
              { icon: Globe, color: "text-pink-600", bg: "bg-pink-50", title: "Omnichannel Sync", desc: "Deploy an online storefront in one click. In-store inventory instantly syncs with your public microsite." },
              { icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", title: "Customer Loyalty", desc: "Unified CRM profiles. Reward points for in-store purchases that customers can track via their CityOS app." }
            ].map((feature, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-emerald-200 hover:shadow-lg transition-all group">
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

            {/* Hardware Section */}
      <section id="hardware" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Barcode size={32} />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">Bring your own hardware. <br/>No proprietary lock-in.</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                ShopOS runs in any modern browser. Connect any standard USB or Bluetooth barcode scanner, thermal receipt printer, and RJ11 cash drawer. We don't force you to buy overpriced, locked-down registers.
              </p>
              <ul className="space-y-4 font-medium text-slate-700">
                <li className="flex items-center gap-3"><CheckCircle2 className="text-emerald-500" size={20}/> Compatible with Zebra, Symbol, & Honeywell scanners</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-emerald-500" size={20}/> Works with Epson & Star Micronics receipt printers</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-emerald-500" size={20}/> iPad, Mac, PC, and Chromebook friendly</li>
              </ul>
            </div>
            <div className="flex-1 w-full bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-[80px] -z-10"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3"><Barcode className="text-slate-500"/></div>
                  <h4 className="font-bold text-slate-900">Barcode Scanners</h4>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3"><Store className="text-slate-500"/></div>
                  <h4 className="font-bold text-slate-900">Cash Drawers</h4>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center col-span-2">
                  <h4 className="font-bold text-slate-900">Any Device</h4>
                  <p className="text-sm text-slate-500 mt-1">Runs purely in-browser.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">Simple, transparent pricing.</h2>
            <p className="text-lg text-slate-500">No monthly software fees. No arbitrary limits on products or staff accounts. You only pay when you make a sale.</p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col md:flex-row">
            <div className="flex-1 p-10 md:p-12">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">ShopOS Core</h3>
              <p className="text-slate-500 mb-8">Everything you need to run your physical and online store.</p>
              
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl font-black text-slate-900"></span>
                <span className="text-lg text-slate-500 font-medium">/ month</span>
              </div>
              
              <Link href="/business/register?type=RETAIL" className="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-xl text-lg font-bold transition-all mb-8">
                Start Selling Free
              </Link>
              
              <p className="text-sm text-slate-500 text-center font-medium">No credit card required to start.</p>
            </div>
            
            <div className="flex-1 bg-slate-900 text-white p-10 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px]"></div>
              <h4 className="text-lg font-bold mb-6 relative z-10">What's included:</h4>
              <ul className="space-y-4 relative z-10 font-medium text-slate-300">
                <li className="flex items-center gap-3"><CheckCircle2 className="text-emerald-400" size={20}/> Unlimited Products & Categories</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-emerald-400" size={20}/> Unlimited Staff Accounts</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-emerald-400" size={20}/> Free Online E-commerce Site</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-emerald-400" size={20}/> Inventory & Supplier Sync</li>
              </ul>
              
              <div className="mt-10 pt-8 border-t border-slate-800 relative z-10">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Transaction Fee</h4>
                <div className="text-2xl font-bold text-white">2.9% + 30¢ <span className="text-base text-slate-400 font-normal">per tap/dip</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & CTA */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Ready to open your register?</h2>
          <p className="text-xl text-slate-300 mb-10">Join the growing network of local businesses powering their growth with CityConnect ShopOS.</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <Link href="/business/register?type=RETAIL" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2">
              Provision ShopOS <ArrowRight size={20} />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-slate-400">
            <span className="flex items-center gap-2"><CheckCircle2 className="text-emerald-400" size={18}/> No hardware lock-in</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="text-emerald-400" size={18}/> 14-day free trial</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="text-emerald-400" size={18}/> Instant Setup</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} CityConnect ShopOS. All rights reserved.</p>
      </footer>
    </div>
  );
}

