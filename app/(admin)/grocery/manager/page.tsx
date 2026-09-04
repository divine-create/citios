import ManagerDashboard from "@/components/grocery/ManagerDashboard";
import { Metadata } from "next";
import { requireOrgAccess } from '@/lib/rbac';

export const metadata: Metadata = {
  title: "Grocery Manager Dashboard | CityConnect",
  description: "Store Manager Portal for CityConnect Grocery vertical.",
};

export default async function GroceryManagerPage() {
  await requireOrgAccess('RETAIL');
  return <ManagerDashboard />;
}
