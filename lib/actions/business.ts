'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/src/prisma/db";
import { provisionRestaurantOS } from "@/lib/actions/restaurantos";
import { requireAuthenticatedAccount, requireMembership } from "@/lib/actions/tenant";

// Registration default: when the onboarding form doesn't specify a city, the
// organization lands in the first active city in the registry. Explicit
// slugs are always validated against the canonical City table before
// persisting Organization.cityId.
async function resolveRegistrationCity(citySlug?: string) {
  const slug = (citySlug || '').trim().toLowerCase();
  if (slug) {
    return db.orm.public.City.where({ slug }).all().first();
  }
  const first = await db.orm.public.City.where({ isActive: true }).all().first();
  return first ?? null;
}

export async function registerOrganization(data: {
  name: string;
  type: string;
  description?: string;
  citySlug?: string;
  address?: string;
}) {
  let person: any;
  try {
    const auth = await requireAuthenticatedAccount();
    person = auth.person;
  } catch (err: any) {
    return { error: err.message || "You must be logged in to register a business." };
  }

  const trimmedName = (data.name || '').trim();
  if (!trimmedName) {
    return { error: "Organization name is required." };
  }

  // Validate OrgType
  const validTypes = ['GOVERNMENT', 'SCHOOL', 'HEALTHCARE', 'RETAIL', 'RESTAURANT', 'REAL_ESTATE', 'SERVICES', 'LOGISTICS', 'HOTEL', 'EVENT_ORGANIZER'];
  if (!validTypes.includes(data.type)) {
    return { error: "Invalid organization type." };
  }

  // Prevent duplicate organization registration by the same owner
  const existingOrgs = await db.orm.public.Organization.where({ name: trimmedName }).all();
  if (existingOrgs.length > 0) {
    for (const existingOrg of existingOrgs) {
      const mem = await db.orm.public.Membership.where({ organizationId: existingOrg.id, personId: person.id }).all().first();
      if (mem) {
        return { error: `You already own or belong to an organization named "${trimmedName}".` };
      }
    }
  }

  try {
    // Require a legitimate city association: resolve + validate against the
    // canonical City registry. Never persist an unvalidated client value.
    const city = await resolveRegistrationCity(data.citySlug);
    if (!city) {
      return { error: "Unknown city. Organizations must be registered in a supported city." };
    }

    const orgId = await db.transaction(async (tx: any) => {
      const org = await tx.orm.public.Organization.create({
        name: trimmedName,
        type: data.type as any,
        description: data.description || "",
        address: data.address || null,
      });

      const membership = await tx.orm.public.Membership.create({
        personId: person.id,
        organizationId: org.id,
      });

      await tx.orm.public.MembershipRole.create({
        membershipId: membership.id,
        role: 'OWNER',
      });

      // Provision primary location bound to canonical City
      const location = await tx.orm.public.Location.create({
        organizationId: org.id,
        name: 'Main Location',
        address: data.address || null,
        cityId: city.id,
      });

      // Bind member to primary location
      await tx.orm.public.MembershipLocation.create({
        membershipId: membership.id,
        locationId: location.id,
      });

      // Provision canonical organization wallet
      await tx.orm.public.Wallet.create({
        organizationId: org.id,
        balance: 0.0,
        currency: city.currency || "NGN",
      });

      // Provision canonical DiscoveryListing for marketplace visibility
      const listingSlug = `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${org.id.slice(0, 8)}`;
      await tx.orm.public.DiscoveryListing.create({
        organizationId: org.id,
        locationId: location.id,
        cityId: city.id,
        vertical: data.type,
        slug: listingSlug,
        title: trimmedName,
        description: data.description || null,
        isActive: true,
      });

      // Provision RestaurantOS settings if applicable
      if (data.type === 'RESTAURANT') {
        await tx.orm.public.RestaurantSettings.create({
          organizationId: org.id,
          serviceStyle: 'HYBRID',
        });
      }

      return org.id;
    });

    return { success: true, organizationId: orgId };
  } catch (err: any) {
    console.error("Error registering organization:", err);
    return { error: err.message || "Failed to register organization." };
  }
}

export async function registerSchool(data: {
  name: string;
  shortName: string;
  state: string;
  lga: string;
  address: string;
  phone: string;
  email: string;
}) {
  let person: any;
  try {
    const auth = await requireAuthenticatedAccount();
    person = auth.person;
  } catch (err: any) {
    return { error: err.message || "You must be logged in to register a school." };
  }

  try {
    // Schools follow the same canonical city relationship (SchoolSettings
    // state/lga remain descriptive fields on the school's own record).
    const city = await resolveRegistrationCity();
    if (!city) {
      return { error: "Unknown city. Schools must be registered in a supported city." };
    }

    const orgId = await db.transaction(async (tx: any) => {
      const fullAddress = `${data.address}, ${data.lga}, ${data.state}`;
      const org = await tx.orm.public.Organization.create({
        name: data.name,
        type: 'SCHOOL' as any,
        address: fullAddress,
      });

      const membership = await tx.orm.public.Membership.create({
        personId: person.id,
        organizationId: org.id,
      });

      await tx.orm.public.MembershipRole.create({
        membershipId: membership.id,
        role: 'OWNER',
      });

      const location = await tx.orm.public.Location.create({
        organizationId: org.id,
        name: data.shortName || 'Main Campus',
        address: fullAddress,
        cityId: city.id,
      });

      await tx.orm.public.MembershipLocation.create({
        membershipId: membership.id,
        locationId: location.id,
      });

      await tx.orm.public.Wallet.create({
        organizationId: org.id,
        balance: 0.0,
        currency: city.currency || "NGN",
      });

      const listingSlug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${org.id.slice(0, 8)}`;
      await tx.orm.public.DiscoveryListing.create({
        organizationId: org.id,
        locationId: location.id,
        cityId: city.id,
        vertical: 'SCHOOL',
        slug: listingSlug,
        title: data.name,
        description: fullAddress,
        isActive: true,
      });

      await tx.orm.public.SchoolSettings.create({
        organizationId: org.id,
        name: data.name,
        shortName: data.shortName,
        state: data.state,
        lga: data.lga,
        address: data.address,
        phone: data.phone,
        email: data.email,
        currentYear: new Date().getFullYear(),
      });

      return org.id;
    });

    return { success: true, organizationId: orgId };
  } catch (err: any) {
    console.error("Error registering school:", err);
    return { error: err.message || "Failed to register school." };
  }
}

function resolveWorkspaceUrl(orgId: string, type: string): string {
  switch (type) {
    case 'RETAIL':
      return `/workspaces/shopos/${orgId}`;
    case 'RESTAURANT':
      return `/workspaces/restaurantos/${orgId}/management/overview`;
    case 'SERVICES':
      return `/workspaces/serviceos/${orgId}`;
    case 'SCHOOL':
      return `/school/admin?org=${orgId}`;
    case 'HOTEL':
      return `/hotel/manager?org=${orgId}`;
    case 'EVENT_ORGANIZER':
      return `/admin/events?org=${orgId}`;
    case 'HEALTHCARE':
      return `/admin/healthcare?org=${orgId}`;
    case 'LOGISTICS':
      return `/business/logisticsos/dashboard?org=${orgId}`;
    default:
      return `/workspaces/shopos/${orgId}`;
  }
}

export async function getWorkspaceUrlForOrg(orgId: string, type: string): Promise<string> {
  return resolveWorkspaceUrl(orgId, type);
}

export async function getMyBusinesses() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    return [];
  }

  try {
    const memberships = await db.orm.public.Membership.where({ personId: session.user.personId }).all();
    if (!memberships || memberships.length === 0) {
      return [];
    }

    const { isTestOrDemoOrganization } = await import('@/lib/storefront-filter');
    const businesses = [];
    for (const m of memberships) {
      const org = await db.orm.public.Organization.where({ id: m.organizationId }).all().first();
      if (!org || isTestOrDemoOrganization(org)) continue;

      const [roles, loc] = await Promise.all([
        db.orm.public.MembershipRole.where({ membershipId: m.id }).all(),
        db.orm.public.Location.where({ organizationId: org.id }).all().first(),
      ]);
      const city = loc?.cityId
        ? await db.orm.public.City.where({ id: loc.cityId }).all().first()
        : null;

      businesses.push({
        id: org.id,
        name: org.name,
        type: org.type,
        description: org.description,
        address: org.address || loc?.address || null,
        cityId: city?.id ?? null,
        citySlug: city?.slug ?? null,
        cityName: city?.name ?? null,
        role: roles[0]?.role || 'MEMBER',
        workspaceUrl: resolveWorkspaceUrl(org.id, org.type),
      });
    }

    return businesses;
  } catch (error) {
    console.error("Error fetching my businesses:", error);
    return [];
  }
}

export async function quickCreateBusiness(data: {
  name: string;
  type: string;
  description?: string;
  citySlug?: string;
  address?: string;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.personId) {
    return { error: "You must be logged in to create a business page." };
  }

  const name = (data.name || '').trim();
  if (!name) {
    return { error: "Business name is required." };
  }

  const validTypes = ['RETAIL', 'RESTAURANT', 'SERVICES', 'SCHOOL', 'HOTEL', 'EVENT_ORGANIZER', 'HEALTHCARE', 'LOGISTICS'];
  if (!validTypes.includes(data.type)) {
    return { error: "Invalid business category." };
  }

  // Prevent duplicate organization registration by the same owner
  const existingOrgs = await db.orm.public.Organization.where({ name }).all();
  if (existingOrgs.length > 0) {
    for (const existingOrg of existingOrgs) {
      const mem = await db.orm.public.Membership.where({
        organizationId: existingOrg.id,
        personId: session.user.personId,
      }).all().first();
      if (mem) {
        return { error: `You already own or belong to a business page named "${name}".` };
      }
    }
  }

  try {
    const city = await resolveRegistrationCity(data.citySlug);
    if (!city) {
      return { error: "Unable to resolve active city. Please ensure at least one city is configured." };
    }

    const org = await db.transaction(async (tx: any) => {
      const createdOrg = await tx.orm.public.Organization.create({
        name,
        type: data.type as any,
        description: (data.description || '').trim(),
        address: (data.address || '').trim() || city.name,
      });

      const membership = await tx.orm.public.Membership.create({
        personId: session.user.personId,
        organizationId: createdOrg.id,
      });

      await tx.orm.public.MembershipRole.create({
        membershipId: membership.id,
        role: 'OWNER',
      });

      // Provision primary location & wallet
      const location = await tx.orm.public.Location.create({
        organizationId: createdOrg.id,
        name: 'Main Location',
        address: createdOrg.address || null,
        cityId: city.id,
      });

      await tx.orm.public.MembershipLocation.create({
        membershipId: membership.id,
        locationId: location.id,
      });

      await tx.orm.public.Wallet.create({
        organizationId: createdOrg.id,
        balance: 0.0,
        currency: city.currency || 'NGN',
      });

      // Provision canonical DiscoveryListing for marketplace & public /org/[id] visibility
      const listingSlug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${createdOrg.id.slice(0, 8)}`;
      await tx.orm.public.DiscoveryListing.create({
        organizationId: createdOrg.id,
        locationId: location.id,
        cityId: city.id,
        vertical: data.type,
        slug: listingSlug,
        title: name,
        description: (data.description || '').trim() || null,
        isActive: true,
      });

      return createdOrg;
    });

    // Auto-provision vertical configurations
    if (data.type === 'RESTAURANT') {
      await provisionRestaurantOS(org.id);
    } else if (data.type === 'RETAIL') {
      try {
        await db.orm.public.RetailSettings.create({
          organizationId: org.id,
          storeName: name,
          currencySymbol: '₦',
        });
      } catch (err) {
        console.warn('RetailSettings creation warning:', err);
      }
    } else if (data.type === 'SCHOOL') {
      try {
        await db.orm.public.SchoolSettings.create({
          organizationId: org.id,
          name,
          shortName: name.slice(0, 10).toUpperCase(),
          currentYear: new Date().getFullYear(),
          currencySymbol: '₦',
        });
      } catch (err) {
        console.warn('SchoolSettings creation warning:', err);
      }
    }

    const workspaceUrl = resolveWorkspaceUrl(org.id, data.type);

    return {
      success: true,
      business: {
        id: org.id,
        name: org.name,
        type: org.type,
        description: org.description,
        address: org.address,
        cityId: city.id,
        citySlug: city.slug,
        cityName: city.name,
        role: 'OWNER',
        workspaceUrl,
      },
      workspaceUrl,
    };
  } catch (err: any) {
    console.error("Error quick-creating business:", err);
    return { error: err.message || "Failed to create business page." };
  }
}



export async function registerHOTEL(data: {
  name: string;
  shortName: string;
  state: string;
  lga: string;
  address: string;
  phone: string;
  email: string;
}) {
  let person: any;
  try {
    const auth = await requireAuthenticatedAccount();
    person = auth.person;
  } catch (err: any) {
    return { error: err.message || 'You must be logged in to register a hotel.' };
  }

  try {
    const city = await resolveRegistrationCity();
    if (!city) {
      return { error: 'Unknown city.' };
    }

    const orgId = await db.transaction(async (tx: any) => {
      const org = await tx.orm.public.Organization.create({
        name: data.name,
        type: 'HOTEL' as any,
        description: data.address,
      });

      const location = await tx.orm.public.Location.create({
        organizationId: org.id,
        name: data.shortName || 'Main Lodge',
        address: data.address,
        cityId: city.id,
      });

      const membership = await tx.orm.public.Membership.create({
        personId: person.id,
        organizationId: org.id,
      });

      await tx.orm.public.MembershipRole.create({
        membershipId: membership.id,
        role: 'OWNER',
      });

      await tx.orm.public.MembershipLocation.create({
        membershipId: membership.id,
        locationId: location.id,
      });

      await tx.orm.public.Wallet.create({
        organizationId: org.id,
        balance: 0.0,
        currency: city.currency || 'NGN',
      });

      // Provision discovery listing for marketplace visibility
      const listingSlug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${org.id.slice(0, 8)}`;
      await tx.orm.public.DiscoveryListing.create({
        organizationId: org.id,
        locationId: location.id,
        cityId: city.id,
        vertical: 'HOTEL',
        slug: listingSlug,
        title: data.name,
        description: data.address || null,
        isActive: true,
      });

      return org.id;
    });

    return { success: true, organizationId: orgId };
  } catch (err: any) {
    return { error: err.message || 'Failed to register hotel.' };
  }
}

export async function getOrgLocations(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const locations = await db.orm.public.Location.where({ organizationId }).all();
    locations.sort((a: any, b: any) => a.name.localeCompare(b.name));
    return JSON.parse(JSON.stringify(locations));
  } catch (error) {
    console.error('Error fetching org locations:', error);
    return [];
  }
}

export async function createOrgLocation(input: { organizationId: string; name: string; address?: string }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.name?.trim()) return { error: 'Location name is required.' };
    const existingLoc = await db.orm.public.Location.where({ organizationId: input.organizationId }).all().first();
    const fallbackCity = existingLoc?.cityId
      ? null
      : await resolveRegistrationCity();
    const cityId = existingLoc?.cityId || fallbackCity?.id || null;

    const location = await db.orm.public.Location.create({
      organizationId: input.organizationId,
      name: input.name.trim(),
      address: input.address?.trim() || null,
      cityId,
    });
    return { success: true, location: JSON.parse(JSON.stringify(location)) };
  } catch (error: any) {
    console.error('Error creating location:', error);
    return { error: error?.message || 'Failed to create location.' };
  }
}

export async function getOrgJobs(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const jobs = await db.orm.public.Job.where({ organizationId })
      .include('applications', (a: any) => a.count())
      .all();
    return JSON.parse(JSON.stringify(jobs));
  } catch (error) {
    console.error('Error fetching org jobs:', error);
    return [];
  }
}

export async function createOrgJob(input: {
  organizationId: string;
  title: string;
  description?: string;
  type?: string;
  pay?: string;
  area?: string;
  category?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const title = (input.title || '').trim();
    if (!title) return { error: 'Job title is required.' };

    const job = await db.orm.public.Job.create({
      organizationId: input.organizationId,
      title,
      description: (input.description || '').trim() || null,
      type: input.type || 'FULL_TIME',
      pay: (input.pay || '').trim() || null,
      area: (input.area || '').trim() || null,
      category: (input.category || '').trim() || 'Operations',
    });

    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/jobs');
      revalidatePath('/business');
    } catch {}

    return { success: true, job: JSON.parse(JSON.stringify(job)) };
  } catch (error: any) {
    console.error('Error creating org job:', error);
    return { error: error?.message || 'Failed to post job.' };
  }
}

export async function deleteOrgJob(input: { organizationId: string; jobId: string }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const existing = await db.orm.public.Job.where({
      id: input.jobId,
      organizationId: input.organizationId,
    }).all().first();
    if (!existing) return { error: 'Job not found.' };
    await db.orm.public.Job.where({ id: input.jobId }).delete();
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting org job:', error);
    return { error: error?.message || 'Failed to delete job.' };
  }
}
