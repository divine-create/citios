import { db } from '@/src/prisma/db';
import { getCurrentCity } from '@/lib/city';
import { getCityBookableServices } from '@/lib/actions/service';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityServices from '@/components/cityos/CityServices';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const config = await getVerticalsConfig();
  if (!config.services) {
    return <VerticalPausedNotice verticalName="Services" verticalId="services" />;
  }

  // Canonical source: SERVICE-type organizations scoped to the current city.
  const city = await getCurrentCity();
  
  let orgs: any[] = [];
  if (city) {
    const locs = await db.orm.public.Location.where({ cityId: city.id }).all();
    const cityOrgIds = new Set(locs.map((l) => l.organizationId));
    const allServices = await db.orm.public.Organization.where({ type: 'SERVICES' }).all();
    orgs = allServices.filter((o) => cityOrgIds.has(o.id));
  }

  if (orgs.length === 0) {
    orgs = await db.orm.public.Organization.where({ type: 'SERVICES' }).all();
  }

  const services = await getCityBookableServices(city?.slug);

  return (
    <CityServices
      orgs={orgs.map((o) => ({ id: o.id, name: o.name, description: o.description }))}
      services={services}
      cityName={city?.name || 'City'}
    />
  );
}
