'use server';
import { db } from '@/src/prisma/db';

export async function getLocalServicesOrgs() {
  const orgs = await db.orm.public.Organization.where({ type: 'SERVICES' }).all();
  
  return orgs.map((org) => {
    // Generate a deterministically fake rating for now, or use reviews if we had them fetched
    return {
      id: org.id,
      name: org.name,
      category: org.storeCategory?.toLowerCase() || 'general',
      hourlyRate: 50, // default if not set
      rating: 4.8, 
      jobsCompleted: 10,
      avatar: 'https://i.pravatar.cc/150?u=' + org.id,
      bio: org.description || 'Professional local service provider.',
    };
  });
}
