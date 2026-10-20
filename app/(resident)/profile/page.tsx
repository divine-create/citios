import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CityProfile from '@/components/cityos/CityProfile';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login?callbackUrl=/profile');
  }

  const verticalsConfig = await getVerticalsConfig();
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto p-8 text-center text-slate-400 font-bold animate-pulse">Loading profile...</div>}>
      <CityProfile citypayEnabled={verticalsConfig.citypay === true} />
    </Suspense>
  );
}
