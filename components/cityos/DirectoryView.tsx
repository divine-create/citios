'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Phone,
  MessageCircle,
  Building2,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  SlidersHorizontal,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  DirectoryListingItem,
  DIRECTORY_CATEGORIES,
  DirectoryCategoryId,
} from '@/lib/directory-constants';
import { buildWhatsAppInquiryUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

interface DirectoryViewProps {
  initialListings: DirectoryListingItem[];
  zones: string[];
  cityName: string;
}

export default function DirectoryView({
  initialListings,
  zones,
  cityName,
}: DirectoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Client-side instant filtering for high responsiveness
  const filteredListings = useMemo(() => {
    let result = initialListings;

    // Filter by Category
    if (selectedCategory !== 'all') {
      result = result.filter(
        (item) => item.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by Zone
    if (selectedZone !== 'all') {
      result = result.filter(
        (item) => item.zone && item.zone.toLowerCase().includes(selectedZone.toLowerCase())
      );
    }

    // Filter by Search Query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        return (
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.address && item.address.toLowerCase().includes(q)) ||
          (item.zone && item.zone.toLowerCase().includes(q)) ||
          (item.landmark && item.landmark.toLowerCase().includes(q)) ||
          (item.categoryLabel && item.categoryLabel.toLowerCase().includes(q)) ||
          item.services.some((s) => s.toLowerCase().includes(q))
        );
      });
    }

    return result;
  }, [initialListings, selectedCategory, selectedZone, searchQuery]);

  const handleCopyAddress = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const activeCategoryLabel =
    DIRECTORY_CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'All Businesses';

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-teal-800/40">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-teal-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-black uppercase tracking-wider border border-teal-500/30">
            <Building2 className="w-3.5 h-3.5" />
            {cityName} Verified Directory
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Find Any Business in {cityName}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
            Search verified pharmacies, mechanics, technicians, law firms, printers, boutiques, and clinics across {cityName}. Call or WhatsApp directly.
          </p>
        </div>

        {/* Informational Guidance Callout */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-3 text-xs text-teal-200/90">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-teal-400" />
            <span>
              Direct contact directory · No middleman · Call or WhatsApp providers directly
            </span>
          </div>
          <Link
            href="/food"
            className="inline-flex items-center gap-1 font-bold text-white hover:text-teal-300 underline underline-offset-2 transition-colors"
          >
            Looking for instant food delivery? Visit CityFood &rarr;
          </Link>
        </div>
      </div>

      {/* Sticky Search & Filter Bar */}
      <div className="sticky top-2 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Text Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by business name, service (e.g. 'plumber', 'pharmacy', 'brake pad', 'law')..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Zone Selector */}
          <div className="sm:w-64">
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">📍 All Calabar Zones</option>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Filter Horizontal Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar -mx-1 px-1">
          {DIRECTORY_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all border flex items-center gap-1.5',
                  active
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Directory Results Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            {activeCategoryLabel}
            {selectedZone !== 'all' ? ` in ${selectedZone}` : ''}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Showing {filteredListings.length} {filteredListings.length === 1 ? 'business' : 'businesses'}
          </p>
        </div>

        {(selectedCategory !== 'all' || selectedZone !== 'all' || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedZone('all');
              setSearchQuery('');
            }}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        )}
      </div>

      {/* Directory Listings Grid */}
      {filteredListings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">No businesses found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any business matching "{searchQuery}". Try broadening your search or switching category or zone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedZone('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Show All Businesses
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredListings.map((item) => {
            const rawPhone = item.phone || '08065373747';
            const cleanWa = item.whatsapp || rawPhone;
            const waInquiryUrl = buildWhatsAppInquiryUrl({
              phone: cleanWa,
              orgName: item.name,
              cityName,
            });

            return (
              <div
                key={item.listingId}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header Information */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                        {item.categoryLabel}
                      </div>
                      <h3 className="text-base font-black text-slate-900 leading-snug">
                        {item.name}
                      </h3>
                    </div>

                    {item.isVerified && (
                      <span
                        title="Verified Calabar Business"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 shrink-0"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Services Tags */}
                  {item.services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.services.slice(0, 4).map((service, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[11px] font-medium border border-slate-100"
                        >
                          {service}
                        </span>
                      ))}
                      {item.services.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400 text-[10px] font-bold">
                          +{item.services.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Location & Landmark */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="font-medium text-slate-700">{item.address}</span>
                    </div>

                    {item.landmark && (
                      <div className="flex items-center gap-1.5 pl-5 text-[11px] text-slate-500 font-medium">
                        <span className="text-slate-400">Landmark:</span>
                        <span>{item.landmark}</span>
                      </div>
                    )}

                    {item.hours && (
                      <div className="flex items-center gap-1.5 pl-5 text-[11px] text-slate-500 font-medium">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{item.hours}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Call Button */}
                    <a
                      href={`tel:${rawPhone}`}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call {rawPhone.startsWith('0') ? rawPhone : `0${rawPhone.slice(3)}`}
                    </a>

                    {/* WhatsApp Button */}
                    <a
                      href={waInquiryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </div>

                  {/* Secondary Actions (Copy Address & Claim Profile) */}
                  <div className="flex items-center justify-between text-[11px] pt-1 px-0.5">
                    <button
                      type="button"
                      onClick={() => handleCopyAddress(item.id, item.address || item.name)}
                      className="text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1 transition-colors"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Address Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Address</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/business/claim?orgId=${item.id}`}
                      className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-0.5 transition-colors"
                    >
                      <span>Claim this business</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
