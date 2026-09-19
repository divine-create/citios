import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { redirect } from 'next/navigation';
import WelcomeWizard from './WelcomeWizard';

export const metadata = { title: 'Welcome to CityConnect' };

export default async function WelcomePage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect('/api/auth/signin?callbackUrl=/welcome');
  if (session.user?.onboardingComplete) redirect('/');

  const cities = await db.orm.public.City.all();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <WelcomeWizard cities={cities} />
      </div>
    </div>
  );
}
