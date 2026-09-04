import { ManagerDashboard } from "@/components/hotel/ManagerDashboard";
import { Metadata } from "next";
import { requireOrgAccess } from '@/lib/rbac';

export const metadata: Metadata = {
  title: "General Manager Portal - CityConnect",
  description: "Hotel Manager Dashboard for CityConnect.",
};

export default async function ManagerPage() {
  await requireOrgAccess('HOTEL');
  return <ManagerDashboard />;
}
