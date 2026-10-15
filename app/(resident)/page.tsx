import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findPersonByEmail } from '@/lib/identity';
import CityHome from '@/components/cityos/CityHome';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  let firstName = '';

  try {
    if (session?.user?.email) {
      const person = await findPersonByEmail(session.user.email);
      if (person?.firstName) {
        firstName = person.firstName;
      }
    }
  } catch (e) {
    console.error('Home page session fetch error', e);
  }

  return <CityHome firstName={firstName} />;
}
