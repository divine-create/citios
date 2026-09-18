import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findPersonByEmail } from '@/lib/identity';
import CityHome from '@/components/cityos/CityHome';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  let firstName = '';

  if (session?.user?.email) {
    const person = await findPersonByEmail(session.user.email);
    if (person && person.firstName) {
      firstName = person.firstName;
    }
  }

  return <CityHome firstName={firstName} />;
}