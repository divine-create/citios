import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { adjustStock } from '@/lib/actions/restaurantos';

export function ReceiveStockForm({ organizationId, rawMaterials, onDone }: any) {
  const [selectedId, setSelectedId] = useState(rawMaterials[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('Purchased stock delivery');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!selectedId) {
      setError('Please select a material');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await adjustStock(selectedId, qty, notes);
      if (res?.error) throw new Error(res.error);
      if (onDone) onDone();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to receive stock');
    } finally {
      setLoading(false);
    }
  };

  if (rawMaterials.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center">
        <p className="text-slate-500 mb-4">You have no raw materials defined yet.</p>
      </div>
    );
  }

  const selectedItem = rawMaterials.find((r: any) => r.id === selectedId);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6 max-w-2xl">
      <div>
        <h3 className="text-xl font-black">Receive Stock</h3>
        <p className="text-sm text-slate-500">Log incoming deliveries to increase inventory stock.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Material</label>
          <select className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {rawMaterials.map((r: any) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-1.5">
          <Input 
            label={'Quantity (' + (selectedItem?.unit || '') + ')'} 
            type="number" 
            value={quantity} 
            onChange={e => setQuantity(e.target.value)} 
            placeholder="0" 
          />
        </div>
      </div>

      <div>
        <Input label="Reference / Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Invoice #1234" />
      </div>
      
      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}

      <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
        <Button onClick={handleSave} isLoading={loading}>Log Delivery</Button>
      </div>
    </div>
  );
}
