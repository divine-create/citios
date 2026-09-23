'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/src/prisma/db";
import { provisionRestaurantOS } from "@/lib/actions/restaurantos";

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
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.personId) {
    return { error: "You must be logged in to register a business." };
  }

  // Validate OrgType
  const validTypes = ['GOVERNMENT', 'SCHOOL', 'HEALTHCARE', 'RETAIL', 'RESTAURANT', 'REAL_ESTATE', 'SERVICES', 'LOGISTICS', 'HOTEL', 'EVENT_ORGANIZER'];
  if (!validTypes.includes(data.type)) {
    return { error: "Invalid organization type." };
  }

  try {
    // Require a legitimate city association: resolve + validate against the
    // canonical City registry. Never persist an unvalidated client value.
    const city = await resolveRegistrationCity(data.citySlug);
    if (!city) {
      return { error: "Unknown city. Organizations must be registered in a supported city." };
    }

    // session.user.personId is a personId in the V1 model
    const org = await db.orm.public.Organization.create({
      name: data.name,
      type: data.type as any,
      description: data.description || "",
      
    });

    const membership = await db.orm.public.Membership.create({
      personId: session.user.personId,
      organizationId: org.id,
    });

    await db.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role: 'OWNER',
    });

    // Restaurants/eateries/fast-food get their own OS provisioned at
    // registration (serviceStyle defaults to HYBRID until onboarding sets it).
    if (data.type === 'RESTAURANT') {
      await provisionRestaurantOS(org.id);
    }

    return { success: true, organizationId: org.id };
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
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.personId) {
    return { error: "You must be logged in to register a school." };
  }

  try {
    // Schools follow the same canonical city relationship (SchoolSettings
    // state/lga remain descriptive fields on the school's own record).
    const city = await resolveRegistrationCity();
    if (!city) {
      return { error: "Unknown city. Schools must be registered in a supported city." };
    }

    const org = await db.orm.public.Organization.create({
      name: data.name,
      type: 'SCHOOL' as any,
      address: `${data.address}, ${data.lga}, ${data.state}`,
      
    });

    const membership = await db.orm.public.Membership.create({
      personId: session.user.personId,
      organizationId: org.id,
    });

    await db.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role: 'OWNER',
    });

    await db.orm.public.SchoolSettings.create({
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

    return { success: true, organizationId: org.id };
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
      return `/workspaces/restaurantos/${orgId}`;
    case 'SERVICES':
      return `/workspaces/serviceos/${orgId}`;
    case 'SCHOOL':
      return `/workspaces/schoolos/${orgId}`;
    case 'HOTEL':
      return `/hotel-os?org=${orgId}`;
    case 'EVENT_ORGANIZER':
      return `/admin/events`;
    case 'HEALTHCARE':
      return `/admin/healthcare`;
    default:
      return `/org/${orgId}`;
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

    const businesses = [];
    for (const m of memberships) {
      const org = await db.orm.public.Organization.where({ id: m.organizationId }).all().first();
      if (!org) continue;

      const roles = await db.orm.public.MembershipRole.where({ membershipId: m.id }).all();
      const city: any = null;

      businesses.push({
        id: org.id,
        name: org.name,
        type: org.type,
        description: org.description,
        address: org.address,
        
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

  const validTypes = ['RETAIL', 'RESTAURANT', 'SERVICES', 'SCHOOL', 'HOTEL', 'EVENT_ORGANIZER', 'HEALTHCARE'];
  if (!validTypes.includes(data.type)) {
    return { error: "Invalid business category." };
  }

  try {
    const city = await resolveRegistrationCity(data.citySlug);
    if (!city) {
      return { error: "Unable to resolve active city. Please ensure at least one city is configured." };
    }

    const org = await db.orm.public.Organization.create({
      name,
      type: data.type as any,
      description: (data.description || '').trim(),
      address: (data.address || '').trim() || city.name,
      
    });

    const membership = await db.orm.public.Membership.create({
      personId: session.user.personId,
      organizationId: org.id,
    });

    await db.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role: 'OWNER',
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



export async function registerHOTEL(data: { name: string; shortName: string; state: string; lga: string; address: string; phone: string; email: string; }) { const session = await getServerSession(authOptions); if (!session?.user?.personId) { return { error: 'You must be logged in to register a hotel.' }; } try { const city = await resolveRegistrationCity(); if (!city) { return { error: 'Unknown city.' }; } const org = await db.orm.public.Organization.create({ name: data.name, type: 'HOTEL' as any, description: data.address, }); const location = await db.orm.public.Location.create({ organizationId: org.id, name: data.shortName || 'Main Campus', address: data.address, cityId: city.id, }); const membership = await db.orm.public.Membership.create({ personId: session.user.personId, organizationId: org.id, }); await db.orm.public.MembershipRole.create({ membershipId: membership.id, role: 'OWNER', }); return { success: true, organizationId: org.id }; } catch (err: any) { return { error: err.message }; } }


