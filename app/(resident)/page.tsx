import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findPersonByEmail } from '@/lib/identity';
import { getResidentWallet } from '@/app/actions/resident_wallet';
import CityHome from '@/components/cityos/CityHome';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  let firstName = '';
  let walletData = null;

  try {
    if (session?.user?.email) {
      const person = await findPersonByEmail(session.user.email);
      if (person?.firstName) {
        firstName = person.firstName;
      }
      if (person) {
        const wallet = await getResidentWallet(person.id);
        if (wallet) {
           walletData = { balance: wallet.balance, currency: wallet.currency };
        }
      }
    }
  } catch (e) {
    console.error('Home page fetch error', e);
  }

  return <CityHome firstName={firstName} wallet={walletData} />;
}
