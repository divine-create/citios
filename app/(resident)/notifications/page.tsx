import ResidentNotifications from '@/components/cityos/ResidentNotifications';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
        redirect('/');
    }
    return <ResidentNotifications />;
}
