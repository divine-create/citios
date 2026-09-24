import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { createInventoryItem, adjustStock } from '@/lib/actions/restaurantos';

export function RawMaterialIntake({ organizationId, onComplete, onCancel }: any) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('KG');
  const [cost, setCost] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name || quantity <= 0) return;
    setLoading(true);
    try {
      const item = await createInventoryItem({
        organizationId,
        name,
        unit,
        cost,
        quantity: 0,
        type: 'RAW_MATERIAL',
        lowStockLevel: 5
      });
      // Add initial stock
      await adjustStock(item.id, quantity, 'Initial Intake / Delivery');
      onComplete();
    } catch (e: any) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black">Receive Raw Materials</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Material Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tomato Paste" />
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit of Measure</label>
          <select className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none" value={unit} onChange={e => setUnit(e.target.value)}>
            <option>KG</option>
            <option>LITERS</option>
            <option>PIECES</option>
            <option>GRAMS</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Received Quantity" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
        <Input label="Total Cost (for received batch)" type="number" value={cost} onChange={e => setCost(Number(e.target.value))} />
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} isLoading={loading}>Log Delivery</Button>
      </div>
    </div>
  );
}
