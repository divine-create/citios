import CityActivity from '@/components/cityos/CityActivity';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ActivityPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
        redirect('/');
    }
    return <CityActivity />;
}