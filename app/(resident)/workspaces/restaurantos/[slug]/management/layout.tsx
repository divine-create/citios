import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { db } from '@/src/prisma/db';
import RestaurantManagementSidebar from '@/components/restaurantos/management/RestaurantManagementSidebar';
import { MobileNavigation } from '@/components/restaurantos/management/MobileNavigation';

export default async function RestaurantManagementLayout({ 
  children,
  params
}: { 
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  // Authenticate and Authorize
  const { membership } = await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN']);

  // Fetch only the settings for capability checks
  const settings = await db.orm.public.RestaurantSettings.where({ organizationId: slug }).all().first();
  const org = await db.orm.public.Organization.where({ id: slug }).all().first();

  const sidebar = <RestaurantManagementSidebar slug={slug} settings={settings} orgName={org?.name || 'Restaurant'} />;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F8FAFC]">
      {/* Mobile Header & Drawer */}
      <MobileNavigation>
        <div className="w-full h-full block">
          {sidebar}
        </div>
      </MobileNavigation>

      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        {sidebar}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
