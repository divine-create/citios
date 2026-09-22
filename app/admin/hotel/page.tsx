import HotelAdminView from '@/components/HotelAdminView';
import { getHotelAdminData } from '@/lib/actions/hotel';
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';

export default async function HotelAdminPage() {
    const resolvedOrgId = await resolveTenantOrg('HOTEL');
  await requireOrgAccess(resolvedOrgId);
    const data = await getHotelAdminData(resolvedOrgId);
    return <HotelAdminView initialData={data} />;
}
