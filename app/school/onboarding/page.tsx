import SchoolOnboarding from '@/components/school/SchoolOnboarding';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Register School | CityConnect',
};

export default async function SchoolOnboardingPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    // Force them to log in before onboarding
    redirect('/api/auth/signin?callbackUrl=/school/onboarding');
  }

  return <SchoolOnboarding />;
}
