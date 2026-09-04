import SchoolDirectoryView from '@/components/SchoolDirectoryView';
import { getEducationOrgs } from '@/lib/actions/resident';

export default async function EducationPage() {
    const orgs = await getEducationOrgs();
    
    return <SchoolDirectoryView organizations={orgs} />;
}
