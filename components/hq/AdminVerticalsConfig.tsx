'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  BedDouble,
  ShoppingBag,
  UtensilsCrossed,
  Wrench,
  Calendar,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  PlatformVerticalsConfig,
  VerticalId,
  VERTICAL_DEFINITIONS,
} from '@/lib/verticals-constants';
import { saveVerticalsConfig } from '@/lib/actions/verticals-config';
import { cn } from '@/lib/utils';

interface AdminVerticalsConfigProps {
  initialConfig: PlatformVerticalsConfig;
}

const VERTICAL_ICONS: Record<VerticalId, React.ComponentType<{ className?: string }>> = {
  jobs: Briefcase,
  houses: BedDouble,
  shops: ShoppingBag,
  food: UtensilsCrossed,
  services: Wrench,
  events: Calendar,
};

export default function AdminVerticalsConfig({ initialConfig }: AdminVerticalsConfigProps) {
  const [config, setConfig] = useState<PlatformVerticalsConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const verticalKeys: VerticalId[] = ['jobs', 'houses', 'shops', 'food', 'services', 'events'];

  const activeCount = verticalKeys.filter((k) => config[k]).length;

  const handleToggle = (key: VerticalId) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaveSuccess(false);
  };

  const handleEnableAll = () => {
    setConfig((prev) => ({
      ...prev,
      jobs: true,
      houses: true,
      shops: true,
      food: true,
      services: true,
      events: true,
    }));
    setSaveSuccess(false);
  };

  const handleDisableAll = () => {
    setConfig((prev) => ({
      ...prev,
      jobs: false,
      houses: false,
      shops: false,
      food: false,
      services: false,
      events: false,
    }));
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await saveVerticalsConfig(config);
      if (res.success && res.config) {
        setConfig(res.config);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save vertical settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-in fade-in duration-300">
      {/* Notifications */}
      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <p className="text-sm font-bold">
            Vertical configuration updated successfully! Resident navigation and home rails are now synchronized.
          </p>
        </div>
      )}

      {saveError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <p className="text-sm font-bold">{saveError}</p>
        </div>
      )}

      {/* Summary & Quick Actions Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-white">Active Verticals</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {activeCount} of {verticalKeys.length} Live
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Toggle specific verticals on or off to tailor the city experience during phase-in or pilot launches.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleEnableAll}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors border border-slate-700 cursor-pointer"
          >
            Enable All
          </button>
          <button
            type="button"
            onClick={handleDisableAll}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors border border-slate-700 cursor-pointer"
          >
            Disable All
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Verticals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {verticalKeys.map((key) => {
          const def = VERTICAL_DEFINITIONS[key];
          const isEnabled = Boolean(config[key]);
          const Icon = VERTICAL_ICONS[key] || Layers;

          return (
            <div
              key={key}
              onClick={() => handleToggle(key)}
              className={cn(
                'group relative rounded-3xl p-6 border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between',
                isEnabled
                  ? 'bg-slate-900/90 border-slate-700 hover:border-purple-500/50 shadow-lg'
                  : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-60 hover:opacity-80'
              )}
            >
              <div>
                {/* Card Top Row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                      isEnabled
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                        isEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      )}
                    >
                      {isEnabled ? 'Active' : 'Disabled'}
                    </span>

                    {/* Toggle Switch */}
                    <div
                      className={cn(
                        'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                        isEnabled ? 'bg-purple-600' : 'bg-slate-700'
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full bg-white transition-transform shadow-xs',
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Vertical Info */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                    {def.badge}
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5">{def.name}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {def.description}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500 text-[11px]">{def.path}</span>
                <Link
                  href={def.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-[11px] transition-colors"
                >
                  Preview <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanatory Policy Alert */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-start gap-4 text-xs text-slate-400 leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-200 block mb-1">
            Platform Vertical Governance & Cache Synchronization
          </span>
          When a vertical is toggled off in HQ Command, CityOS immediately excludes it from the resident home screen menu, navigation drawers, and resident activity trackers. Direct visits to that vertical will display a maintenance pause banner until re-enabled by an authorized platform administrator.
        </div>
      </div>
    </form>
  );
}
