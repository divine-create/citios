import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { createInventoryItem } from '@/lib/actions/restaurantos';
import { POPULAR_UOMS } from './UOMConstants';

export function RawMaterialIntake({ organizationId, onDone }: any) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('KG');
  const [cost, setCost] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await createInventoryItem({
        organizationId,
        name,
        unit,
        cost: Number(cost) || 0,
        quantity: 0,
        type: 'RAW_MATERIAL',
        lowStockLevel: 5
      });
      if (res.error) throw new Error(res.error);
      if (onDone) onDone();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to create raw material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6 max-w-2xl">
      <div>
        <h3 className="text-xl font-black">Add Raw Material</h3>
        <p className="text-sm text-slate-500">Define a new raw material for your inventory.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Material Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tomato Paste" />
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit of Measure</label>
          <select className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none" value={unit} onChange={e => setUnit(e.target.value)}>
            {POPULAR_UOMS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Default Cost Price (Optional)" type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
      </div>
      
      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}

      <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
        <Button onClick={handleSave} isLoading={loading}>Save Material</Button>
      </div>
    </div>
  );
}
