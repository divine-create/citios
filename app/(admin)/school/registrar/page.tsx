import RegistrarDashboard from "@/components/school/RegistrarDashboard";
import { requireOrgRole, resolveTenantOrg } from '@/lib/rbac';
import { getSchoolAdminData, getRegistrarPortalData } from '@/lib/actions/school';

export default async function RegistrarPortalPage() {
  const orgId = await resolveTenantOrg('SCHOOL');
  const session = orgId ? await requireOrgRole(orgId, ['REGISTRAR']) : null;
  const schoolData = await getSchoolAdminData(orgId!);
  const organizationId = schoolData?.school?.id ?? null;
  const registrarData = organizationId ? await getRegistrarPortalData(organizationId) : null;

  return (
    <RegistrarDashboard
      organizationId={organizationId ?? ""}
      reviewerUserId={session?.user?.personId ?? null}
      enrolmentRequests={registrarData?.enrolmentRequests ?? []}
      documents={registrarData?.documents ?? []}
      studentExits={registrarData?.studentExits ?? []}
      studentTransfersIn={registrarData?.studentTransfersIn ?? []}
      students={registrarData?.students ?? []}
      classes={registrarData?.classes ?? []}
    />
  );
}

