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
      cityId: city.id,
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
      cityId: city.id,
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
