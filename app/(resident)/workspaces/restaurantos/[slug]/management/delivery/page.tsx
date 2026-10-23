import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { db } from '@/src/prisma/db';
import DeliverySettingsView from '@/components/restaurantos/management/DeliverySettingsView';
import { getMerchantDeliverySettings } from '@/lib/actions/merchant-delivery-settings';

export default async function MerchantDeliverySettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN']);

  const [org, initialSettings] = await Promise.all([
    db.orm.public.Organization.where({ id: slug }).all().first(),
    getMerchantDeliverySettings(slug),
  ]);

  return (
    <DeliverySettingsView
      organizationId={slug}
      orgName={org?.name || 'Restaurant'}
      initialSettings={initialSettings}
    />
  );
}
