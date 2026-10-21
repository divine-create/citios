export const DEFAULT_EVENT_PLACEHOLDER_IMAGE = '/images/event-placeholder.svg';

export const EVENT_CATEGORIES = [
  'Festival & Carnival',
  'Music & Nightlife',
  'Food & Drink',
  'Tech & Business',
  'Community & Culture',
  'Sports & Wellness',
  'Religious & Faith',
  'Workshop & Class',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type CustomFieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'social_url';

export interface EventCustomQuestion {
  id: string;
  label: string;
  type: CustomFieldType;
  placeholder?: string;
  options?: string[];
  required: boolean;
}

export interface EventSettings {
  allowGuestRsvps: boolean;
  requireApproval: boolean;
  maxTicketsPerPerson: number;
  enableWaitlist: boolean;
  questions: EventCustomQuestion[];
  customConfirmationNote?: string;
}

export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  allowGuestRsvps: true,
  requireApproval: false,
  maxTicketsPerPerson: 2,
  enableWaitlist: true,
  questions: [],
};

export interface ParsedEventDetails {
  summary: string;
  eventUrl: string | null;
  imageUrl: string;
  hasCustomImage: boolean;
  sourceName: string;
  category: EventCategory;
  hostPersonId: string | null;
  hostName: string | null;
  settings: EventSettings;
}

/**
 * Extracts clean summary, external event/registration URL, event-specific image URL,
 * category, individual host metadata, and Luma-style creator settings from an Event's description.
 */
export function normalizeCategory(raw?: string | null): EventCategory {
  if (!raw) return 'Community & Culture';
  const val = raw.trim().toLowerCase();
  if (val.includes('tech') || val.includes('business') || val.includes('startup') || val.includes('developer')) {
    return 'Tech & Business';
  }
  if (val.includes('music') || val.includes('concert') || val.includes('band') || val.includes('live')) {
    return 'Live Music & Concerts';
  }
  if (val.includes('nightlife') || val.includes('party') || val.includes('parties') || val.includes('club') || val.includes('dj')) {
    return 'Nightlife & Parties';
  }
  if (val.includes('food') || val.includes('dining') || val.includes('culinary') || val.includes('bistro') || val.includes('grill')) {
    return 'Food & Dining';
  }
  if (val.includes('sport') || val.includes('fitness') || val.includes('marathon') || val.includes('run')) {
    return 'Sports & Fitness';
  }
  if (val.includes('workshop') || val.includes('learning') || val.includes('class') || val.includes('masterclass') || val.includes('bootcamp')) {
    return 'Workshops & Learning';
  }
  return 'Community & Culture';
}

export function parseEventDescription(
  rawDescription?: string | null
): ParsedEventDetails {
  let text = (rawDescription || '').trim();
  let eventUrl: string | null = null;
  let imageUrl: string | null = null;
  let category: EventCategory = 'Community & Culture';
  let hostPersonId: string | null = null;
  let hostName: string | null = null;
  let settings: EventSettings = { ...DEFAULT_EVENT_SETTINGS };

  // 1. Extract EVENT_SETTINGS: {...}
  const settingsMatch = text.match(/^EVENT_SETTINGS:\s*(\{.*\})$/im);
  if (settingsMatch) {
    try {
      const parsed = JSON.parse(settingsMatch[1]);
      settings = {
        ...DEFAULT_EVENT_SETTINGS,
        ...parsed,
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      };
    } catch {}
    text = text.replace(settingsMatch[0], '').trim();
  }

  // 2. Extract EVENT_CATEGORY: ...
  const catMatch = text.match(/^EVENT_CATEGORY:\s*(.+)$/im);
  if (catMatch) {
    category = normalizeCategory(catMatch[1]);
    text = text.replace(catMatch[0], '').trim();
  }

  // 3. Extract HOST_PERSON_ID: ... and HOST_NAME: ...
  const hostIdMatch = text.match(/^HOST_PERSON_ID:\s*(\S+)$/im);
  if (hostIdMatch) {
    hostPersonId = hostIdMatch[1].trim();
    text = text.replace(hostIdMatch[0], '').trim();
  }

  const hostNameMatch = text.match(/^HOST_NAME:\s*(.+)$/im);
  if (hostNameMatch) {
    hostName = hostNameMatch[1].trim();
    text = text.replace(hostNameMatch[0], '').trim();
  }

  // 4. Extract IMAGE_URL: https://... or /uploads/... or data:image/...
  const imgMatch = text.match(/IMAGE_URL:\s*(\S+)/i);
  if (imgMatch) {
    imageUrl = imgMatch[1].trim();
    text = text.replace(imgMatch[0], '').trim();
  }

  // 5. Extract EVENT_URL / Registration Portal / Tickets & Reservations / Event Link
  const labeledUrlMatch = text.match(
    /(?:EVENT_URL|Event Link|Registration Portal|Tickets & Reservations|Ticket Link|Register Here):\s*(https?:\/\/\S+)/i
  );
  if (labeledUrlMatch) {
    eventUrl = labeledUrlMatch[1].trim();
    text = text.replace(labeledUrlMatch[0], '').trim();
  } else {
    const anyUrlMatch = text.match(/https?:\/\/[^\s)]+/i);
    if (anyUrlMatch) {
      eventUrl = anyUrlMatch[0].trim();
    }
  }

  let sourceName = 'Official Event Page';
  if (eventUrl) {
    if (eventUrl.includes('hitfmcalabar.com')) sourceName = 'Hit FM CECF Portal';
    else if (eventUrl.includes('eventbrite.com')) sourceName = 'Eventbrite';
    else if (eventUrl.includes('tix.africa')) sourceName = 'Tix.africa';
    else if (eventUrl.includes('allevents.in')) sourceName = 'AllEvents';
    else if (eventUrl.includes('carnivalcalabar')) sourceName = 'Carnival Calabar Portal';
    else if (eventUrl.includes('crossriverstate.gov.ng')) sourceName = 'Cross River State Portal';
    else if (eventUrl.includes('instagram.com')) sourceName = 'Instagram';
    else if (eventUrl.includes('facebook.com')) sourceName = 'Facebook Events';
  }

  return {
    summary: text.trim() || 'No description provided.',
    eventUrl,
    imageUrl: imageUrl || DEFAULT_EVENT_PLACEHOLDER_IMAGE,
    hasCustomImage: Boolean(imageUrl),
    sourceName,
    category,
    hostPersonId,
    hostName,
    settings,
  };
}

/**
 * Serializes summary and metadata tags back into an Event's description string.
 */
export function serializeEventDescription(input: {
  summary: string;
  category?: string;
  hostPersonId?: string | null;
  hostName?: string | null;
  imageUrl?: string | null;
  eventUrl?: string | null;
  settings?: Partial<EventSettings> | null;
}): string {
  const parts: string[] = [input.summary.trim()];
  if (input.category?.trim()) {
    parts.push(`EVENT_CATEGORY: ${input.category.trim()}`);
  }
  if (input.hostPersonId && input.hostName) {
    parts.push(`HOST_PERSON_ID: ${input.hostPersonId}`);
    parts.push(`HOST_NAME: ${input.hostName.trim()}`);
  }
  if (input.imageUrl?.trim()) {
    parts.push(`IMAGE_URL: ${input.imageUrl.trim()}`);
  }
  if (input.eventUrl?.trim()) {
    parts.push(`EVENT_URL: ${input.eventUrl.trim()}`);
  }
  if (input.settings) {
    parts.push(`EVENT_SETTINGS: ${JSON.stringify(input.settings)}`);
  }
  return parts.filter(Boolean).join('\n');
}

/**
 * Generates an instant Google Calendar URL for an event.
 */
export function generateGoogleCalendarUrl(event: {
  title: string;
  description?: string;
  location?: string;
  date: Date | string;
  durationMinutes?: number;
}): string {
  const start = new Date(event.date);
  const duration = event.durationMinutes || 120; // default 2 hours
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const formatUtc = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const datesParam = `${formatUtc(start)}/${formatUtc(end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: datesParam,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates a data URI containing an iCalendar (.ics) file content for Apple Calendar / Outlook.
 */
export function generateICalDataUri(event: {
  id: string;
  title: string;
  description?: string;
  location?: string;
  date: Date | string;
  durationMinutes?: number;
}): string {
  const start = new Date(event.date);
  const duration = event.durationMinutes || 120;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const formatUtc = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const clean = (str?: string) => (str || '').replace(/\n/g, '\\n').replace(/,/g, '\\,');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CityOS//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@cityos.live`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${clean(event.title)}`,
    `DESCRIPTION:${clean(event.description)}`,
    `LOCATION:${clean(event.location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`;
}

/**
 * Generates a scannable check-in code from a ticket or registration ID.
 */
export function generateCheckInCode(id: string, prefix = 'TKT'): string {
  const cleanId = id.replace(/-/g, '').toUpperCase();
  return `${prefix}-${cleanId.slice(0, 8)}`;
}
