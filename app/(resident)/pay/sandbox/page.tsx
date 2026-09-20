import React, { Suspense } from 'react';
import SandboxPaymentView from './SandboxPaymentView';

export const metadata = {
  title: 'Paystack Sandbox Checkout | CityConnect',
};

export default function SandboxPaymentPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-center py-12 text-slate-400">Loading payment sandbox...</div>}>
        <SandboxPaymentView />
      </Suspense>
    </div>
  );
}
