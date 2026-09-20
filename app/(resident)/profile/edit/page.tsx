import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveCities } from '@/lib/city';
import { redirect } from 'next/navigation';
import EditProfileClient from './EditProfileClient';
import { getProfileAndWallet } from '@/lib/actions/profile';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit Profile - CityConnect' };

export default async function EditProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login?callbackUrl=/profile/edit');

  const profileData = await getProfileAndWallet();
  if (!profileData) redirect('/');

  const cities = await getActiveCities();

  return (
    <div className="max-w-xl mx-auto p-4 py-8">
      <EditProfileClient cities={cities} initialData={profileData.user} />
    </div>
  );
}
