'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateRestaurantOSSettings } from '@/lib/actions/restaurantos';
import { Button, Input, Badge } from '@/components/ui';
import { toast } from 'sonner';

export default function GeneralSettings({ organizationId, initialSettings }: { organizationId: string; initialSettings: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    serviceStyle: initialSettings?.serviceStyle || 'HYBRID',
    taxRate: initialSettings?.taxRate || 0,
    serviceCharge: initialSettings?.serviceCharge || 0,
    openingHours: initialSettings?.openingHours || '',
    acceptsWalkIns: initialSettings?.acceptsWalkIns ?? true
  });

  const handleSave = async () => {
    setLoading(true);
    const res: any = await updateRestaurantOSSettings(organizationId, {
      ...settings,
      taxRate: parseFloat(settings.taxRate.toString() || '0'),
      serviceCharge: parseFloat(settings.serviceCharge.toString() || '0'),
    });
    setLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Settings updated successfully!');
      router.refresh();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-slate-900">General Settings</h3>
          <p className="text-sm text-slate-500">Configure your daily operations, taxes, and service fees.</p>
        </div>
        <Button onClick={handleSave} isLoading={loading}>Save Settings</Button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h4 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Financials</h4>
          <Input 
            label="Tax Rate (%)" 
            type="number" 
            step="0.01" 
            value={settings.taxRate} 
            onChange={(e: any) => setSettings({ ...settings, taxRate: e.target.value })} 
          />
          <Input 
            label="Service Charge (%)" 
            type="number" 
            step="0.01" 
            value={settings.serviceCharge} 
            onChange={(e: any) => setSettings({ ...settings, serviceCharge: e.target.value })} 
          />
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            These percentages will be automatically calculated and applied to all orders at checkout.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Operations</h4>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Style</label>
            <select 
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              value={settings.serviceStyle}
              onChange={(e) => setSettings({ ...settings, serviceStyle: e.target.value })}
            >
              <option value="COUNTER">Counter Service (Fast Food / Takeaway)</option>
              <option value="FULL_SERVICE">Full Service (Dine-in / Waiters)</option>
              <option value="HYBRID">Hybrid (Both)</option>
            </select>
          </div>

          <Input 
            label="Opening Hours (e.g., 8:00 AM - 10:00 PM)" 
            value={settings.openingHours} 
            onChange={(e: any) => setSettings({ ...settings, openingHours: e.target.value })} 
          />

          <div className="pt-2 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="font-bold text-slate-900 text-sm">Accept Walk-ins</p>
              <p className="text-xs text-slate-500">Allow customers to walk in without a reservation</p>
            </div>
            <button 
              onClick={() => setSettings({ ...settings, acceptsWalkIns: !settings.acceptsWalkIns })}
              className={w-12 h-6 rounded-full transition-colors relative }
            >
              <div className={w-4 h-4 bg-white rounded-full absolute top-1 transition-transform } />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
