import TeacherDashboard from '@/components/school/TeacherDashboard';
import { requireOrgRole, resolveTenantOrg } from '@/lib/rbac';
import { getMyMembership, getSchoolAdminData, getTeacherPortalData } from '@/lib/actions/school';

export default async function TeacherPortalPage() {
  const orgId = await resolveTenantOrg('SCHOOL');
  const session = orgId ? await requireOrgRole(orgId, ['TEACHER']) : null;
  const schoolData = await getSchoolAdminData(orgId!);
  const organizationId = schoolData?.school?.id ?? null;

  const userId = session?.user?.personId;
  const membership = userId && organizationId ? await getMyMembership(userId, organizationId) : null;
  const teacherData = membership
    ? await getTeacherPortalData(membership.role === 'TEACHER' ? membership.id : undefined, organizationId ?? undefined)
    : null;

  return (
    <TeacherDashboard
      organizationId={organizationId}
      organizationMemberId={membership?.id ?? null}
      initialCourses={teacherData?.courses ?? []}
      initialEnrollments={teacherData?.enrollments ?? []}
      initialStudents={teacherData?.students ?? []}
      initialAssignments={teacherData?.assignments ?? []}
      initialGrades={teacherData?.grades ?? []}
      initialTodayAttendance={teacherData?.todayAttendance ?? []}
      initialSchedule={teacherData?.mySchedule ?? []}
      initialEvents={teacherData?.events ?? []}
      initialFormSections={teacherData?.formSections ?? []}
    />
  );
}

