import { getCanonicalEvent } from '@/app/actions/org';
import Link from 'next/link';
import { parseEventDescription } from '@/lib/event-utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import EventDetailClient from '@/components/cityos/EventDetailClient';

export default async function CityEventDetail({ id }: { id: string }) {
  const [e, session] = await Promise.all([
    getCanonicalEvent(id),
    getServerSession(authOptions).catch(() => null),
  ]);

  if (!e) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <h1 className="text-lg font-black text-ink">Event not found in the city graph.</h1>
        <Link
          href="/events"
          className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900"
        >
          Back to events
        </Link>
      </div>
    );
  }

  const parsed = parseEventDescription(e.description);
  const sessionUser = session?.user
    ? {
        personId: session.user.personId,
        name: session.user.name || undefined,
        email: session.user.email || undefined,
      }
    : null;

  return (
    <EventDetailClient
      event={e}
      parsed={parsed}
      sessionUser={sessionUser}
    />
  );
}
