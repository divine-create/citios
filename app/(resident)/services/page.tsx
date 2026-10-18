import { getCurrentCity } from '@/lib/city';
import { getCityServiceCategoryCounts } from '@/lib/actions/service';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityServices from '@/components/cityos/CityServices';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const config = await getVerticalsConfig();
  if (!config.services) {
    return <VerticalPausedNotice verticalName="Services" verticalId="services" />;
  }

  const city = await getCurrentCity();
  const categoryCounts = await getCityServiceCategoryCounts(city?.slug);

  return (
    <CityServices
      services={[]}
      initialCategoryCounts={categoryCounts}
      cityName={city?.name || 'City'}
    />
  );
}

