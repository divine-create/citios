'use server'

import { db } from '@/src/prisma/db'

export async function getOrganizations() {
  try {
    const orgs = await db.orm.public.Organization.all();
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
