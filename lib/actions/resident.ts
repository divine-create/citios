
'use server'
import { db } from '@/src/prisma/db'
import { getCurrentCity, getCityBySlug } from '@/lib/city'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isTestOrDemoOrganization } from '@/lib/storefront-filter';

// City scope: resident-facing org listings only surface orgs operating in
// the current city. When no city resolves (unseeded DB), the filter is
// skipped so existing behavior is preserved.
async function getOrgsByType(type: string) {
  const city = await getCurrentCity();
  // @ts-ignore
  let orgs = await db.orm.public.Organization.where({ type }).all();
  orgs = orgs.filter((o: any) => !isTestOrDemoOrganization(o));
  if (city) {
    const locs = await db.orm.public.Location.where({ cityId: city.id }).all();
    const cityOrgIds = new Set(locs.map(l => l.organizationId));
    orgs = orgs.filter(o => cityOrgIds.has(o.id));
  }

  const listings = await db.orm.public.DiscoveryListing.all();
  const listingMap = new Map(listings.map((l: any) => [l.organizationId, l]));

  return orgs.map((o: any) => {
    const listing = listingMap.get(o.id);
    let cover = o.logoAssetId || listing?.coverAssetId;
    let rating: number | null = null;
    let images: string[] = [];
    if (listing?.metadata) {
      try {
        const meta = JSON.parse(listing.metadata);
        if (!cover) cover = meta.coverImage || meta.images?.[0];
        if (Array.isArray(meta.images) && meta.images.length > 0) {
          images = meta.images;
        }
        if (typeof meta.rating === 'number') {
          rating = meta.rating;
        }
      } catch {}
    }
    return {
      ...o,
      storeCoverImage: cover,
      image: cover,
      imageUrl: cover,
      coverAssetId: cover,
      images: images.length > 0 ? images : cover ? [cover] : [],
      rating: rating,
      neighborhood: o.address ? o.address.split(',')[0].trim() : (city?.name ?? ''),
    };
  });
}

export async function getHealthcareOrgs() {
  return getOrgsByType('HEALTHCARE');
}

export async function getPharmacyOrgs() {
  return getOrgsByType('PHARMACY');
}

export async function getEducationOrgs() {
  return getOrgsByType('SCHOOL');
}

export async function getSchoolProfile(organizationId: string) {
  try {
    const organization = await db.orm.public.Organization.where({ id: organizationId }).all().first();
    if (!organization || organization.type !== 'SCHOOL') return null;

    const settings = await db.orm.public.SchoolSettings.where({ organizationId }).all().first();
    const students = await db.orm.public.StudentData.where({ classSectionId: "" }).all(); // approximate for old mock data
    const teacherCount = (await db.orm.public.MembershipRole.where({ role: 'TEACHER', membershipId: "" }).all()).length;
    const classCount = (await db.orm.public.SchoolClass.where({ organizationId }).all()).length;

    const yearLevels = students.map((s) => s.yearLevel).filter((y): y is number => typeof y === 'number');
    const gradeRange = yearLevels.length > 0 ? `${Math.min(...yearLevels)}-${Math.max(...yearLevels)}` : null;

    return JSON.parse(JSON.stringify({
      organization,
      settings,
      studentCount: students.length,
      teacherCount,
      classCount,
      gradeRange,
    }));
  } catch (error) {
    console.error('Error fetching school profile:', error);
    return null;
  }
}

export async function getRestaurantOrgs() {
  return getOrgsByType('RESTAURANT');
}

export async function getEventOrgs() {
  return getOrgsByType('EVENT_ORGANIZER');
}

export async function getLocalServicesOrgs() {
  return getOrgsByType('LOGISTICS');
}

// And we can fetch specific data like menus or items
export async function getRestaurantMenu(orgId: string) {
    const activeCity = await getCurrentCity();
    let locs = await db.orm.public.Location.where({ organizationId: orgId }).all();
    if (activeCity) {
      locs = locs.filter(l => l.cityId === activeCity.id);
      if (locs.length === 0) return [];
    }
    const items = await db.orm.public.MenuItem.where({ organizationId: orgId }).all();
    return JSON.parse(JSON.stringify(items));
}

export async function getPharmacyItems(orgId: string) {
    const activeCity = await getCurrentCity();
    let locs = await db.orm.public.Location.where({ organizationId: orgId }).all();
    if (activeCity) {
      locs = locs.filter(l => l.cityId === activeCity.id);
      if (locs.length === 0) return [];
    }
    const items = await db.orm.public.PharmacyItem.where({ organizationId: orgId }).all();
    return JSON.parse(JSON.stringify(items));
}

export async function getRideOrgs() {
  return getOrgsByType('LOGISTICS');
}

export async function getHotelOrgs(citySlug?: string) {
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  // @ts-ignore
  let orgs = await db.orm.public.Organization.where({ type: 'HOTEL' }).all();
  orgs = orgs.filter((o: any) => !isTestOrDemoOrganization(o));
  if (city) {
    const locs = await db.orm.public.Location.where({ cityId: city.id }).all();
    const cityOrgIds = new Set(locs.map(l => l.organizationId));
    orgs = orgs.filter(o => cityOrgIds.has(o.id));
  }

  const listings = await db.orm.public.DiscoveryListing.all();
  const listingMap = new Map(listings.map((l: any) => [l.organizationId, l]));

  const allRooms = await db.orm.public.HotelRoom.all();
  const roomsByOrg = new Map<string, any[]>();
  for (const r of allRooms) {
    if (!roomsByOrg.has(r.organizationId)) roomsByOrg.set(r.organizationId, []);
    roomsByOrg.get(r.organizationId)!.push(r);
  }

  // Only surface hotels that actually have rooms or an active DiscoveryListing
  orgs = orgs.filter((o: any) => {
    const listing = listingMap.get(o.id);
    const orgRooms = roomsByOrg.get(o.id) || [];
    if (listing && listing.isActive === false) return false;
    return orgRooms.length > 0 || Boolean(listing?.isActive);
  });

  return orgs.map((o: any) => {
    const listing = listingMap.get(o.id);
    let cover = o.logoAssetId || listing?.coverAssetId;
    let rating: number | null = null;
    let reviewScore: number | null = null;
    let reviewText: string | null = null;
    let reviewCount: number = 0;
    let stars: number | null = null;
    let images: string[] = [];
    let meta: any = null;

    if (listing?.metadata) {
      try {
        meta = JSON.parse(listing.metadata);
        if (!cover) cover = meta.coverImage || meta.images?.[0];
        if (Array.isArray(meta.images) && meta.images.length > 0) {
          images = meta.images;
        }
        if (typeof meta.rating === 'number' && meta.rating > 0) {
          rating = meta.rating;
          reviewScore = Number((meta.rating * 2).toFixed(1));
        }
        if (typeof meta.reviewCount === 'number') reviewCount = meta.reviewCount;
        if (typeof meta.stars === 'number') stars = meta.stars;
      } catch {}
    }

    if (reviewScore !== null) {
      if (reviewScore >= 9.0) reviewText = 'Superb';
      else if (reviewScore >= 8.5) reviewText = 'Fabulous';
      else if (reviewScore >= 8.0) reviewText = 'Very Good';
      else reviewText = 'Good';
    }

    const orgRooms = roomsByOrg.get(o.id) || [];
    const validRates = orgRooms
      .map((r: any) => r.baseRate)
      .filter((r: any): r is number => typeof r === 'number' && r > 0);
    const minRate = validRates.length > 0 ? Math.min(...validRates) : null;

    return {
      ...o,
      storeCoverImage: cover,
      image: cover,
      imageUrl: cover,
      coverAssetId: cover,
      images: images.length > 0 ? images : cover ? [cover] : [],
      rating,
      reviewScore,
      reviewText,
      reviewCount,
      stars,
      price: minRate,
      startingPrice: minRate,
      compareAtPrice: typeof meta?.compareAtPrice === 'number' ? meta.compareAtPrice : null,
      roomsCount: orgRooms.length,
      rooms: orgRooms,
      roomType: orgRooms[0]?.type || null,
      bedType: orgRooms[0]?.bedType || null,
      neighborhood: meta?.neighborhood || (o.address ? o.address.split(',')[0].trim() : (city?.name ?? '')),
      area: meta?.neighborhood || (o.address ? o.address.split(',')[0].trim() : (city?.name ?? '')),
      distanceFromCenter: meta?.distanceFromCenter || null,
      isVerified: Boolean(meta?.isVerified),
      hasPowerGuarantee: Boolean(meta?.hasPowerGuarantee),
      freeCancellation: Boolean(meta?.freeCancellation),
      breakfastIncluded: Boolean(meta?.breakfastIncluded),
      whatsappPhone: meta?.whatsappPhone || null,
      bookingUrl: meta?.bookingUrl || null,
      amenities: Array.isArray(meta?.amenities) ? meta.amenities : [],
      stayCategory: meta?.stayCategory || 'Hotel',
    };
  });
}

export async function getHotelRooms(orgId: string) {
    const activeCity = await getCurrentCity();
    let locs = await db.orm.public.Location.where({ organizationId: orgId }).all();
    if (activeCity) {
      const cityLocs = locs.filter(l => l.cityId === activeCity.id);
      if (cityLocs.length > 0) locs = cityLocs;
    }
    const validLocIds = new Set(locs.map(l => l.id));
    let items = await db.orm.public.HotelRoom.where({ organizationId: orgId }).all();
    items = items.filter(i => !i.locationId || validLocIds.has(i.locationId));
    return JSON.parse(JSON.stringify(items));
}

export async function getParentDashboard() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.personId) return [];
    
    const personId = session.user.personId;
    const auths = await db.orm.public.GuardianAuthorization.where({ guardianPersonId: personId }).all();
    if (auths.length === 0) return [];
    
    const wardRelIds = auths.map((a: any) => a.wardRelationshipId);
    
    // Fetch students linked to those relationships
    const allStudents = await db.orm.public.StudentData.all();
    const students = allStudents.filter(s => wardRelIds.includes(s.relationshipId));
    
    return JSON.parse(JSON.stringify(students));
  } catch (e) {
    console.error(e);
    return [];
  }
}

