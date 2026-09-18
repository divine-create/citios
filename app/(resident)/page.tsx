import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import CityHome from '@/components/cityos/CityHome';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  let firstName = '';

  if (session?.user?.personId) {
    const person = await db.orm.public.Person.where({ id: session.user.personId as string }).all().first();
    if (person && person.firstName) {
      firstName = person.firstName;
    }
  }

  return <CityHome firstName={firstName} />;
}