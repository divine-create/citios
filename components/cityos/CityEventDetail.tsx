import { getCanonicalEvent } from '@/app/actions/org';
import Link from 'next/link';
import { ChevronRight, ExternalLink, Calendar, Globe, Plus, User } from 'lucide-react';
import { Pill, LocationRow, FallbackImg } from '@/components/cityos/CityUI';
import { parseEventDescription, DEFAULT_EVENT_PLACEHOLDER_IMAGE } from '@/lib/event-utils';

export default async function CityEventDetail({ id }: { id: string }) {
  const e = await getCanonicalEvent(id);

  if (!e) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <h1 className="text-lg font-black text-ink">Event not found in the city graph.</h1>
        <Link href="/events" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">
          Back to events
        </Link>
      </div>
    );
  }

  const parsed = parseEventDescription(e.description);
  const parsedDate = new Date(typeof e.date === 'string' ? e.date : e.date.toString());
  const dateStr = isNaN(parsedDate.getTime())
    ? String(e.date)
    : parsedDate.toLocaleDateString('en-NG', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Africa/Lagos',
      });

  const isPersonalHost = Boolean(parsed.hostName);
  const hostDisplayName = parsed.hostName || e.organization?.name || 'Event Host';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 min-w-0">
          <Link href="/events" className="hover:text-teal-800 shrink-0">Events</Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-slate-700 truncate">{e.title}</span>
        </nav>
        <Link
          href="/events/create"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-black shrink-0 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Host an Event
        </Link>
      </div>

      <div className="relative rounded-3xl overflow-hidden bg-slate-100 h-56 sm:h-72">
        <FallbackImg
          src={parsed.imageUrl}
          fallbackSrc={DEFAULT_EVENT_PLACEHOLDER_IMAGE}
          alt={e.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
          <Pill tone="orange">{parsed.category || 'Event'}</Pill>
          <Pill tone="teal">{dateStr}</Pill>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h1 className="text-xl font-black text-ink">{e.title}</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          {`Hosted by ${hostDisplayName}`}
          {isPersonalHost ? ' (Community Resident)' : ''}
        </p>
        <LocationRow text={e.location || 'Calabar'} className="text-xs mt-2" />
        {parsed.summary && (
          <p className="text-[13px] text-slate-600 leading-relaxed mt-3 whitespace-pre-line">
            {parsed.summary}
          </p>
        )}

        {Array.isArray(e.ticketTiers) && e.ticketTiers.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ticket Tiers</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {e.ticketTiers.map((tier: any) => (
                <div key={tier.id} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{tier.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{`${tier.capacity.toLocaleString()} capacity`}</p>
                  </div>
                  <span className="text-xs font-black text-teal-800">
                    {tier.price === 0 ? 'Free' : `₦${Number(tier.price).toLocaleString()}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admission & Registration</p>
            <p className="text-[15px] font-black text-ink">
              {e.price > 0 ? `From ₦${Number(e.price).toLocaleString()}` : 'Free Entry / Open Event'}
            </p>
          </div>
          {parsed.eventUrl ? (
            <a
              href={parsed.eventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all bg-teal-800 hover:bg-teal-900 text-white shadow-sm"
            >
              <span>{`Go to Event (${parsed.sourceName})`}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : isPersonalHost && parsed.hostPersonId ? (
            <Link
              href={`/profile/${parsed.hostPersonId}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all bg-teal-800 hover:bg-teal-900 text-white shadow-sm"
            >
              <User className="w-4 h-4" />
              <span>View Host Profile</span>
            </Link>
          ) : e.organizationId ? (
            <Link
              href={`/org/${e.organizationId}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all bg-teal-800 hover:bg-teal-900 text-white shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              <span>View Organizer Profile</span>
            </Link>
          ) : null}
        </div>
        {parsed.eventUrl && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-teal-800 break-all">
            <Globe className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <a
              href={parsed.eventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-teal-950"
            >
              {parsed.eventUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}