'use client';

import React, { useState } from 'react';
import { Sparkles, Plus, Trash2, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react';
import { bulkAddManagedCatalogItems } from '@/lib/actions/hq-managed-business';

interface ManagedBulkMenuParserProps {
  organizationId: string;
  businessType: string;
  onSuccess: () => void;
}

export default function ManagedBulkMenuParser({ organizationId, businessType, onSuccess }: ManagedBulkMenuParserProps) {
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState<Array<{ name: string; price: number; category: string; description: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultCategory = businessType === 'RESTAURANT' ? 'Native Specials' : 'General';

  const handleParse = () => {
    if (!rawText.trim()) return;
    setError(null);
    setSuccessCount(null);

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const results: Array<{ name: string; price: number; category: string; description: string }> = [];

    for (const line of lines) {
      // Split by hyphen, dash, colon, or pipe
      const parts = line.split(/[-–—:|]/).map(p => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        // Extract numeric price
        const priceMatch = parts[1].replace(/,/g, '').match(/\d+/);
        const price = priceMatch ? Number(priceMatch[0]) : 0;
        const description = parts[2] || '';
        results.push({
          name,
          price,
          category: defaultCategory,
          description,
        });
      }
    }

    if (results.length === 0) {
      setError('Could not detect item format. Please use: "Item Name - Price (₦) - Optional description"');
      return;
    }

    setParsedItems(results);
  };

  const handleRemoveItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setParsedItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleCommitBulk = async () => {
    if (parsedItems.length === 0) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await bulkAddManagedCatalogItems(organizationId, parsedItems);
      if (res.success) {
        setSuccessCount(res.count);
        setParsedItems([]);
        setRawText('');
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add items');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-3xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Bulk Menu & Catalog Text Parser</h3>
            <p className="text-xs text-slate-500">
              Paste raw text from WhatsApp messages, paper flyers, or websites to seed the entire catalog in one click.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Paste Menu Items (Format: Item Name - Price in ₦ - Description)
          </label>
          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Afang Soup & Pounded Yam - 3500 - Rich native soup with goat meat and stockfish
Jollof Rice & Crispy Chicken - 2800 - Smoky party jollof with spicy drumstick
Catfish Pepper Soup - 3200 - Fresh local catfish in spiced aromatic broth
Chapman Cocktail - 1200 - Classic Nigerian mocktail with citrus and cucumber`}
            className="w-full text-xs font-mono p-4 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500">
            Accepts hyphens (-), colons (:), or dashes. Prices can be formatted as <code>3500</code> or <code>₦3,500</code>.
          </span>
          <button
            onClick={handleParse}
            disabled={!rawText.trim()}
            className="px-6 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles size={14} /> Parse Items
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {successCount !== null && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} /> Successfully added {successCount} items to the catalog!
        </div>
      )}

      {parsedItems.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              Review Parsed Items ({parsedItems.length})
            </h4>
            <button
              onClick={handleCommitBulk}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? 'Saving...' : `Save All ${parsedItems.length} Items to Catalog`}
            </button>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {parsedItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    placeholder="Item Name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))}
                    className="w-full text-xs font-bold text-emerald-600 px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    placeholder="Price (₦)"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={item.category}
                    onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    placeholder="Category"
                  />
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    placeholder="Description"
                  />
                </div>
                <div className="sm:col-span-1 text-right">
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
