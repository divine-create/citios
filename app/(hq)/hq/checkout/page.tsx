import React from 'react';
import { requireSystemAdmin } from '@/lib/rbac';
import { getCheckoutConfig } from '@/lib/actions/checkout-settings';
import AdminCheckoutConfig from '@/components/hq/AdminCheckoutConfig';
import { CreditCard } from 'lucide-react';

export const metadata = {
  title: 'Checkout & Payment Configuration - HQ Command',
};

export default async function HQCheckoutSettingsPage() {
  await requireSystemAdmin();
  const initialConfig = await getCheckoutConfig();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            <h1 className="text-3xl font-black text-white tracking-tight">Checkout Settings</h1>
          </div>
          <p className="text-slate-400 mt-1">
            Configure platform-wide active payment methods, WhatsApp checkout routing, and delivery rules.
          </p>
        </div>
      </div>

      <AdminCheckoutConfig initialConfig={initialConfig} />
    </div>
  );
}
