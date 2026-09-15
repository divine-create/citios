'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/src/prisma/db";

export async function registerOrganization(data: {
  name: string;
  type: string;
  description?: string;
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
