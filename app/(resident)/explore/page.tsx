import SearchView from '@/components/SearchView';
import { getOrganizations } from '@/lib/actions/explore';

export default async function ExplorePage() {
    const orgs = await getOrganizations();
    
    return <SearchView initialOrgs={orgs} />;
}
