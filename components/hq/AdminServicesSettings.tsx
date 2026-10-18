'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Search,
  ExternalLink,
  MessageSquare,
  Phone,
  MapPin,
  Calendar,
  Star,
  Users,
  Check,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ServicesVerticalConfig,
  ServiceProviderAdminItem,
  saveServicesConfig,
  toggleProviderVerification,
} from '@/lib/actions/services-config';

interface AdminServicesSettingsProps {
  initialConfig: ServicesVerticalConfig;
  initialProviders: ServiceProviderAdminItem[];
}

export default function AdminServicesSettings({
  initialConfig,
  initialProviders,
}: AdminServicesSettingsProps) {
  const [config, setConfig] = useState<ServicesVerticalConfig>(initialConfig);
  const [providers, setProviders] = useState<ServiceProviderAdminItem[]>(initialProviders);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const verifiedCount = providers.filter((p) => p.isVerified).length;
  const unverifiedCount = providers.length - verifiedCount;

  const handleToggleFeature = (key: keyof Omit<ServicesVerticalConfig, 'verifiedOrgIds' | 'updatedAt' | 'updatedBy'>) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaveSuccess(false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await saveServicesConfig(config);
      if (res.success && res.config) {
        setConfig(res.config);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update services configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVerification = async (provider: ServiceProviderAdminItem) => {
    const nextState = !provider.isVerified;
    setVerifyingId(provider.id);

    // Optimistic UI update
    setProviders((prev) =>
      prev.map((p) => (p.id === provider.id ? { ...p, isVerified: nextState } : p))
    );

    try {
      const res = await toggleProviderVerification(provider.id, nextState);
      if (res.success) {
        setConfig((prev) => ({
          ...prev,
          verifiedOrgIds: res.verifiedOrgIds,
        }));
      }
    } catch (err: any) {
      // Revert optimistic update on failure
      setProviders((prev) =>
        prev.map((p) => (p.id === provider.id ? { ...p, isVerified: !nextState } : p))
      );
      alert(err.message || 'Failed to update provider verification status.');
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredProviders = providers.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.address && p.address.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-teal-400" />
            <h1 className="text-3xl font-black text-white tracking-tight">Services Vertical Governance</h1>
          </div>
          <p className="text-slate-400 mt-1 text-sm">
            Configure feature flags, direct booking, and manage official verification badges for skilled trade businesses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/services"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors border border-slate-700"
          >
            <span>Live Services Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/hq/verticals"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors border border-slate-700"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Master Switch</span>
          </Link>
        </div>
      </div>

      {/* Feature Flags Configuration Card */}
      <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-black text-white">Services Feature Flags</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enable or disable resident-facing capabilities across the Services vertical.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-teal-950/20 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Feature Settings</span>
              </>
            )}
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Services configuration updated successfully and cache revalidated.</span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Toggle: Book Pro */}
          <div
            onClick={() => handleToggleFeature('enableBooking')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
              config.enableBooking
                ? 'bg-teal-950/20 border-teal-500/50 hover:border-teal-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-400" />
                  Book Pro (Direct Booking)
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    config.enableBooking
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {config.enableBooking ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                When enabled, residents see the &quot;Book Pro&quot; button and appointment scheduling modal.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Currently: {config.enableBooking ? 'Active' : 'Turned Off'}</span>
              <span className="text-teal-400 font-bold hover:underline">Click to toggle</span>
            </div>
          </div>

          {/* Toggle: Direct WhatsApp Chat */}
          <div
            onClick={() => handleToggleFeature('enableDirectChat')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
              config.enableDirectChat
                ? 'bg-teal-950/20 border-teal-500/50 hover:border-teal-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  Direct WhatsApp Chat
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    config.enableDirectChat
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {config.enableDirectChat ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Allows residents to initiate direct WhatsApp inquiries with verified provider numbers.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Currently: {config.enableDirectChat ? 'Active' : 'Turned Off'}</span>
              <span className="text-teal-400 font-bold hover:underline">Click to toggle</span>
            </div>
          </div>

          {/* Toggle: Strict Admin Verification */}
          <div
            onClick={() => handleToggleFeature('requireAdminVerification')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
              config.requireAdminVerification
                ? 'bg-teal-950/20 border-teal-500/50 hover:border-teal-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Strict Verification Badge
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    config.requireAdminVerification
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {config.requireAdminVerification ? 'Strict' : 'Relaxed'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Removes the &quot;Verified Pro&quot; badge from all businesses unless explicitly approved below.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Enforced: {config.requireAdminVerification ? 'Yes' : 'No'}</span>
              <span className="text-teal-400 font-bold hover:underline">Click to toggle</span>
            </div>
          </div>

          {/* Toggle: Customer Reviews & Ratings */}
          <div
            onClick={() => handleToggleFeature('enableReviews')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
              config.enableReviews
                ? 'bg-teal-950/20 border-teal-500/50 hover:border-teal-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  Customer Reviews
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    config.enableReviews
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {config.enableReviews ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Allows authenticated residents to write feedback and leave 1-5 star reviews on providers.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Currently: {config.enableReviews ? 'Active' : 'Turned Off'}</span>
              <span className="text-teal-400 font-bold hover:underline">Click to toggle</span>
            </div>
          </div>

          {/* Toggle: Resident Likes & Bookmarks */}
          <div
            onClick={() => handleToggleFeature('enableLikes')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
              config.enableLikes
                ? 'bg-teal-950/20 border-teal-500/50 hover:border-teal-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-rose-400" />
                  Resident Likes & Bookmarks
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    config.enableLikes
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {config.enableLikes ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Enables one-click bookmarking of trusted providers to user profiles and saved tabs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Currently: {config.enableLikes ? 'Active' : 'Turned Off'}</span>
              <span className="text-teal-400 font-bold hover:underline">Click to toggle</span>
            </div>
          </div>

          {/* Toggle: Provider Onboarding CTA Banner */}
          <div
            onClick={() => handleToggleFeature('enableProviderOnboarding')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
              config.enableProviderOnboarding
                ? 'bg-teal-950/20 border-teal-500/50 hover:border-teal-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Provider Onboarding Banner
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    config.enableProviderOnboarding
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {config.enableProviderOnboarding ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Displays the &quot;Run a skilled trade business in Calabar?&quot; registration callout.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Currently: {config.enableProviderOnboarding ? 'Active' : 'Turned Off'}</span>
              <span className="text-teal-400 font-bold hover:underline">Click to toggle</span>
            </div>
          </div>
        </div>
      </form>

      {/* Provider Verification Directory */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-black text-white">Provider Verification Directory</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Admin verification determines which businesses receive the official &quot;Verified Pro&quot; trust badge.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black rounded-lg">
              {verifiedCount} Verified
            </span>
            <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-lg border border-slate-700">
              {unverifiedCount} Unverified
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search provider by name, phone, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Providers List */}
        <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
          {filteredProviders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">
              No service businesses match your query.
            </div>
          ) : (
            filteredProviders.map((provider) => {
              const isProcessing = verifyingId === provider.id;

              return (
                <div
                  key={provider.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="w-9 h-9 rounded-xl bg-teal-900/60 border border-teal-700/50 text-teal-200 flex items-center justify-center font-bold text-sm shrink-0">
                      {provider.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/org/${provider.id}`}
                          target="_blank"
                          className="font-bold text-white text-xs hover:text-teal-300 hover:underline flex items-center gap-1"
                        >
                          <span>{provider.name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </Link>

                        {provider.isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
                            <CheckCircle2 size={11} className="text-emerald-400" />
                            Verified Pro
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                            Unverified
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {provider.description || 'Skilled trade and maintenance provider'}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[10px] text-slate-500">
                        {provider.address && (
                          <span className="flex items-center gap-1 truncate max-w-xs">
                            <MapPin size={11} className="shrink-0 text-slate-400" />
                            <span className="truncate">{provider.address}</span>
                          </span>
                        )}
                        {provider.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} className="shrink-0 text-slate-400" />
                            <span>{provider.phone}</span>
                          </span>
                        )}
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-400">
                          {provider.servicesCount} services listed
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Verification Action */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleToggleVerification(provider)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer ${
                        provider.isVerified
                          ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80'
                          : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/80'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : provider.isVerified ? (
                        <>
                          <X className="w-3.5 h-3.5 text-rose-400" />
                          <span>Revoke Verification</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Verify Business</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
