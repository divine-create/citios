import FinanceDashboard from "@/components/school/FinanceDashboard";
import { Metadata } from "next";
import { requireOrgRole } from '@/lib/rbac';
import { getSchoolAdminData, getFinancePortalData } from '@/lib/actions/school';

export const metadata: Metadata = {
  title: "School Finance & Bursar Portal | CityConnect",
  description: "Manage tuition invoices, fee types, and staff attendance & leave.",
};

export default async function SchoolFinancePage() {
  await requireOrgRole('SCHOOL', ['FINANCE']);
  const schoolData = await getSchoolAdminData();
  const organizationId = schoolData?.school?.id ?? null;
  const financeData = organizationId ? await getFinancePortalData(organizationId) : null;

  return (
    <div className="min-h-screen bg-gray-50/50 py-4 md:py-8">
      <FinanceDashboard
        organizationId={organizationId ?? ""}
        feeTypes={financeData?.feeTypes ?? []}
        feeInvoices={financeData?.feeInvoices ?? []}
        feeInvoiceItems={financeData?.feeInvoiceItems ?? []}
        students={financeData?.students ?? []}
        staffAttendance={financeData?.staffAttendance ?? []}
        leaveRequests={financeData?.leaveRequests ?? []}
        staff={financeData?.staff ?? []}
      />
    </div>
  );
}
