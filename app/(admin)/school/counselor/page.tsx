import { CounselorDashboard } from "@/components/school/CounselorDashboard";
import { requireOrgRole } from '@/lib/rbac';
import { getSchoolAdminData, getCounselorPortalData, getMyMembership } from '@/lib/actions/school';

export default async function CounselorPage() {
  const session = await requireOrgRole('SCHOOL', ['COUNSELOR']);
  const schoolData = await getSchoolAdminData();
  const organizationId = schoolData?.school?.id ?? null;
  const counselorData = organizationId ? await getCounselorPortalData(organizationId) : null;

  const userId = session?.user?.personId;
  const membership = userId && organizationId ? await getMyMembership(userId, organizationId) : null;

  return (
    <main className="h-full bg-slate-50">
      <CounselorDashboard
        organizationId={organizationId ?? ""}
        authorUserId={userId ?? null}
        reporterMemberId={membership?.id ?? null}
        studentNotes={counselorData?.studentNotes ?? []}
        behaviourIncidents={counselorData?.behaviourIncidents ?? []}
        suspensions={counselorData?.suspensions ?? []}
        truancyAlerts={counselorData?.truancyAlerts ?? []}
        students={counselorData?.students ?? []}
      />
    </main>
  );
}
