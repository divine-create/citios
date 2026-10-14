'use server';

import { db } from '@/src/prisma/db';
import { getCurrentCity, getCityBySlug } from '@/lib/city';

export async function searchCityExplore(citySlug: string | undefined, query: string, cat: string) {
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  if (!city) {
    return { organizations: [], products: [] };
  }

  const listings = await db.orm.public.DiscoveryListing
    .where({ cityId: city.id, isActive: true })
    .include('organization', (org: any) => org.select('name', 'type', 'address', 'description'))
    .include('location', (loc: any) => loc.select('address', 'name'))
    .all();

  const q = query.trim().toLowerCase();
  
  let filtered = listings;
  if (cat !== 'All') {
    filtered = filtered.filter((l: any) => l.vertical.toLowerCase() === cat.toLowerCase());
  }
  if (q) {
    filtered = filtered.filter((l: any) => 
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.description && l.description.toLowerCase().includes(q)) ||
      (l.organization?.name && l.organization.name.toLowerCase().includes(q))
    );
  }

  // Enforce pagination/limits
  filtered = filtered.slice(0, 50);

  return { 
    organizations: filtered.map((l: any) => {
      let meta: any = {};
      try {
        if (l.metadata) meta = JSON.parse(l.metadata);
      } catch {}

      return {
        slug: l.slug,
        name: l.title || l.organization?.name,
        type: l.vertical,
        category: l.vertical,
        area: l.location?.name || l.location?.address || l.organization?.address || city.name,
        description: l.description || l.organization?.description,
        tagline: l.description || `Local ${l.vertical.toLowerCase()} in ${city.name}`,
        rating: typeof meta.rating === 'number' ? meta.rating : null, 
        isOpen: typeof meta.isOpen === 'boolean' ? meta.isOpen : true,
        deliveryEta: typeof meta.deliveryEta === 'number' ? meta.deliveryEta : null,
        cover: l.coverAssetId
      };
    }),
    products: [] // We skip direct product injection per architecture rules.
  };
}
