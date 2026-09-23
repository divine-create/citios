import sys

with open('app/(resident)/stay/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

good = '''import { db } from '@/src/prisma/db';
import { getHotelRooms } from '@/lib/actions/resident';
import CityStayDetail from '@/components/cityos/CityStayDetail';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StayDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await db.orm.public.Organization.where({ id: slug, type: 'HOTEL' }).all().first();
  if (!org) notFound();
  
  const rooms = await getHotelRooms(org.id);
  return <CityStayDetail org={JSON.parse(JSON.stringify(org))} rooms={rooms} />;
}'''
with open('app/(resident)/stay/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(good)
