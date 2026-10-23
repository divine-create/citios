import OrganizerDashboard from "@/components/events/OrganizerDashboard";
import { getOrganizerPageData } from '@/lib/actions/events';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function OrganizerPage({
  searchParams,
}: {
  searchParams?: Promise<{ event?: string; org?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/events/organizer');
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const selectedEventId = resolvedParams?.event;
  const requestedOrgId = resolvedParams?.org;

  const data = await getOrganizerPageData({
    eventId: selectedEventId,
    orgId: requestedOrgId,
  });

  const event = data?.event;
  const events = data?.events || [];

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-teal-50 text-teal-800 rounded-3xl flex items-center justify-center mx-auto shadow-xs text-2xl">
          📅
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900">No events found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven&apos;t created or hosted any events yet. Publish your first event to access the EventOS management suite.
          </p>
        </div>
        <Link
          href="/events/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          Create First Event
        </Link>
      </div>
    );
  }

  return (
    <OrganizerDashboard 
      event={event} 
      ticketTiers={event.ticketTiers || []} 
      tickets={event.tickets || []} 
      registrations={event.registrations || []}
      persons={data?.persons || []} 
      events={events}
    />
  );
}
