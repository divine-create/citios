'use client';

import React, { useState } from 'react';
import {
  Truck,
  Bike,
  Store,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Clock,
  MapPin,
  ShieldCheck,
  Tag,
  Phone,
  User,
  Power,
} from 'lucide-react';
import {
  MerchantDeliverySettings,
  MerchantFulfillmentMode,
  updateMerchantDeliverySettings,
} from '@/lib/actions/merchant-delivery-settings';

interface DeliverySettingsViewProps {
  organizationId: string;
  orgName: string;
  initialSettings: MerchantDeliverySettings;
}

export default function DeliverySettingsView({
  organizationId,
  orgName,
  initialSettings,
}: DeliverySettingsViewProps) {
  const [settings, setSettings] = useState<MerchantDeliverySettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await updateMerchantDeliverySettings(organizationId, settings);
      if (res.success && res.settings) {
        setSettings(res.settings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update delivery settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const setFulfillmentMode = (mode: MerchantFulfillmentMode) => {
    setSettings((prev) => ({ ...prev, fulfillmentMode: mode }));
    setSaveSuccess(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Delivery & Fulfillment</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage how orders from <span className="font-semibold text-slate-700">{orgName}</span> are delivered to customers across Calabar.
              </p>
            </div>
          </div>
        </div>

        {/* Live Service Switch */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs self-start sm:self-auto">
          <div className="text-right pl-2">
            <p className="text-xs font-bold text-slate-800">
              {settings.isDeliveryActive ? 'Delivery Active' : 'Delivery Paused'}
            </p>
            <p className="text-[10px] text-slate-500">
              {settings.isDeliveryActive ? 'Accepting delivery orders' : 'Pickup only during pause'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, isDeliveryActive: !settings.isDeliveryActive })}
            className={`p-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              settings.isDeliveryActive
                ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{settings.isDeliveryActive ? 'Online' : 'Paused'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <p className="text-xs font-bold">
            Fulfillment settings saved successfully! Customer checkouts will now use these delivery rules.
          </p>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <p className="text-xs font-bold">{saveError}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Tier 3: Fulfillment Mode Switch */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Bike className="w-4 h-4 text-teal-600" />
              Fulfillment Fleet Model
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Choose whether orders are dispatched to CityDrive platform riders, your own in-house store dispatch bike, or pickup only.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mode A: Platform Fleet */}
            <div
              onClick={() => setFulfillmentMode('PLATFORM_FLEET')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                settings.fulfillmentMode === 'PLATFORM_FLEET'
                  ? 'border-teal-600 bg-teal-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  {settings.fulfillmentMode === 'PLATFORM_FLEET' && (
                    <span className="text-[10px] uppercase font-black bg-teal-600 text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900">CityDrive Shared Fleet</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automatic dispatch to verified platform riders across Calabar. Zero bike management or rider salaries.
                </p>
              </div>
              <p className="text-[11px] font-semibold text-teal-700 pt-2 border-t border-teal-100">
                ✓ Platform handles rider routing & payout
              </p>
            </div>

            {/* Mode B: In-House Dedicated Courier */}
            <div
              onClick={() => setFulfillmentMode('IN_HOUSE_COURIER')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                settings.fulfillmentMode === 'IN_HOUSE_COURIER'
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Bike className="w-5 h-5" />
                  </div>
                  {settings.fulfillmentMode === 'IN_HOUSE_COURIER' && (
                    <span className="text-[10px] uppercase font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900">In-House Dedicated Courier</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Deliver using your own restaurant dispatch bike. Jobs stay private to your team with OTP security intact.
                </p>
              </div>
              <p className="text-[11px] font-semibold text-blue-700 pt-2 border-t border-blue-100">
                ✓ No external platform courier fees
              </p>
            </div>

            {/* Mode C: Pickup Only */}
            <div
              onClick={() => setFulfillmentMode('PICKUP_ONLY')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                settings.fulfillmentMode === 'PICKUP_ONLY'
                  ? 'border-amber-600 bg-amber-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  {settings.fulfillmentMode === 'PICKUP_ONLY' && (
                    <span className="text-[10px] uppercase font-black bg-amber-600 text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900">Pickup & Dine-In Only</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Disable home delivery. Customers must pick up their orders at your physical store location or dine in.
                </p>
              </div>
              <p className="text-[11px] font-semibold text-amber-700 pt-2 border-t border-amber-100">
                ✓ Zero delivery logistics required
              </p>
            </div>
          </div>

          {/* In-House Courier Details (Shown only when in-house is selected) */}
          {settings.fulfillmentMode === 'IN_HOUSE_COURIER' && (
            <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  In-House Dispatch Details
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Store Rider Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={settings.inHouseCourierName || ''}
                      onChange={(e) => setSettings({ ...settings, inHouseCourierName: e.target.value })}
                      placeholder="e.g. Bassey Ekpenyong"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Store Rider Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={settings.inHouseCourierPhone || ''}
                      onChange={(e) => setSettings({ ...settings, inHouseCourierPhone: e.target.value })}
                      placeholder="e.g. 08021234567"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Operational Range & Kitchen Timing */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              Delivery Radius & Timing
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ensure food arrives hot by controlling your maximum travel radius and kitchen pacing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Max Delivery Radius */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Maximum Delivery Distance (KM)
                </label>
                <span className="text-xs font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-mono">
                  {settings.maxDeliveryRadiusKm} km
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={settings.maxDeliveryRadiusKm}
                onChange={(e) => setSettings({ ...settings, maxDeliveryRadiusKm: parseFloat(e.target.value) || 8 })}
                className="w-full accent-teal-600"
              />
              <p className="text-[11px] text-slate-500">
                Customers further than {settings.maxDeliveryRadiusKm} km from your kitchen will not be able to order delivery.
              </p>
            </div>

            {/* Kitchen Preparation Buffer */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Kitchen Prep Buffer (Minutes)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="5"
                  max="90"
                  step="5"
                  value={settings.kitchenPrepMinutes}
                  onChange={(e) => setSettings({ ...settings, kitchenPrepMinutes: parseInt(e.target.value, 10) || 15 })}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Added to road transit time so customers see realistic estimated arrival times.
              </p>
            </div>
          </div>
        </div>

        {/* Marketing Subsidies & Free Delivery */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Tag className="w-4 h-4 text-teal-600" />
              Delivery Subsidies & Promotions
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Encourage larger basket sizes by absorbing part or all of the delivery fee.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Free Delivery Threshold */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Free Delivery on Orders Above (₦)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₦</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={settings.freeDeliveryThreshold}
                  onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  placeholder="e.g. 10000 (0 to disable)"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                When a customer's food total exceeds this amount, delivery is 100% free to them.
              </p>
            </div>

            {/* Custom Flat Delivery Fee */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Custom Flat Delivery Fee (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₦</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={settings.customDeliveryFee ?? ''}
                  onChange={(e) => setSettings({ ...settings, customDeliveryFee: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10)) })}
                  placeholder="Leave empty for standard distance fee"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Charge all customers a fixed fee (e.g. ₦500) regardless of distance.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-slate-500">
            Last updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Default Preset'}
            {settings.updatedBy ? ` by ${settings.updatedBy}` : ''}
          </p>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-md shadow-teal-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Fulfillment Settings
          </button>
        </div>
      </form>
    </div>
  );
}
