import HotelAdminView from '@/components/HotelAdminView';
import { getHotelAdminData } from '@/lib/actions/hotel';
import { requireOrgAccess } from '@/lib/rbac';

export default async function HotelAdminPage() {
    await requireOrgAccess('HOTEL');
    const data = await getHotelAdminData();
    return <HotelAdminView initialData={data} />;
}
