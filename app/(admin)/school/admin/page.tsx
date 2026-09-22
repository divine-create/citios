import AdminDashboard from '@/components/school/AdminDashboard';
import { Metadata } from 'next';
import { requireOrgRole, resolveTenantOrg } from '@/lib/rbac';
import { getSchoolAdminData, getSchoolGrades, getClassSections, getSubjects, getTerms, getRooms } from '@/lib/actions/school';
import { getInquiries } from '@/lib/actions/microsite';

export const metadata: Metadata = {
  title: 'Super Admin Portal | CityConnect School Management',
  description: 'Global Command Center for School Administration',
};

export default async function SuperAdminPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const resolvedParams = await searchParams;
  let orgId = resolvedParams.org || null;
  let session = null;

  if (!orgId) {
    orgId = await resolveTenantOrg('SCHOOL');
  }
  
  if (orgId) {
    session = await requireOrgRole(orgId, ['ADMIN']);
  }

  const data = await getSchoolAdminData(orgId!);
  if (!orgId) orgId = data?.school?.id ?? null;
  const [grades, classSections, subjects, terms, rooms, inquiries] = orgId
    ? await Promise.all([getSchoolGrades(orgId), getClassSections(orgId), getSubjects(orgId), getTerms(orgId), getRooms(orgId), getInquiries(orgId)])
    : [[], [], [], [], [], []];

  return (
    <AdminDashboard
      organizationId={orgId}
      currentUserId={session?.user?.personId ?? null}
      initialSettings={data?.settings ?? null}
      initialSchool={data?.school ?? null}
      initialInquiries={inquiries}
      initialAcademicYears={data?.academicYears ?? []}
      initialStudents={data?.students ?? []}
      initialCourses={data?.courses ?? []}
      initialCourseEnrollments={data?.courseEnrollments ?? []}
      initialStaff={data?.staff ?? []}
      initialParents={data?.parents ?? []}
      initialGrades={grades}
      initialClassSections={classSections}
      initialSubjects={subjects}
      initialTerms={terms}
      initialRooms={rooms}
      initialEvents={data?.events ?? []}
      initialAttendanceRecords={data?.attendanceRecords ?? []}
      initialBehaviorLogs={data?.behaviorLogs ?? []}
      initialFeeInvoices={data?.feeInvoices ?? []}
      initialFeeTypes={data?.feeTypes ?? []}
    />
  );
}

