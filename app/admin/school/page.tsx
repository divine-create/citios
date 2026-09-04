import SchoolAdminView from '@/components/SchoolAdminView';
import { getSchoolAdminData } from '@/lib/actions/school';
import { requireOrgAccess } from '@/lib/rbac';

export default async function SchoolAdminPage() {
    await requireOrgAccess('SCHOOL');
    const data = await getSchoolAdminData();
    return <SchoolAdminView initialData={data} />;
}
