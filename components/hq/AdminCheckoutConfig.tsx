'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Wallet,
  Landmark,
  MessageSquare,
  ShieldCheck,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Settings2,
  PhoneCall,
  MapPin,
  Truck,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { PlatformCheckoutConfig, saveCheckoutConfig } from '@/lib/actions/checkout-settings';
import { cn } from '@/lib/utils';

interface AdminCheckoutConfigProps {
  initialConfig: PlatformCheckoutConfig;
}

export default function AdminCheckoutConfig({ initialConfig }: AdminCheckoutConfigProps) {
  const [config, setConfig] = useState<PlatformCheckoutConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleToggle = (key: keyof PlatformCheckoutConfig) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await saveCheckoutConfig(config);
      if (res.success && res.config) {
        setConfig(res.config);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save checkout settings.');
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
            Checkout configuration saved successfully! Platform storefronts and checkout views are now updated.
          </p>
        </div>
      )}

      {saveError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <p className="text-sm font-bold">{saveError}</p>
        </div>
      )}

      {/* Primary Checkout Methods Toggles */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-black text-white tracking-tight">Active Payment & Checkout Methods</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure which payment rails and checkout flows are available to residents at checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* WhatsApp Direct Ordering */}
          <div
            className={cn(
              'border rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4',
              config.enableWhatsApp
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-slate-950/40 border-slate-800 opacity-60'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    config.enableWhatsApp ? 'bg-emerald-500/20 text-[#25D366]' : 'bg-slate-800 text-slate-500'
                  )}
                >
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">WhatsApp Direct Order</h3>
                    <span className="text-[10px] font-extrabold bg-[#25D366]/20 text-[#25D366] px-2 py-0.5 rounded-full">
                      POPULAR
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    1-Click web-to-WhatsApp order bridge with merchant phone routing and signed link.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <span className="text-xs font-bold text-slate-400">
                Status: {config.enableWhatsApp ? <strong className="text-emerald-400">Enabled</strong> : <strong className="text-slate-500">Disabled</strong>}
              </span>
              <button
                type="button"
                onClick={() => handleToggle('enableWhatsApp')}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  config.enableWhatsApp ? 'bg-[#25D366]' : 'bg-slate-800'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    config.enableWhatsApp ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>

          {/* 9jaLive Resident Wallet */}
          <div
            className={cn(
              'border rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4',
              config.enableWallet
                ? 'bg-teal-950/20 border-teal-500/40'
                : 'bg-slate-950/40 border-slate-800 opacity-60'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    config.enableWallet ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800 text-slate-500'
                  )}
                >
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">9jaLive Resident Wallet</h3>
                    <span className="text-[10px] font-extrabold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full">
                      INSTANT
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Zero-fee balance debit via internal double-entry ledger.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <span className="text-xs font-bold text-slate-400">
                Status: {config.enableWallet ? <strong className="text-teal-400">Enabled</strong> : <strong className="text-slate-500">Disabled</strong>}
              </span>
              <button
                type="button"
                onClick={() => handleToggle('enableWallet')}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  config.enableWallet ? 'bg-teal-500' : 'bg-slate-800'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    config.enableWallet ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Credit / Debit Card Gateway */}
          <div
            className={cn(
              'border rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4',
              config.enableCard
                ? 'bg-purple-950/20 border-purple-500/40'
                : 'bg-slate-950/40 border-slate-800 opacity-60'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    config.enableCard ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-500'
                  )}
                >
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Credit / Debit Card</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Direct online gateway processing via Paystack or Monnify adapter.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <span className="text-xs font-bold text-slate-400">
                Status: {config.enableCard ? <strong className="text-purple-400">Enabled</strong> : <strong className="text-slate-500">Disabled</strong>}
              </span>
              <button
                type="button"
                onClick={() => handleToggle('enableCard')}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  config.enableCard ? 'bg-purple-500' : 'bg-slate-800'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    config.enableCard ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Direct Bank Transfer */}
          <div
            className={cn(
              'border rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4',
              config.enableTransfer
                ? 'bg-blue-950/20 border-blue-500/40'
                : 'bg-slate-950/40 border-slate-800 opacity-60'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    config.enableTransfer ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'
                  )}
                >
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Bank Transfer</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dynamic virtual account payment with automated webhook settlement.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <span className="text-xs font-bold text-slate-400">
                Status: {config.enableTransfer ? <strong className="text-blue-400">Enabled</strong> : <strong className="text-slate-500">Disabled</strong>}
              </span>
              <button
                type="button"
                onClick={() => handleToggle('enableTransfer')}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  config.enableTransfer ? 'bg-blue-500' : 'bg-slate-800'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    config.enableTransfer ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Rules & Defaults */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white tracking-tight">Checkout Rules & Fallbacks</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global defaults when residents load the checkout screen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Default Method */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              Default Pre-selected Payment Method
            </label>
            <select
              value={config.defaultMethod}
              onChange={(e) => setConfig({ ...config, defaultMethod: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
            >
              {config.enableWhatsApp && <option value="whatsapp">WhatsApp Direct Order (Recommended)</option>}
              {config.enableWallet && <option value="wallet">9jaLive Wallet</option>}
              {config.enableCard && <option value="card">Credit / Debit Card</option>}
              {config.enableTransfer && <option value="transfer">Bank Transfer</option>}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              The payment tab initially selected when a resident views Checkout.
            </p>
          </div>

          {/* Concierge Fallback WhatsApp Phone */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              Platform Concierge WhatsApp Number
            </label>
            <input
              type="text"
              value={config.conciergeWhatsAppNumber}
              onChange={(e) => setConfig({ ...config, conciergeWhatsAppNumber: e.target.value })}
              placeholder="e.g. 2348023456789"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Fallback WhatsApp line if a merchant has not registered their own business contact.
            </p>
          </div>

          {/* Minimum Order Amount */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              Minimum Order Value (₦)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={config.minOrderAmount}
              onChange={(e) => setConfig({ ...config, minOrderAmount: Number(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Set to 0 to disable minimum checkout thresholds.
            </p>
          </div>

          {/* Pay on Delivery Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div>
              <p className="text-xs font-black text-white">Allow Pay on Delivery</p>
              <p className="text-[11px] text-slate-500">Allow residents to settle payments on courier arrival.</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('allowPayOnDelivery')}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                config.allowPayOnDelivery ? 'bg-teal-500' : 'bg-slate-800'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  config.allowPayOnDelivery ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      </div>


      {/* CityDrive Hyperlocal Delivery Pricing (Base Fee & Fare Matrix) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-black text-white tracking-tight">CityDrive Hyperlocal Delivery Pricing</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure the baseline delivery tariff applied to all dynamic checkout orders across Calabar.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold font-mono">
            <span>Formula: Base + (KM - BaseKM) × Rate</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Base Dropoff Fee */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Base Dropoff Fee (₦) <span className="text-teal-400 font-normal">*Required</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">₦</span>
              <input
                type="number"
                min="0"
                step="50"
                value={config.deliveryBaseFee ?? 800}
                onChange={(e) => setConfig({ ...config, deliveryBaseFee: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
                placeholder="800"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Minimum fee charged for any delivery.
            </p>
          </div>

          {/* Base Distance Included */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Base Distance Included (KM)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.5"
                max="20"
                step="0.5"
                value={config.deliveryBaseDistanceKm ?? 2.0}
                onChange={(e) => setConfig({ ...config, deliveryBaseDistanceKm: Math.max(0.5, Number(e.target.value) || 2.0) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
                placeholder="2.0"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Distances up to this radius pay only the Base Fee.
            </p>
          </div>

          {/* Per-KM Excess Rate */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Excess Rate (₦ / KM)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">₦</span>
              <input
                type="number"
                min="0"
                step="25"
                value={config.deliveryPerKmRate ?? 150}
                onChange={(e) => setConfig({ ...config, deliveryPerKmRate: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
                placeholder="150"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Added per kilometer beyond the base distance.
            </p>
          </div>

          {/* Free Delivery Minimum Order */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Free Delivery Order Min (₦)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">₦</span>
              <input
                type="number"
                min="0"
                step="500"
                value={config.freeDeliveryThreshold ?? 0}
                onChange={(e) => setConfig({ ...config, freeDeliveryThreshold: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
                placeholder="0"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              0 disables free delivery subsidies.
            </p>
          </div>
        </div>

        {/* Live Fare Simulation Preview */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Live Calabar Fare Simulation</span>
            </div>
            <span className="text-[11px] text-slate-400">Updates live as you adjust the fields above</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Short Trip */}
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-300">Short Trip (1.5 km)</p>
                <p className="text-[10px] text-slate-500">e.g. Marian → State Housing</p>
              </div>
              <span className="text-sm font-black text-teal-400 font-mono">
                ₦{(config.deliveryBaseFee ?? 800).toLocaleString()}
              </span>
            </div>

            {/* Mid Trip */}
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-300">Mid Trip (4.0 km)</p>
                <p className="text-[10px] text-slate-500">e.g. Marian → Watt / Goldie</p>
              </div>
              <span className="text-sm font-black text-teal-400 font-mono">
                ₦{Math.round((config.deliveryBaseFee ?? 800) + Math.max(0, 4.0 - (config.deliveryBaseDistanceKm ?? 2.0)) * (config.deliveryPerKmRate ?? 150)).toLocaleString()}
              </span>
            </div>

            {/* Long Trip */}
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-300">Long Trip (7.5 km)</p>
                <p className="text-[10px] text-slate-500">e.g. Airport → 8 Miles</p>
              </div>
              <span className="text-sm font-black text-teal-400 font-mono">
                ₦{Math.round((config.deliveryBaseFee ?? 800) + Math.max(0, 7.5 - (config.deliveryBaseDistanceKm ?? 2.0)) * (config.deliveryPerKmRate ?? 150)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-6">
        <p className="text-xs text-slate-500">
          Last updated: {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : 'Default System Preset'}
          {config.updatedBy ? ` by ${config.updatedBy}` : ''}
        </p>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Checkout Configuration
        </button>
      </div>
    </form>
  );
}
