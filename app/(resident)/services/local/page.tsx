import LocalServicesView from '@/components/LocalServicesView';
import { getLocalServicesOrgs } from '@/lib/actions/local';

export default async function LocalServicesPage() {
    const orgs = await getLocalServicesOrgs();
    
    return <LocalServicesView initialOrgs={orgs} />;
}
