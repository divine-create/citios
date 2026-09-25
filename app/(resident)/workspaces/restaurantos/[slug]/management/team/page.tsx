import React from 'react';
import { requireMembership, getTeamMembers } from '@/lib/actions/tenant';
import TeamManager from '@/components/restaurantos/management/TeamManager';
import { db } from '@/src/prisma/db';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const locationId = sp.location;

  await requireMembership(slug, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  const team = await getTeamMembers(slug);
  const locations = await db.orm.public.Location.where({ organizationId: slug }).all();

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Team & Roles</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Staff accounts, role-based access control, and permissions.
          </p>
        </div>
      </div>

      <TeamManager 
        slug={slug} 
        members={JSON.parse(JSON.stringify(team))} 
        locations={JSON.parse(JSON.stringify(locations))} 
      />
    </div>
  );
}
