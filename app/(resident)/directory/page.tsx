import React from 'react';
import type { Metadata } from 'next';
import { getDirectoryListings } from '@/app/actions/directory';
import DirectoryView from '@/components/cityos/DirectoryView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Calabar Business Directory | 9jaLive',
  description: 'Find verified businesses, mechanics, pharmacies, legal chambers, artisans, and hotels across Calabar. Call or WhatsApp directly.',
};

export default async function DirectoryPage() {
  const data = await getDirectoryListings();

  return (
    <DirectoryView
      initialListings={data.listings}
      zones={data.zones}
      cityName={data.cityName}
    />
  );
}
