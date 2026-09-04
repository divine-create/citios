import CourierShell from '@/components/CourierShell';
import { requireCourierAccess } from '@/lib/rbac';

export default async function CourierLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireCourierAccess();
    return <CourierShell>{children}</CourierShell>;
}
