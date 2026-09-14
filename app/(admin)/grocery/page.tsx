import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import ShopDashboard from "@/components/retail/ShopDashboard";

export const metadata: Metadata = {
  title: "ShopOS | CityConnect Retail",
  description: "Point of sale, inventory, and store management.",
};

const SHOP_ROLES = ["OWNER", "MANAGER", "CASHIER", "INVENTORY_STAFF"] as const;
type ShopRole = (typeof SHOP_ROLES)[number];

export default async function ShopOSPage({ searchParams }: { searchParams: Promise<{ role?: string; org?: string }> }) {
  const resolvedParams = await searchParams;
  const session = await getServerSession(authOptions);
  
  // Dev override
  const devRole = resolvedParams.role?.toUpperCase();
  const devOrgId = resolvedParams.org;
  
  if (devRole || devOrgId || !session) {
    return (
      <ShopDashboard
        organizationId={devOrgId || "fcdbdcd4-36f6-42b4-8398-99b21e08ac49"}
        userRole={(devRole as ShopRole) || "MANAGER"}
        currentUserId={"dev-user-id"}
      />
    );
  }

  const membership = session?.user?.memberships?.find((m) => m.organizationType === "RETAIL");

  const isShopRole = (role?: string): role is ShopRole => !!role && (SHOP_ROLES as readonly string[]).includes(role);

  if (!membership || !isShopRole(membership.role) || !session?.user?.userId) {
    redirect("/");
  }

  return (
    <ShopDashboard
      organizationId={membership.organizationId}
      userRole={membership.role}
      currentUserId={session.user.userId}
    />
  );
}
