'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Calendar,
  MapPin,
  ExternalLink,
  Plus,
  User,
  CheckCircle2,
  Clock,
  QrCode,
  Download,
  AlertCircle,
  Loader2,
  X,
  Building2,
  Ticket,
  Sparkles,
  Settings,
} from 'lucide-react';
import { Pill, LocationRow, FallbackImg } from '@/components/cityos/CityUI';
import SaveButton from '@/components/cityos/SaveButton';
import {
  ParsedEventDetails,
  DEFAULT_EVENT_PLACEHOLDER_IMAGE,
  generateGoogleCalendarUrl,
  generateICalDataUri,
  generateCheckInCode,
} from '@/lib/event-utils';
import { claimEventRsvp } from '@/lib/actions/events';

interface EventDetailClientProps {
  event: any;
  parsed: ParsedEventDetails;
  sessionUser: {
    personId?: string;
    name?: string;
    email?: string;
  } | null;
}

export default function EventDetailClient({
  event,
  parsed,
  sessionUser,
}: EventDetailClientProps) {
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [guestName, setGuestName] = useState(sessionUser?.name || '');
  const [guestEmail, setGuestEmail] = useState(sessionUser?.email || '');
  const [guestPhone, setGuestPhone] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialStatus =
    event.userRegistration?.status || (event.userTicket ? 'REGISTERED' : null);
  const initialTicketId =
    event.userTicket?.id || event.userRegistration?.id || null;

  const [currentStatus, setCurrentStatus] = useState<string | null>(initialStatus);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(initialTicketId);
  const [confirmationNote, setConfirmationNote] = useState<string | null>(
    parsed.settings.customConfirmationNote || null
  );

  const parsedDate = new Date(
    typeof event.date === 'string' ? event.date : event.date.toString()
  );
  const dateStr = isNaN(parsedDate.getTime())
    ? String(event.date)
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
  const hostDisplayName = parsed.hostName || event.organization?.name || 'Event Host';
  const isHost =
    sessionUser?.personId && parsed.hostPersonId === sessionUser.personId;

  const googleCalUrl = generateGoogleCalendarUrl({
    title: event.title,
    description: parsed.summary,
    location: event.location,
    date: parsedDate,
  });

  const iCalUri = generateICalDataUri({
    id: event.id,
    title: event.title,
    description: parsed.summary,
    location: event.location,
    date: parsedDate,
  });

  const checkInCode = activeTicketId
    ? generateCheckInCode(activeTicketId, currentStatus === 'REGISTERED' ? 'TKT' : 'RSVP')
    : null;

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const res = await claimEventRsvp({
      eventId: event.id,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone.trim(),
      answers,
    });

    setSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    if (res.success) {
      setCurrentStatus(res.status || 'REGISTERED');
      if (res.ticketId || res.registrationId) {
        setActiveTicketId(res.ticketId || res.registrationId);
      }
      if (res.confirmationNote) {
        setConfirmationNote(res.confirmationNote);
      }
      setShowRsvpModal(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-16">
      {/* Top Breadcrumb Nav */}
      <div className="flex items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 min-w-0">
          <Link href="/events" className="hover:text-teal-800 shrink-0">
            Events
          </Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-slate-700 truncate">{event.title}</span>
        </nav>
        <div className="flex items-center gap-2">
          {isHost && (
            <Link
              href={`/events/organizer?event=${event.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-black shadow-xs transition"
            >
              <Settings className="w-3.5 h-3.5" />
              Manage Event Suite →
            </Link>
          )}
          <Link
            href="/events/create"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-black shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Host an Event
          </Link>
        </div>
      </div>

      {/* Hero Cover Card */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-100 h-56 sm:h-72 shadow-sm">
        <FallbackImg
          src={parsed.imageUrl}
          fallbackSrc={DEFAULT_EVENT_PLACEHOLDER_IMAGE}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap items-center">
          <Pill tone="orange">{parsed.category || 'Event'}</Pill>
          <Pill tone="teal">{dateStr}</Pill>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
            {event.title}
          </h1>
          <SaveButton kind="event" entityId={event.id} />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          {isPersonalHost ? (
            <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span>
            Hosted by <strong className="text-slate-800">{hostDisplayName}</strong>
            {isPersonalHost ? ' (Community Resident)' : ''}
          </span>
        </div>

        <LocationRow text={event.location || 'Calabar'} className="text-xs" />

        {parsed.summary && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">
              {parsed.summary}
            </p>
          </div>
        )}

        {/* Ticket Tiers (if configured) */}
        {Array.isArray(event.ticketTiers) && event.ticketTiers.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Available Ticket Tiers
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {event.ticketTiers.map((tier: any) => (
                <div
                  key={tier.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-black text-slate-800">{tier.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {tier.capacity ? `${tier.capacity.toLocaleString()} max capacity` : 'General access'}
                    </p>
                  </div>
                  <span className="text-xs font-black text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200/60">
                    {tier.price === 0 ? 'Free' : `₦${Number(tier.price).toLocaleString()}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Admission, RSVP & Pass Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
        {currentStatus === 'REGISTERED' || currentStatus === 'CHECKED_IN' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-800 bg-emerald-50 border border-emerald-200/80 p-3.5 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-black">
                  {currentStatus === 'CHECKED_IN'
                    ? 'Checked In at Event Door ✓'
                    : 'Your spot is confirmed!'}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Present your check-in code at the entrance.
                </p>
              </div>
            </div>

            {/* Boarding-pass Style Digital Ticket Card */}
            <div className="rounded-2xl border-2 border-dashed border-teal-200 bg-gradient-to-br from-teal-50/70 to-emerald-50/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-teal-800 text-[11px] font-black uppercase tracking-wider">
                  <Ticket className="w-4 h-4" />
                  <span>CityPass Admission</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-black uppercase">
                  {currentStatus === 'CHECKED_IN' ? 'Scanned' : 'Valid Pass'}
                </span>
              </div>

              <div>
                <p className="text-base font-black text-ink">{event.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {dateStr}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {event.location}
                </p>
              </div>

              {checkInCode && (
                <div className="pt-3 border-t border-teal-200/60 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Door Check-in Code
                    </p>
                    <p className="text-xl font-black text-teal-950 tracking-wider">
                      {checkInCode}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-xl border border-teal-200 flex items-center justify-center text-teal-800 shadow-sm shrink-0">
                    <QrCode className="w-7 h-7" />
                  </div>
                </div>
              )}
            </div>

            {/* Gate Instructions / Confirmation Note */}
            {confirmationNote && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 space-y-1">
                <p className="font-bold text-slate-900">📌 Gate Instructions:</p>
                <p className="leading-relaxed">{confirmationNote}</p>
              </div>
            )}

            {/* Calendar Quick Sync Buttons */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                Add to Google Calendar
              </a>
              <a
                href={iCalUri}
                download={`${event.title.replace(/\s+/g, '_')}.ics`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
              >
                <Download className="w-3.5 h-3.5 text-teal-700" />
                Apple Calendar (.ics)
              </a>
            </div>
          </div>
        ) : currentStatus === 'PENDING_APPROVAL' ? (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>RSVP Request in Review</span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              The host requires approval for this event. You will receive an in-app
              notification as soon as your spot is approved.
            </p>
          </div>
        ) : currentStatus === 'WAITLISTED' ? (
          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>You are on the Waitlist</span>
            </div>
            <p className="text-xs text-blue-700 leading-relaxed">
              This event is at full venue capacity. We will notify you in-app if a spot opens up.
            </p>
          </div>
        ) : (
          /* Unregistered Visitor / Resident CTA */
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Admission
                </p>
                <p className="text-lg font-black text-ink">
                  {event.price > 0 ? `From ₦${Number(event.price).toLocaleString()}` : 'Free Entry / Open RSVP'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Venue Capacity: {event.capacity || 200} spots
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRsvpModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {parsed.settings.requireApproval ? 'Request to Join' : 'RSVP for Free'}
                  </span>
                </button>
              </div>
            </div>

            {/* Secondary External Link if event has official website */}
            {parsed.eventUrl && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">External event portal:</span>
                <a
                  href={parsed.eventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-teal-800 hover:underline"
                >
                  <span>{parsed.sourceName}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick RSVP & Dynamic Registration Modal */}
      {showRsvpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowRsvpModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-700">
                {parsed.settings.requireApproval ? 'Request Spot' : 'Instant RSVP'}
              </span>
              <h2 className="text-lg font-black text-ink">{event.title}</h2>
              <p className="text-xs text-slate-400">
                {sessionUser?.personId
                  ? 'Confirm your details below to secure your pass.'
                  : 'Enter your name and email to receive your check-in pass. No password required.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRsvpSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Bassey Duke"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="e.g. bassey@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              {/* Dynamic Creator Questions */}
              {Array.isArray(parsed.settings.questions) &&
                parsed.settings.questions.map((q) => (
                  <div key={q.id}>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {q.label} {q.required && <span className="text-rose-500">*</span>}
                    </label>
                    {q.type === 'select' && q.options && q.options.length > 0 ? (
                      <select
                        required={q.required}
                        value={answers[q.id] || ''}
                        onChange={(e) =>
                          setAnswers({ ...answers, [q.id]: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-700 bg-white"
                      >
                        <option value="">Select an option...</option>
                        {q.options.map((opt, i) => (
                          <option key={i} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : q.type === 'textarea' ? (
                      <textarea
                        required={q.required}
                        rows={2}
                        value={answers[q.id] || ''}
                        onChange={(e) =>
                          setAnswers({ ...answers, [q.id]: e.target.value })
                        }
                        placeholder={q.placeholder || ''}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    ) : q.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 text-xs text-slate-600 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          required={q.required}
                          checked={Boolean(answers[q.id])}
                          onChange={(e) =>
                            setAnswers({ ...answers, [q.id]: e.target.checked })
                          }
                          className="w-4 h-4 text-teal-800 rounded border-slate-300 focus:ring-teal-700"
                        />
                        <span>{q.placeholder || 'Yes, I agree'}</span>
                      </label>
                    ) : (
                      <input
                        type={q.type === 'social_url' ? 'url' : 'text'}
                        required={q.required}
                        value={answers[q.id] || ''}
                        onChange={(e) =>
                          setAnswers({ ...answers, [q.id]: e.target.value })
                        }
                        placeholder={
                          q.placeholder ||
                          (q.type === 'social_url'
                            ? 'https://linkedin.com/in/...'
                            : '')
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    )}
                  </div>
                ))}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <span>
                    {parsed.settings.requireApproval
                      ? 'Submit Request for Approval'
                      : 'Confirm My Spot'}
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
