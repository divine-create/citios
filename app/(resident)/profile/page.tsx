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
  return <CityProfile citypayEnabled={verticalsConfig.citypay === true} />;
}
