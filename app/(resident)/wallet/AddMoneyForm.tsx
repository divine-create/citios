'use client';

import React, { useState } from 'react';
import { createResidentWalletFunding } from '@/app/actions/resident_wallet';
import { useRouter } from 'next/navigation';

export function AddMoneyForm() {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      setLoading(true);
      const res = await createResidentWalletFunding(numAmount, 'MONNIFY');
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        setError('No checkout URL returned from provider.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred initializing payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (NGN)</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">₦</span>
          </div>
          <input
            type="number"
            name="amount"
            id="amount"
            min="100"
            step="0.01"
            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
            required
          />
        </div>
      </div>
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !amount}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
      >
        {loading ? 'Processing...' : 'Fund Wallet'}
      </button>
    </form>
  );
}
