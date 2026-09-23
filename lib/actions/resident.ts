
'use server'
import { db } from '@/src/prisma/db'
import { getCurrentCity } from '@/lib/city'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// City scope: resident-facing org listings only surface orgs operating in
// the current city. When no city resolves (unseeded DB), the filter is
// skipped so existing behavior is preserved.
async function getOrgsByType(type: string) {
  const city = await getCurrentCity();
  // @ts-ignore
  let orgs = await db.orm.public.Organization.where({ type }).all();
  if (city) {
    const locs = await db.orm.public.Location.where({ cityId: city.id }).all();
    const cityOrgIds = new Set(locs.map(l => l.organizationId));
    orgs = orgs.filter(o => cityOrgIds.has(o.id));
  }
  return JSON.parse(JSON.stringify(orgs));
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

export async function getHotelOrgs() {
  return getOrgsByType('HOTEL');
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
    items = items.filter(i => i.locationId && validLocIds.has(i.locationId));
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

