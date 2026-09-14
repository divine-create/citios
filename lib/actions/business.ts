import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/src/prisma/contract";
import { OrgType, OrgRole } from "@/src/prisma/contract";

export async function registerOrganization(data: {
  name: string;
  type: string;
  description?: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.userId) {
    return { error: "You must be logged in to register a business." };
  }

  // Validate OrgType
  const validTypes = Object.values(OrgType);
  if (!validTypes.includes(data.type as OrgType)) {
    return { error: "Invalid organization type." };
  }

  try {
    // Run in a transaction: create org and add current user as OWNER
    const org = await db.orm.public.Organization.create({
      name: data.name,
      type: data.type as OrgType,
      description: data.description || "",
    });

    await db.orm.public.OrganizationMember.create({
      userId: session.user.userId,
      organizationId: org.id,
      role: OrgRole.OWNER,
    });

    return { success: true, organizationId: org.id };
  } catch (err: any) {
    console.error("Error registering organization:", err);
    return { error: err.message || "Failed to register organization." };
  }
}
