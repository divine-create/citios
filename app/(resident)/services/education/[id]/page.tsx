import SchoolProfilePageClient from './SchoolProfilePageClient';

export default async function SchoolProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return <SchoolProfilePageClient id={resolvedParams.id} />;
}
