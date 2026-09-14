"use client";

import React, { useState } from "react";
import { Search, Globe, Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface DomainSearchProps {
  organizationId: string;
  currentDomain?: string | null;
}

export default function DomainSearch({ organizationId, currentDomain }: DomainSearchProps) {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<{ domain: string; available: boolean; price?: number; alternatives?: { domain: string; price: number }[] } | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    setResult(null);

    // Mock API call
    setTimeout(() => {
      const base = search.split('.')[0].toLowerCase();
      const isAvailable = !search.includes("apple") && !search.includes("google") && search.includes(".");
      setResult({
        domain: search.toLowerCase(),
        available: isAvailable,
        price: isAvailable ? 19.99 : undefined,
        alternatives: isAvailable ? [
          { domain: `${base}.net`, price: 14.99 },
          { domain: `${base}.org`, price: 12.99 },
          { domain: `${base}.co`, price: 24.99 }
        ] : [
          { domain: `${base}.io`, price: 49.99 },
          { domain: `${base}.co`, price: 24.99 },
          { domain: `${base}.net`, price: 14.99 }
        ]
      });
      setSearching(false);
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pt-12">
      <Link href={`/business/website?org=${organizationId}`} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Website Builder
      </Link>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <h1 className="font-extrabold text-3xl tracking-tight mb-3">Find your perfect domain</h1>
          <p className="text-slate-300 text-base mb-10 max-w-xl leading-relaxed">
            Upgrade your professional presence with a custom web address. We handle the technical setup, DNS, and SSL certificates automatically.
          </p>

          {currentDomain ? (
            <div className="flex items-center justify-between bg-emerald-500/20 border border-emerald-500/30 p-6 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
                  <Globe size={24} />
                </div>
                <div>
                  <p className="text-emerald-400 font-bold tracking-wide text-lg">{currentDomain}</p>
                  <p className="text-emerald-500/70 text-sm mt-1">Active and connected</p>
                </div>
              </div>
              <button className="text-sm text-slate-300 hover:text-white font-semibold bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-lg transition-colors">
                Manage
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <form onSubmit={handleSearch} className="relative flex items-center max-w-2xl">
                <div className="absolute left-5 text-slate-400">
                  <Search size={28} />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. lincolnhigh.com"
                  className="w-full pl-16 pr-40 py-5 bg-white/10 border border-white/20 rounded-xl text-xl text-white placeholder-slate-400 focus:outline-none focus:bg-white/15 focus:border-blue-400 transition-all backdrop-blur-sm"
                />
                <button
                  type="submit"
                  disabled={searching || !search.trim()}
                  className="absolute right-3 px-8 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:hover:bg-blue-500 text-lg"
                >
                  {searching ? <Loader2 size={24} className="animate-spin mx-auto" /> : "Search"}
                </button>
              </form>

              {result && (
                <div className="bg-white rounded-xl text-slate-800 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl">
                  {/* Main Result */}
                  <div className={`p-8 border-b flex items-center justify-between ${result.available ? "border-slate-100 bg-white" : "border-red-100 bg-red-50"}`}>
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${result.available ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                        {result.available ? <CheckCircle size={28} /> : <XCircle size={28} />}
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{result.domain}</p>
                        <p className={`text-sm font-semibold mt-1.5 ${result.available ? "text-emerald-600" : "text-red-600"}`}>
                          {result.available ? "Available!" : "This domain is taken."}
                        </p>
                      </div>
                    </div>
                    {result.available && (
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-3xl font-black text-slate-900">${result.price}</p>
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">/ year</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => alert(`Starting Stripe checkout for ${result.domain}...`)}
                          className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                        >
                          Buy Now
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Alternatives */}
                  {result.alternatives && result.alternatives.length > 0 && (
                    <div className="bg-slate-50 p-8">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5">Suggested Alternatives</h4>
                      <div className="space-y-4">
                        {result.alternatives.map((alt, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 p-5 rounded-xl hover:border-blue-300 transition-colors cursor-pointer group shadow-sm hover:shadow-md">
                            <p className="font-bold text-slate-700 text-xl group-hover:text-blue-700">{alt.domain}</p>
                            <div className="flex items-center gap-5">
                              <span className="font-black text-slate-900 text-lg">${alt.price} <span className="text-sm font-semibold text-slate-400 font-normal">/yr</span></span>
                              <button
                                onClick={() => alert(`Starting Stripe checkout for ${alt.domain}...`)}
                                className="px-5 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
