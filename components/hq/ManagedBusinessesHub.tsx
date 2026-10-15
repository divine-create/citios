'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building,
  Search,
  Filter,
  Eye,
  Utensils,
  Hotel,
  ShoppingBag,
  Wrench,
  Truck,
  Image,
  MessageSquare,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Plus,
} from 'lucide-react';
import { ManagedBusinessSummary } from '@/lib/actions/hq-managed-business';
import CreateBusinessWizardModal from './CreateBusinessWizardModal';

interface ManagedBusinessesHubProps {
  initialBusinesses: ManagedBusinessSummary[];
}

export default function ManagedBusinessesHub({ initialBusinesses }: ManagedBusinessesHubProps) {
  const [businesses, setBusinesses] = useState<ManagedBusinessSummary[]>(initialBusinesses);
  const [search, setSearch] = useState('');
  const [verticalFilter, setVerticalFilter] = useState('ALL');
  const [claimFilter, setClaimFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filtered = businesses.filter((b) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = b.name.toLowerCase().includes(q);
      const matchAddress = b.address?.toLowerCase().includes(q);
      if (!matchName && !matchAddress) return false;
    }
    if (verticalFilter !== 'ALL' && b.type !== verticalFilter) return false;
    if (claimFilter === 'UNCLAIMED' && b.isClaimed) return false;
    if (claimFilter === 'CLAIMED' && !b.isClaimed) return false;
    return true;
  });

  const getVerticalIcon = (type: string) => {
    switch (type) {
      case 'RESTAURANT':
        return <Utensils className="w-4 h-4 text-amber-400" />;
      case 'HOTEL':
        return <Hotel className="w-4 h-4 text-blue-400" />;
      case 'RETAIL':
        return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      case 'SERVICES':
        return <Wrench className="w-4 h-4 text-cyan-400" />;
      case 'LOGISTICS':
        return <Truck className="w-4 h-4 text-purple-400" />;
      default:
        return <Building className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Building className="w-6 h-6 text-teal-400" /> Managed Businesses & Pre-Onboarding Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centrally manage menus, prices, images, video tours, and proxy posts for Calabar establishments.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business name or address..."
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
            />
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-teal-500/20 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> + Create Business
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Vertical:
          </span>
          {['ALL', 'RESTAURANT', 'HOTEL', 'RETAIL', 'SERVICES', 'LOGISTICS'].map((vt) => (
            <button
              key={vt}
              onClick={() => setVerticalFilter(vt)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                verticalFilter === vt
                  ? 'bg-teal-500 text-slate-950 font-black'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {vt === 'ALL' ? 'All Verticals' : vt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-2">Status:</span>
          {['ALL', 'UNCLAIMED', 'CLAIMED'].map((cf) => (
            <button
              key={cf}
              onClick={() => setClaimFilter(cf)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                claimFilter === cf
                  ? 'bg-white text-slate-950 font-black'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cf === 'ALL' ? 'All' : cf === 'UNCLAIMED' ? 'Unclaimed (HQ Custodian)' : 'Claimed Owner'}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((biz) => (
          <div
            key={biz.id}
            className="bg-slate-900 border border-slate-800 hover:border-teal-500/40 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Cover Banner */}
              <div className="relative h-28 bg-slate-950 overflow-hidden">
                {biz.coverUrl ? (
                  <img
                    src={biz.coverUrl}
                    alt={biz.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/600x200?text=No+Cover';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-950">
                    <Building className="w-8 h-8 opacity-40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white text-[10px] font-black uppercase flex items-center gap-1">
                    {getVerticalIcon(biz.type)} {biz.type}
                  </span>
                  {!biz.isClaimed ? (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Unclaimed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Claimed
                    </span>
                  )}
                </div>

                {biz.pendingOrdersCount > 0 && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse shadow-lg">
                    {biz.pendingOrdersCount} Active Order{biz.pendingOrdersCount === 1 ? '' : 's'}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-5 pt-3 space-y-3">
                <div className="flex items-start gap-3">
                  {biz.logoUrl ? (
                    <img
                      src={biz.logoUrl}
                      alt={biz.name}
                      className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-800 -mt-6 relative z-10 shrink-0 shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 -mt-6 relative z-10 shrink-0 flex items-center justify-center text-slate-500 font-black text-sm">
                      {biz.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate" title={biz.name}>
                      {biz.name}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{biz.address || 'Calabar'}</p>
                  </div>
                </div>

                {biz.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{biz.description}</p>
                )}

                {/* Counters Rail */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 text-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Catalog</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {biz.catalogCount} items
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Media</span>
                    <span className="text-xs font-mono font-bold text-teal-400">
                      {biz.mediaCount} assets
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Broadcasts</span>
                    <span className="text-xs font-mono font-bold text-purple-400">
                      {biz.postsCount} posts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-2">
              <a
                href={`/org/${biz.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-400 hover:text-teal-400 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-bold"
                title="View resident storefront"
              >
                Storefront <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <Link
                href={`/hq/managed/${biz.id}`}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md group-hover:translate-x-0.5"
              >
                Open Studio <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
            <Building className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Businesses Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or vertical filters.</p>
          </div>
        )}
      </div>

      {/* HQ Universal Business Creation Modal */}
      <CreateBusinessWizardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
