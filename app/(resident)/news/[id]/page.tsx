import { redirect } from 'next/navigation';

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  redirect('/feed');
}
