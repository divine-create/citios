import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import ServiceDashboard from "@/components/service/ServiceDashboard";

export const metadata: Metadata = {
  title: "ServiceOS | CityConnect Service",
  description: "Appointments, jobs, scheduling, and service management.",
};

const SERVICE_ROLES = ["OWNER", "MANAGER", "RECEPTIONIST", "TECHNICIAN"] as const;
type ServiceRole = (typeof SERVICE_ROLES)[number];

export default async function ServiceOSPage({ searchParams }: { searchParams: Promise<{ role?: string; org?: string }> }) {
  const resolvedParams = await searchParams;
  const session = await getServerSession(authOptions);
  
  // Dev override
  const devRole = resolvedParams.role?.toUpperCase();
  const devOrgId = resolvedParams.org;
  
  if (devRole || devOrgId || !session) {
    return (
      <ServiceDashboard
        organizationId={devOrgId || "fcdbdcd4-36f6-42b4-8398-99b21e08ac49"}
        userRole={(devRole as ServiceRole) || "MANAGER"}
        currentUserId={"dev-user-id"}
      />
    );
  }

  const membership = session?.user?.memberships?.find((m) => m.organizationType === "SERVICES");

  const isServiceRole = (role?: string): role is ServiceRole => !!role && (SERVICE_ROLES as readonly string[]).includes(role);

  // If they have a strict membership, use it. Otherwise, default to the test org so we don't lock the user out during local testing.
  if (membership && isServiceRole(membership.role) && session?.user?.userId) {
    return (
      <ServiceDashboard
        organizationId={membership.organizationId}
        userRole={membership.role}
        currentUserId={session.user.userId}
      />
    );
  }

  // Fallback for local testing if they are logged in but don't have a ServiceOS org yet
  return (
    <ServiceDashboard
      organizationId={devOrgId || "fcdbdcd4-36f6-42b4-8398-99b21e08ac49"}
      userRole={(devRole as ServiceRole) || "MANAGER"}
      currentUserId={session?.user?.userId || "dev-user-id"}
    />
  );
}
