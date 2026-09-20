import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { redirect } from 'next/navigation';
import EditProfileClient from './EditProfileClient';
import { getProfileAndWallet } from '@/lib/actions/profile';

export const metadata = { title: 'Edit Profile - CityConnect' };

export default async function EditProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin?callbackUrl=/profile/edit');

  const profileData = await getProfileAndWallet();
  if (!profileData) redirect('/');

  const cities = await db.orm.public.City.all();

  return (
    <div className="max-w-xl mx-auto p-4 py-8">
      <EditProfileClient cities={cities} initialData={profileData.user} />
    </div>
  );
}
