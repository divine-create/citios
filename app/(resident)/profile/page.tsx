import ProfileView from '@/components/ProfileView';
import { getProfileAndWallet } from '@/lib/actions/profile';

export default async function ProfilePage() {
    const data = await getProfileAndWallet();
    
    return <ProfileView initialData={data} />;
}
