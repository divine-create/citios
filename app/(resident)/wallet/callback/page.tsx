import React from 'react';
import Link from 'next/link';
import { requireAuthenticatedAccount } from '@/lib/actions/tenant';

export const dynamic = 'force-dynamic';

export default async function WalletCallbackPage({ searchParams }: { searchParams: Promise<any> }) {
  await requireAuthenticatedAccount();
  const sp = await searchParams;
  const reference = sp.reference;
  
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-md w-full text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Funding Requested</h2>
        <p className="text-gray-500 mb-6">
          Your wallet funding request for <span className="font-semibold text-gray-700">{reference}</span> has been processed. The funds will appear in your available balance once confirmed by the payment provider.
        </p>
        <Link 
          href="/wallet" 
          className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Return to Wallet
        </Link>
      </div>
    </div>
  );
}
