import React from 'react';
import MerchantSupportHub from '@/components/merchant/support/MerchantSupportHub';
import { getMerchantSupportCases, getMerchantRefundRequests } from '@/app/actions/merchant-support';

export const metadata = {
  title: 'Support & Disputes | RestaurantOS Management'
};

export default async function RestaurantSupportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // The layout already does `requireMembership` to protect the route,
  // but we call the server actions which ALSO do `requireMembership`
  // so this is completely safe and properly scoped to the organization.
  
  const supportCases = await getMerchantSupportCases(slug);
  const refundRequests = await getMerchantRefundRequests(slug);

  return (
    <div className="max-w-4xl">
      <MerchantSupportHub 
        organizationId={slug}
        supportCases={supportCases}
        refundRequests={refundRequests}
      />
    </div>
  );
}
