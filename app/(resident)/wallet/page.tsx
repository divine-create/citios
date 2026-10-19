import React from 'react';
import { getResidentWallet, getResidentWalletTransactions } from '@/app/actions/resident_wallet';
import { AddMoneyForm } from './AddMoneyForm';
import { requireAuthenticatedAccount } from '@/lib/actions/tenant';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';

export const dynamic = 'force-dynamic';

export default async function ResidentWalletPage({ searchParams }: { searchParams: Promise<any> }) {
  const verticalsConfig = await getVerticalsConfig();
  if (!verticalsConfig.citypay) {
    return (
      <VerticalPausedNotice
        verticalName="CityPay"
        verticalId="citypay"
        description="CityPay digital wallet and top-ups are currently disabled. Platform administrators can enable CityPay in HQ Command."
      />
    );
  }

  await requireAuthenticatedAccount();
  const wallet = await getResidentWallet();
  const sp = await searchParams;
  const page = sp.page ? parseInt(sp.page, 10) : 1;
  const { entries, total } = await getResidentWalletTransactions(page, 20);

  const balance = wallet ? wallet.balance : 0;
  const pending = wallet ? wallet.pendingAmount : 0;
  
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
        <p className="text-gray-500">Manage your CityOS balance and view history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Available Balance</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {pending > 0 && (
              <p className="text-sm text-yellow-600 font-medium mt-2">
                + ₦{pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending confirmation
              </p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Money</h2>
          <AddMoneyForm />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
        </div>
        
        {entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No transactions found in your wallet yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {entries.map((entry: any) => (
              <li key={entry.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {entry.amount > 0 ? 'Credited' : 'Debited'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.createdAt).toLocaleDateString()} at {new Date(entry.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className={`text-sm font-bold ${entry.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {entry.amount > 0 ? '+' : ''}₦{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
