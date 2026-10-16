import React from 'react';
import { requireSystemAdmin } from '@/lib/rbac';
import { getCurrentCity } from '@/lib/city';
import { getStorefrontPromotions } from '@/lib/actions/storefront-management';
import StorefrontPromotionsManager from '@/components/hq/StorefrontPromotionsManager';

export default async function HQPromotionsPage() {
  await requireSystemAdmin();

  const city = await getCurrentCity();
  const citySlug = city?.slug || 'calabar';

  const [foodCampaigns, marketCampaigns] = await Promise.all([
    getStorefrontPromotions(citySlug, 'FOOD'),
    getStorefrontPromotions(citySlug, 'MARKET'),
  ]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <StorefrontPromotionsManager
        initialFoodCampaigns={foodCampaigns}
        initialMarketCampaigns={marketCampaigns}
        citySlug={citySlug}
      />
    </div>
  );
}
