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

const isShopRole = (role?: string): role is ShopRole =>
  !!role && (SHOP_ROLES as readonly string[]).includes(role);

export default async function ShopOSPage() {
  const session = await getServerSession(authOptions);

  const membership = session?.user?.memberships?.find(
    (m) => m.organizationType === "RETAIL"
  );

  if (!membership || !isShopRole(membership.role) || !session?.user?.personId) {
    redirect("/");
  }

  return (
    <ShopDashboard
      organizationId={membership.organizationId}
      userRole={membership.role}
      currentUserId={session.user.personId}
    />
  );
}
