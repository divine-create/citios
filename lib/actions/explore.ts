'use server'

import { db } from '@/src/prisma/db'
import { getCurrentCity } from '@/lib/city'

export async function getOrganizations() {
  try {
    const city = await getCurrentCity();
    let orgs;
    if (city) {
      const locs = await db.orm.public.Location.where({ }).all();
      const cityOrgIds = Array.from(new Set(locs.map(l => l.organizationId)));
      orgs = cityOrgIds.length > 0 ? await db.orm.public.Organization.where(o => o.id.in(cityOrgIds)).all() : [];
    } else {
      orgs = await db.orm.public.Organization.all();
    }
    
    return orgs.map(org => ({
      ...org,
      createdAt: org.createdAt.toString(),
      updatedAt: org.updatedAt ? org.updatedAt.toString() : null
    }));
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return [];
  }
}
