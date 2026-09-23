import { db } from '@/src/prisma/db';
import { getCurrentCity } from '@/lib/city';
import CityServices from '@/components/cityos/CityServices';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  // Canonical source: SERVICE-type organizations scoped to the current city.
  const city = await getCurrentCity();
  
  let orgs: any[] = [];
  if (city) {
    const locs = await db.orm.public.Location.where({ cityId: city.id }).all();
    const cityOrgIds = Array.from(new Set(locs.map((l) => l.organizationId)));
    orgs = cityOrgIds.length > 0 
      ? await db.orm.public.Organization.where((o: any) => o.type === 'SERVICES' && o.id.in(cityOrgIds)).all()
      : [];
  }

  return (
    <CityServices
      orgs={orgs.map((o) => ({ id: o.id, name: o.name, description: o.description }))}
    />
  );
}
