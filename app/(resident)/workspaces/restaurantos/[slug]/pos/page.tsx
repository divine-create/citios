import { requireMembership } from '@/lib/actions/tenant';
import { getMenuItems, getTables, getRestaurantOSSettings, getRestaurantShifts } from '@/lib/actions/restaurantos';
import { getCanonicalOrganization } from '@/app/actions/org';
import { getCustomers } from '@/lib/actions/retail';
import POSWorkspace from '@/components/restaurantos/pos/POSWorkspace';
import { redirect } from 'next/navigation';

export default async function POSPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    await requireMembership(slug);
  } catch (err) {
    redirect('/');
  }

  const [menu, tables, settings, shifts, org, customers] = await Promise.all([
    getMenuItems(slug),
    getTables(slug),
    getRestaurantOSSettings(slug),
    getRestaurantShifts(slug),
    getCanonicalOrganization(slug),
    getCustomers(slug),
  ]);

  const activeShift = shifts.find((s: any) => s.status === 'OPEN');

  return (
    <POSWorkspace 
      initialMenu={menu} 
      initialTables={tables} 
      settings={settings} 
      activeShift={activeShift} 
      org={org} 
      customers={customers}
      slug={slug} 
    />
  );
}
