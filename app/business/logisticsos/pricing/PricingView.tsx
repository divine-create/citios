'use client';

import React, { useState } from 'react';
import { Card, Badge, Button } from '@/components/Shared';
import { Settings, DollarSign, Check, X, ShieldCheck, Globe } from 'lucide-react';
import { updatePricingRule } from '@/lib/actions/logistics-pricing';
import { setNetworkParticipation } from '@/lib/actions/logistics-network';

interface PricingViewProps {
  providerId: string;
  providerName: string;
  currentRule: any;
  settings: any;
}

export default function PricingView({
  providerId,
  providerName,
  currentRule,
  settings,
}: PricingViewProps) {
  const [baseFee, setBaseFee] = useState(currentRule?.baseFee ? String(currentRule.baseFee) : '500');
  const [perKmRate, setPerKmRate] = useState(currentRule?.perKmRate ? String(currentRule.perKmRate) : '150');
  const [perKgRate, setPerKgRate] = useState(currentRule?.perKgRate ? String(currentRule.perKgRate) : '20');
  const [prioritySurcharge, setPrioritySurcharge] = useState(currentRule?.prioritySurcharge ? String(currentRule.prioritySurcharge) : '1000');
  
  const [isNetworkParticipant, setIsNetworkParticipant] = useState(settings?.isNetworkParticipant ?? false);
  const [serviceRadiusKm, setServiceRadiusKm] = useState(settings?.serviceRadiusKm ? String(settings.serviceRadiusKm) : '25');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await updatePricingRule({
        providerId,
        baseFee: parseFloat(baseFee) || 0,
        perKmRate: parseFloat(perKmRate) || 0,
        perKgRate: parseFloat(perKgRate) || 0,
        prioritySurcharge: parseFloat(prioritySurcharge) || 0,
        currency: 'NGN',
      });

      await setNetworkParticipation({
        providerId,
        isParticipant: isNetworkParticipant,
        serviceRadiusKm: parseFloat(serviceRadiusKm) || 25,
      });

      setMsg({ type: 'success', text: 'Pricing rules and network settings updated successfully!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update pricing rules' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pricing & Tariffs</h1>
        <p className="text-slate-500 mt-1">Provider: <span className="font-semibold text-slate-700">{providerName}</span></p>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-sm flex justify-between items-center ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSaveTariff} className="space-y-6">
        
        {/* Core Tariff Card */}
        <Card className="space-y-6 p-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-teal-600" />
                Active Delivery Rate Card (Version {currentRule?.version || 1})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Applied to all quotes generated for direct and network deliveries.</p>
            </div>
            <Badge variant="default" className="bg-teal-50 text-teal-700 border-teal-200 font-mono">
              Currency: NGN (₦)
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Base Dropoff Charge (₦)</label>
              <input
                type="number"
                step="50"
                required
                value={baseFee}
                onChange={(e) => setBaseFee(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1">Fixed starting fee for any booking.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Per-Kilometer Distance Rate (₦/km)</label>
              <input
                type="number"
                step="10"
                required
                value={perKmRate}
                onChange={(e) => setPerKmRate(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1">Multiplied by estimated trip road distance.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Per-Kilogram Weight Rate (₦/kg)</label>
              <input
                type="number"
                step="5"
                value={perKgRate}
                onChange={(e) => setPerKgRate(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1">Applied for heavy shipments above 1 kg.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Express Priority Surcharge (₦)</label>
              <input
                type="number"
                step="100"
                value={prioritySurcharge}
                onChange={(e) => setPrioritySurcharge(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1">Added when customer requests immediate express routing.</p>
            </div>
          </div>
        </Card>

        {/* Network Participation Card */}
        <Card className="space-y-6 p-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                CityDrive Shared Network Participation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Receive delivery dispatches from CityOS merchants (ShopOS, RestaurantOS, HotelOS).</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="networkCheck"
                checked={isNetworkParticipant}
                onChange={(e) => setIsNetworkParticipant(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="networkCheck" className="text-sm font-bold text-slate-800 cursor-pointer">
                Participate in CityDrive Shared Fulfilment Network
              </label>
            </div>

            {isNetworkParticipant && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Maximum Operational Radius (km)</label>
                <input
                  type="number"
                  value={serviceRadiusKm}
                  onChange={(e) => setServiceRadiusKm(e.target.value)}
                  className="w-full sm:w-64 border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">Network requests beyond this distance will not be offered to your fleet.</p>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Pricing & Settings'}
          </Button>
        </div>

      </form>
    </div>
  );
}
