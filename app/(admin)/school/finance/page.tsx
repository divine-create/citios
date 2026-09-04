import FinanceDashboard from "@/components/school/FinanceDashboard";
import { Metadata } from "next";
import { requireOrgAccess } from '@/lib/rbac';

export const metadata: Metadata = {
  title: "School Finance & Bursar Portal | CityConnect",
  description: "Manage tuition, CityWallet balances, and school payroll.",
};

export default async function SchoolFinancePage() {
  await requireOrgAccess('SCHOOL');
  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <FinanceDashboard />
    </div>
  );
}
