'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { X } from 'lucide-react';

interface POSItemNotesModalProps {
  itemName: string;
  initialNotes: string;
  onCancel: () => void;
  onSave: (notes: string) => void;
}

export function POSItemNotesModal({ itemName, initialNotes, onCancel, onSave }: POSItemNotesModalProps) {
  const [notes, setNotes] = useState(initialNotes || '');

  const quickNotes = [
    "No Onion",
    "No Tomato",
    "Extra Sauce",
    "Spicy",
    "Mild",
    "Allergy",
    "To Go Box"
  ];

  const handleQuickNote = (note: string) => {
    if (notes.includes(note)) return;
    setNotes(prev => prev ? `${prev}, ${note}` : note);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-800">Notes for {itemName}</h3>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <textarea
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none"
              placeholder="e.g. No onion, extra spicy..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Quick Notes</label>
            <div className="flex flex-wrap gap-2">
              {quickNotes.map(qn => (
                <button
                  key={qn}
                  onClick={() => handleQuickNote(qn)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold text-slate-700 transition-colors"
                >
                  + {qn}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => onSave(notes)}>Save Notes</Button>
        </div>
      </div>
    </div>
  );
}
