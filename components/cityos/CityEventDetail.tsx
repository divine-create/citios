import { getCanonicalEvent } from '@/app/actions/org';
import { resolveOrgWhatsAppPhone } from '@/app/actions/checkout';
import Link from 'next/link';
import { ChevronRight, MessageSquare, Users } from 'lucide-react';
import { Pill, LocationRow } from '@/components/cityos/CityUI';

export default async function CityEventDetail({ id }: { id: string }) {
  const e = await getCanonicalEvent(id);

  if (!e) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <h1 className="text-lg font-black text-ink">Event not found in the city graph.</h1>
        <Link href="/events" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">Back to events</Link>
      </div>
    );
  }

  const dateStr = typeof e.date === 'string' ? new Date(e.date).toLocaleDateString() : e.date.toString();
  const cleanPhone = await resolveOrgWhatsAppPhone(e.organizationId);
  const waMessage = [
    `🎟️ *EVENT TICKET / RESERVATION REQUEST*`,
    `--------------------------------`,
    `📅 *Event:* ${e.title}`,
    `🏢 *Organizer:* ${e.organization?.name || 'Event Host'}`,
    `🗓️ *Date:* ${dateStr}`,
    `📍 *Venue:* ${e.location || 'Calabar'}`,
    `💰 *Ticket:* ${e.price > 0 ? `₦${e.price.toLocaleString()}` : 'Free Reservation'}`,
    `--------------------------------`,
    `Hello! I would like to reserve my spot / purchase a ticket for this event via WhatsApp.`,
  ].join('\n');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Link href="/events" className="hover:text-teal-800">Events</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 truncate">{e.title}</span>
      </nav>

      <div className="relative rounded-3xl overflow-hidden bg-slate-100">
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
          <Pill tone="orange">Event</Pill>
          <Pill tone="teal">{dateStr}</Pill>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h1 className="text-xl font-black text-ink">{e.title}</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">{`Hosted by ${e.organization?.name || 'Unknown'}`}</p>
        <LocationRow text={e.location || 'TBA'} className="text-xs mt-2" />
        {e.description && <p className="text-[13px] text-slate-600 leading-relaxed mt-3">{e.description}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your spot</p>
            <p className="text-[15px] font-black text-ink">{e.price > 0 ? `₦${e.price.toLocaleString()} · 1 ticket` : 'Free · reserve 1 spot'}</p>
          </div>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all bg-[#25D366] hover:bg-[#20ba59] text-white shadow-md shadow-emerald-600/20"
          >
            <MessageSquare className="w-4 h-4" />
            {e.price > 0 ? `Book Ticket (₦${e.price.toLocaleString()}) via WhatsApp` : 'Reserve Spot via WhatsApp'}
          </a>
        </div>
        <p className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-3">
          <Users className="w-3 h-3" /> Instant confirmation and ticket details via WhatsApp.
        </p>
      </div>
    </div>
  );
}