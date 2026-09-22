import { db } from '@/src/prisma/db';
import { getCurrentCity } from '@/lib/city';
import CityServices from '@/components/cityos/CityServices';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  // Canonical source: SERVICE-type organizations scoped to the current city.
  const city = await getCurrentCity();
  const orgs = city
    ? await db.orm.public.Organization.where({  type: 'SERVICES' }).all()
    : [];

  return (
    <CityServices
      orgs={orgs.map((o) => ({ id: o.id, name: o.name, description: o.description }))}
    />
  );
}
