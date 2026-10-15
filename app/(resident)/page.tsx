import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findPersonByEmail } from '@/lib/identity';
import { getResidentWallet } from '@/app/actions/resident_wallet';
import { getHotelOrgs, getRestaurantOrgs } from '@/lib/actions/resident';
import CityHome from '@/components/cityos/CityHome';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  let firstName = '';
  let walletData = null;
  let hotels: any[] = [];
  let restaurants: any[] = [];

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
    console.error('Home page session fetch error', e);
  }

  try {
    [hotels, restaurants] = await Promise.all([
      getHotelOrgs(),
      getRestaurantOrgs(),
    ]);
  } catch (e) {
    console.error('Home page listings fetch error', e);
  }

  return (
    <CityHome
      firstName={firstName}
      wallet={walletData}
      hotels={hotels}
      restaurants={restaurants}
    />
  );
}
