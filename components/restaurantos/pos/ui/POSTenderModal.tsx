'use client';
import React, { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { X } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';

interface POSTenderModalProps {
  totalAmount: number;
  onCancel: () => void;
  onConfirm: (method: 'CASH' | 'POS' | 'WALLET', amountTendered?: number) => void;
  isProcessing?: boolean;
}

export function POSTenderModal({ totalAmount, onCancel, onConfirm, isProcessing }: POSTenderModalProps) {
  const { fmt } = useMoney();
  const [method, setMethod] = useState<'CASH' | 'POS' | 'WALLET' | null>(null);
  const [cashTendered, setCashTendered] = useState<string>('');

  const handleQuickAmount = (amount: number) => {
    setCashTendered(amount.toString());
  };

  const calculateChange = () => {
    const tendered = parseFloat(cashTendered) || 0;
    return tendered > totalAmount ? tendered - totalAmount : 0;
  };

  const isValidTender = () => {
    if (method !== 'CASH') return true;
    const tendered = parseFloat(cashTendered) || 0;
    return tendered >= totalAmount;
  };

  const handleConfirm = () => {
    if (!method) return;
    if (method === 'CASH' && !isValidTender()) return;
    onConfirm(method, method === 'CASH' ? parseFloat(cashTendered) : undefined);
  };

  const getQuickAmounts = () => {
    const amounts = [totalAmount];
    const base = Math.ceil(totalAmount / 500) * 500;
    if (base > totalAmount) amounts.push(base);
    if (base + 500 > totalAmount) amounts.push(base + 500);
    if (base + 1000 > totalAmount) amounts.push(base + 1000);
    return Array.from(new Set(amounts)).slice(0, 4);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xl font-black text-slate-800">Checkout</h3>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-8">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-2">Total Due</p>
            <div className="text-4xl font-black text-slate-900">{fmt(totalAmount)}</div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <Button 
              variant={method === 'CASH' ? 'primary' : 'outline'} 
              className={method === 'CASH' ? 'bg-emerald-600 hover:bg-emerald-700' : 'h-16'}
              onClick={() => setMethod('CASH')}
            >
              Cash
            </Button>
            <Button 
              variant={method === 'POS' ? 'primary' : 'outline'} 
              className="h-16"
              onClick={() => setMethod('POS')}
            >
              Card Terminal
            </Button>
            <Button 
              variant={method === 'WALLET' ? 'primary' : 'outline'} 
              className="h-16"
              onClick={() => setMethod('WALLET')}
            >
              CityPay
            </Button>
          </div>

          {method === 'CASH' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Cash Received</label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {getQuickAmounts().map((amt) => (
                      <button 
                        key={amt}
                        onClick={() => handleQuickAmount(amt)}
                        className="py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                      >
                        {fmt(amt)}
                      </button>
                    ))}
                  </div>
                  <Input 
                    type="number" 
                    value={cashTendered} 
                    onChange={(e) => setCashTendered(e.target.value)} 
                    placeholder="Enter custom amount..."
                    className="text-lg font-bold h-14"
                    autoFocus
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                  <span className="text-slate-500 font-bold">Change Due</span>
                  <span className={`text-2xl font-black ${calculateChange() > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {fmt(calculateChange())}
                  </span>
                </div>
              </div>
            </div>
          )}

          {method === 'POS' && (
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
              <p className="text-blue-800 font-bold">Process payment on the terminal.</p>
              <p className="text-sm text-blue-600 mt-2">Click confirm once the terminal says Approved.</p>
            </div>
          )}

          {method === 'WALLET' && (
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
              <p className="text-purple-800 font-bold">Scan customer wallet QR.</p>
              <p className="text-sm text-purple-600 mt-2">(Simulated for Phase 0 - will auto-approve)</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 mt-auto">
          <Button 
            className="w-full h-14 text-lg" 
            disabled={!method || (method === 'CASH' && !isValidTender()) || isProcessing}
            isLoading={isProcessing}
            onClick={handleConfirm}
          >
            {isProcessing ? 'Processing...' : 'Complete Payment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
