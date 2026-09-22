import FinanceDashboard from "@/components/school/FinanceDashboard";
import { Metadata } from "next";
import { requireOrgRole, resolveTenantOrg } from '@/lib/rbac';
import { getSchoolAdminData, getFinancePortalData } from '@/lib/actions/school';

export const metadata: Metadata = {
  title: "School Finance & Bursar Portal | CityConnect",
  description: "Manage tuition invoices, fee types, and staff attendance & leave.",
};

export default async function SchoolFinancePage() {
  const orgId = await resolveTenantOrg('SCHOOL');
  if (orgId) await requireOrgRole(orgId, ['FINANCE']);
  const schoolData = await getSchoolAdminData(orgId!);
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

