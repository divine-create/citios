import CityProfile from '@/components/cityos/CityProfile';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';

export default async function ProfilePage() {
  const verticalsConfig = await getVerticalsConfig();
  return <CityProfile citypayEnabled={verticalsConfig.citypay === true} />;
}