import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveCities } from '@/lib/city';
import WelcomeWizard from './WelcomeWizard';
import { db } from '@/src/prisma/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Welcome to CityConnect' };

export default async function WelcomePage() {
  let session = null;
  let cities: Awaited<ReturnType<typeof getActiveCities>> = [];

  try {
    session = await getServerSession(authOptions);
  } catch (err) {
    console.error('[WelcomePage] getServerSession failed:', err);
  }

  try {
    cities = await getActiveCities();
  } catch (err) {
    console.error('[WelcomePage] getActiveCities failed:', err);
  }

  const isGuest = !session?.user;
  let alreadyCompleted = false;

  const initialData = {
    homeCityId: '',
    dateOfBirth: '',
    phone: '',
    interests: [] as string[],
  };

  if (session?.user?.personId) {
    try {
      const person = await db.orm.public.Person.where({ id: session.user.personId }).all().first();
      const resident = await db.orm.public.ResidentProfile.where({ personId: session.user.personId }).all().first();

      if (person) {
        initialData.homeCityId = person.homeCityId || '';
        if (person.dateOfBirth) {
          try {
            const dob = new Date(person.dateOfBirth);
            initialData.dateOfBirth = dob.toISOString().split('T')[0];
          } catch {
            // ignore date parsing issue
          }
        }
      }

      if (resident) {
        initialData.phone = resident.phone || '';
        alreadyCompleted = !!resident.onboardingComplete;
        if (resident.interests) {
          try {
            initialData.interests = JSON.parse(resident.interests);
          } catch {
            initialData.interests = [];
          }
        }
      }
    } catch (err) {
      console.error('[WelcomePage] Error fetching resident profile:', err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 my-8">
        <WelcomeWizard
          cities={cities}
          initialData={initialData}
          isGuest={isGuest}
          alreadyCompleted={alreadyCompleted}
        />
      </div>
    </div>
  );
}
