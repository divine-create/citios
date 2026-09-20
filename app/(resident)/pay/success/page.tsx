import React, { Suspense } from 'react';
import PaymentSuccess from '@/components/cityos/PaymentSuccess';

export const metadata = {
  title: 'Order Confirmed | CityConnect',
};

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400 text-sm">Verifying payment confirmation...</div>}>
      <PaymentSuccess />
    </Suspense>
  );
}