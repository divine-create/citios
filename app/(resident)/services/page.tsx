import { db } from '@/src/prisma/db';
import { getCurrentCity } from '@/lib/city';
import { getCityBookableServices } from '@/lib/actions/service';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityServices from '@/components/cityos/CityServices';
import { formatWhatsAppNumber } from '@/lib/whatsapp';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const config = await getVerticalsConfig();
  if (!config.services) {
    return <VerticalPausedNotice verticalName="Services" verticalId="services" />;
  }

  // Canonical source: SERVICE-type organizations scoped to the current city.
  const city = await getCurrentCity();
  
  let orgs: any[] = [];
  let locs: any[] = [];
  if (city) {
    locs = await db.orm.public.Location.where({ cityId: city.id }).all();
    const cityOrgIds = new Set(locs.map((l) => l.organizationId));
    const allServices = await db.orm.public.Organization.where({ type: 'SERVICES' }).all();
    orgs = allServices.filter((o) => cityOrgIds.has(o.id));
  }

  if (orgs.length === 0) {
    orgs = await db.orm.public.Organization.where({ type: 'SERVICES' }).all();
    locs = await db.orm.public.Location.all();
  }

  const [services, contacts, reviews, likes] = await Promise.all([
    getCityBookableServices(city?.slug),
    db.orm.public.OrganizationContactPoint.all(),
    db.orm.public.Review.all(),
    db.orm.public.SavedItem.where({ entityType: 'service_org' }).all(),
  ]);

  let currentPersonId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    currentPersonId = session?.user?.personId ?? null;
  } catch {}

  const contactMap = new Map<string, { phone: string | null; whatsapp: string | null }>();
  for (const cp of contacts) {
    if (!contactMap.has(cp.organizationId)) {
      contactMap.set(cp.organizationId, { phone: null, whatsapp: null });
    }
    const entry = contactMap.get(cp.organizationId)!;
    if (cp.type === 'WHATSAPP' && cp.value) {
      entry.whatsapp = formatWhatsAppNumber(cp.value);
    } else if (cp.type === 'PHONE' && cp.value) {
      entry.phone = cp.value;
      if (!entry.whatsapp) entry.whatsapp = formatWhatsAppNumber(cp.value);
    }
  }

  const locationMap = new Map<string, string>();
  for (const loc of locs) {
    if (loc.address && !locationMap.has(loc.organizationId)) {
      locationMap.set(loc.organizationId, loc.address);
    }
  }

  const reviewsMap = new Map<string, { sum: number; count: number }>();
  for (const r of reviews) {
    if (!reviewsMap.has(r.organizationId)) {
      reviewsMap.set(r.organizationId, { sum: 0, count: 0 });
    }
    const entry = reviewsMap.get(r.organizationId)!;
    entry.sum += r.rating;
    entry.count += 1;
  }

  const likesMap = new Map<string, number>();
  for (const lk of likes) {
    likesMap.set(lk.entityId, (likesMap.get(lk.entityId) || 0) + 1);
  }

  const userLikedSet = new Set(
    currentPersonId ? likes.filter((l) => l.personId === currentPersonId).map((l) => l.entityId) : []
  );

  const enrichedOrgs = orgs.map((o) => {
    const contact = contactMap.get(o.id);
    const revStat = reviewsMap.get(o.id);
    const avgRating = revStat && revStat.count > 0 ? Number((revStat.sum / revStat.count).toFixed(1)) : null;

    return {
      id: o.id,
      name: o.name,
      description: o.description,
      phone: contact?.phone || null,
      whatsapp: contact?.whatsapp || null,
      address: locationMap.get(o.id) || null,
      rating: avgRating,
      reviewCount: revStat?.count || 0,
      likesCount: likesMap.get(o.id) || 0,
      userHasLiked: userLikedSet.has(o.id),
    };
  });

  return (
    <CityServices
      orgs={enrichedOrgs}
      services={services}
      cityName={city?.name || 'City'}
    />
  );
}
