import RegistrarDashboard from "@/components/school/RegistrarDashboard";
import { requireOrgRole } from '@/lib/rbac';
import { getSchoolAdminData, getRegistrarPortalData } from '@/lib/actions/school';

export default async function RegistrarPortalPage() {
  const session = await requireOrgRole('SCHOOL', ['REGISTRAR']);
  const schoolData = await getSchoolAdminData();
  const organizationId = schoolData?.school?.id ?? null;
  const registrarData = organizationId ? await getRegistrarPortalData(organizationId) : null;

  return (
    <RegistrarDashboard
      organizationId={organizationId ?? ""}
      reviewerUserId={session?.user?.userId ?? null}
      enrolmentRequests={registrarData?.enrolmentRequests ?? []}
      documents={registrarData?.documents ?? []}
      studentExits={registrarData?.studentExits ?? []}
      studentTransfersIn={registrarData?.studentTransfersIn ?? []}
      students={registrarData?.students ?? []}
      classes={registrarData?.classes ?? []}
    />
  );
}
