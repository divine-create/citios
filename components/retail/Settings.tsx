import React, { useState, useEffect } from 'react';
import { Save, Plus, X, Loader2 } from 'lucide-react';
import { getRetailSettings, updateRetailSettings } from '../../lib/actions/retail';

interface SettingsProps {
  organizationId: string;
}

export default function Settings({ organizationId }: SettingsProps) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUnit, setNewUnit] = useState('');

  useEffect(() => {
    async function load() {
      const data = await getRetailSettings(organizationId);
      if (data) {
        setSettings({
          ...data,
          customUnits: JSON.parse(data.customUnits || '[]'),
          bankDetails: JSON.parse(data.bankDetails || '{"bankName":"","accountNumber":"","accountName":""}'),
          shippingRates: JSON.parse(data.shippingRates || '[]'),
        });
      }
      setLoading(false);
    }
    load();
  }, [organizationId]);

  const handleSave = async () => {
    setSaving(true);
    await updateRetailSettings(organizationId, {
      storeName: settings.storeName,
      storeAddress: settings.storeAddress,
      receiptMessage: settings.receiptMessage,
      taxRate: parseFloat(settings.taxRate),
      currencySymbol: settings.currencySymbol,
      customUnits: settings.customUnits,
      paymentGateway: settings.paymentGateway,
      bankDetails: JSON.stringify(settings.bankDetails),
      shippingRates: JSON.stringify(settings.shippingRates)
    });
    setSaving(false);
    alert('Settings saved successfully!');
  };

  const addUnit = () => {
    if (newUnit.trim() && !settings.customUnits.includes(newUnit.trim().toLowerCase())) {
      setSettings({
        ...settings,
        customUnits: [...settings.customUnits, newUnit.trim().toLowerCase()]
      });
      setNewUnit('');
    }
  };

  const removeUnit = (unitToRemove: string) => {
    setSettings({
      ...settings,
      customUnits: settings.customUnits.filter((u: string) => u !== unitToRemove)
    });
  };

  const addShippingRate = () => {
    setSettings({
      ...settings,
      shippingRates: [...settings.shippingRates, { id: crypto.randomUUID(), name: '', price: 0, condition: '' }]
    });
  };

  const updateShippingRate = (id: string, field: string, value: any) => {
    setSettings({
      ...settings,
      shippingRates: settings.shippingRates.map((r: any) => r.id === id ? { ...r, [field]: value } : r)
    });
  };

  const removeShippingRate = (id: string) => {
    setSettings({
      ...settings,
      shippingRates: settings.shippingRates.filter((r: any) => r.id !== id)
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Store Settings</h2>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Store Profile</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Store Name</label>
              <input 
                type="text" 
                value={settings?.storeName || ''} 
                onChange={e => setSettings({...settings, storeName: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Store Address</label>
              <textarea 
                value={settings?.storeAddress || ''} 
                onChange={e => setSettings({...settings, storeAddress: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 h-24 resize-none" 
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Financials & Receipts</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Currency Symbol</label>
                <input 
                  type="text" 
                  value={settings?.currencySymbol || '$'} 
                  onChange={e => setSettings({...settings, currencySymbol: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-center text-lg font-bold" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Default Tax Rate (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={settings?.taxRate || 0} 
                  onChange={e => setSettings({...settings, taxRate: e.target.value})}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Receipt Footer Message</label>
              <input 
                type="text" 
                placeholder="Thank you for shopping with us!"
                value={settings?.receiptMessage || ''} 
                onChange={e => setSettings({...settings, receiptMessage: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Payment & Wallet</h3>
            <p className="text-sm text-slate-500">Configure how you receive payments and wallet withdrawals.</p>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Payment Gateway</label>
              <select 
                value={settings?.paymentGateway || ''} 
                onChange={e => setSettings({...settings, paymentGateway: e.target.value})}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Gateway</option>
                <option value="stripe">Stripe</option>
                <option value="paystack">Paystack</option>
                <option value="flutterwave">Flutterwave</option>
                <option value="wallet_only">Wallet Only</option>
              </select>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase">Bank Details for Withdrawal</h4>
              <div className="space-y-1">
                <input type="text" placeholder="Bank Name" value={settings?.bankDetails?.bankName || ''} onChange={e => setSettings({...settings, bankDetails: {...settings.bankDetails, bankName: e.target.value}})} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="space-y-1">
                <input type="text" placeholder="Account Name" value={settings?.bankDetails?.accountName || ''} onChange={e => setSettings({...settings, bankDetails: {...settings.bankDetails, accountName: e.target.value}})} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="space-y-1">
                <input type="text" placeholder="Account Number" value={settings?.bankDetails?.accountNumber || ''} onChange={e => setSettings({...settings, bankDetails: {...settings.bankDetails, accountNumber: e.target.value}})} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Shipping Zones & Rates</h3>
            <p className="text-sm text-slate-500">Define shipping prices for your website checkout.</p>
            
            <div className="space-y-3">
              {settings?.shippingRates?.map((rate: any) => (
                <div key={rate.id} className="flex flex-col gap-2 p-3 border border-slate-100 bg-slate-50 rounded-lg relative">
                  <button onClick={() => removeShippingRate(rate.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><X size={14}/></button>
                  <input type="text" placeholder="Zone Name (e.g. Nationwide)" value={rate.name} onChange={e => updateShippingRate(rate.id, 'name', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                  <div className="flex gap-2">
                    <input type="number" placeholder="Price" value={rate.price} onChange={e => updateShippingRate(rate.id, 'price', parseFloat(e.target.value))} className="w-1/3 p-2 border border-slate-200 rounded-lg text-sm" />
                    <input type="text" placeholder="Condition (e.g. Under 5kg)" value={rate.condition} onChange={e => updateShippingRate(rate.id, 'condition', e.target.value)} className="w-2/3 p-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addShippingRate} className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus size={16} /> Add Shipping Rate
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Units Management</h3>
            <p className="text-sm text-slate-500">
              Define the units of measurement available when creating products. These appear in the dropdown during inventory management.
            </p>
            
            <div className="flex flex-wrap gap-2 pt-2">
              {settings?.customUnits?.map((unit: string) => (
                <div key={unit} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-sm font-semibold border border-slate-200">
                  {unit}
                  <button onClick={() => removeUnit(unit)} className="text-slate-400 hover:text-red-500 ml-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <input 
                type="text" 
                placeholder="e.g. pack, crate, oz"
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addUnit()}
                className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" 
              />
              <button 
                onClick={addUnit}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1"
              >
                <Plus size={16} /> Add Unit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
