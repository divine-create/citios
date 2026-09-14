import { notFound } from 'next/navigation';
import { getSchoolProfile } from '@/lib/actions/resident';
import SchoolProfileView from '@/components/SchoolProfileView';

export default async function SchoolProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const profile = await getSchoolProfile(resolvedParams.id);
    if (!profile) notFound();

    return <SchoolProfileView profile={profile} />;
}
