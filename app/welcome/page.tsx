import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveCities } from '@/lib/city';
import WelcomeWizard from './WelcomeWizard';
import { db } from '@/src/prisma/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = { title: 'Welcome to CityConnect' };

export default async function WelcomePage() {
  let session: any = null;
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

  // Pass only plain, stable values across the server/client boundary. The
  // database contract uses Temporal values on some columns, and leaking a
  // raw model row into a client component can fail during production render.
  const cityOptions = cities.map((city) => ({
    id: String(city.id),
    name: String(city.name),
    state: city.state ? String(city.state) : null,
    country: String(city.country || 'Nigeria'),
    slug: city.slug ? String(city.slug) : undefined,
  }));

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
            const dateValue = person.dateOfBirth as unknown as { epochMilliseconds?: number };
            const timestamp = typeof dateValue.epochMilliseconds === 'number'
              ? dateValue.epochMilliseconds
              : new Date(person.dateOfBirth as unknown as string).getTime();
            const dob = new Date(timestamp);
            if (!Number.isNaN(dob.getTime())) {
              initialData.dateOfBirth = dob.toISOString().split('T')[0];
            }
          } catch {
            // ignore date parsing issue
          }
        }
      }

      if (resident) {
        initialData.phone = typeof resident.phone === 'string' ? resident.phone : '';
        alreadyCompleted = !!resident.onboardingComplete;
        if (resident.interests) {
          try {
            const parsedInterests = JSON.parse(resident.interests);
            initialData.interests = Array.isArray(parsedInterests)
              ? parsedInterests.filter((interest): interest is string => typeof interest === 'string')
              : [];
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
          cities={cityOptions}
          initialData={initialData}
          isGuest={isGuest}
          alreadyCompleted={alreadyCompleted}
        />
      </div>
    </div>
  );
}
